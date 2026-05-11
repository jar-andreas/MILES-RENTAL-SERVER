import User from "../models/user.model.js";
import Otp from "../models/otp.js";
import { Request, Response, NextFunction } from "express";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import { sendOtpEmail, sendWelcomeEmail } from "../lib/email.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { env } from "../config/keys.js";

//generate a cryptographically random 6 digit OTP
const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

//hash OTP before saving to database-same approach as passwords
const hashOtp = async (otp: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

export const registerUser = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, phone, password } = req.body;
    const [emailExists, phoneExists] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ phone }),
    ]);
    if (emailExists) {
      return sendTsRestError(res, 400, "Email already exists");
    }
    if (phoneExists) {
      return sendTsRestError(res, 400, "Phone Number already exists");
    }
    ///bcrypt password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashPassword,
    });
    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);

    // Save the OTP to your database
    await Otp.create({
      email,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10-minute expiry
    });

    // Dynamic verification link for your teammate's local environment
    const frontendUrl = env.FRONTEND_URL || "http://localhost:4500";
    const verificationLink = `${frontendUrl}/auth/verify-Account?email=${encodeURIComponent(email)}`;

    // Send the email
    const emailSent = await sendWelcomeEmail(
      email,
      `${firstName} ${lastName}`,
      otp,
      verificationLink,
    );

    if (!emailSent) {
      // Logic choice: You could delete the user here if email fails,
      // but usually it's better to let them try "Resend OTP" later.
      return sendTsRestError(
        res,
        500,
        "User created but failed to send verification email.",
      );
    }
    //save session of user
    req.session.userId = newUser._id.toString();
    req.session.role = "client";
    return sendTsRestSuccess(res, 201, {
      message:
        "User registered successfully. Please check your email for a verification code.",
      data: {
        _id: newUser._id,
        email: newUser.email,
      },
    });
  },
);

export const verifyAccount = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.query;
    const { otp } = req.body;

    if (!email) {
      return sendTsRestError(res, 400, "Email parameter is missing.");
    }

    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return sendTsRestError(res, 400, "Code not found or expired.");
    }

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid) {
      return sendTsRestError(res, 400, "Invalid verification code.");
    }

    // Update the user to verified
    await User.findOneAndUpdate({ email }, { emailVerified: true });
    await Otp.deleteMany({ email });

    return sendTsRestSuccess(res, 200, {
      message: "Account verified successfully!",
    });
  },
);

export const resendVerifyAccountOtp = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    // 1. Verify the user exists
    const user = await User.findOne({ email }).lean();
    if (!user) {
      // Return success to prevent email enumeration, same as forgotPassword
      return sendTsRestSuccess(res, 200, {
        message:
          "If an account with that email exists, a new OTP has been sent",
      });
    }
    // Construct the verification link
    // encodeURIComponent ensures special characters in the email don't break the URL
    const frontendUrl = env.FRONTEND_URL || "http://localhost:4500";
    const verificationLink = `${frontendUrl}/auth/verify-Account?email=${encodeURIComponent(email)}`;

    // 2. Rate Limiting Check
    // Check if an OTP was sent very recently
    const existingOtp = await Otp.findOne({ email });
    if (existingOtp && Date.now() - existingOtp.createdAt.getTime() < 60000) {
      return sendTsRestError(
        res,
        429,
        "Please wait 60 seconds before requesting a new OTP",
      );
    }

    // 3. Delete any existing OTP for this email
    await Otp.deleteMany({ email });

    // 4. Generate + Hash new OTP
    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);

    // 5. Store new hashed OTP
    await Otp.create({
      email,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0, // Reset attempts for the new code
    });

    const emailSent = await sendWelcomeEmail(
      email,
      `${user.firstName} ${user.lastName}`,
      otp,
      verificationLink,
    );

    if (!emailSent) {
      return sendTsRestError(res, 500, "Failed to send OTP. Please try again");
    }

    return sendTsRestSuccess(res, 200, {
      message: "A new OTP has been sent to your email",
    });
  },
);

export const loginUser = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return sendTsRestError(res, 400, "Account not found");
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return sendTsRestError(res, 400, "Incorrect Credentials");
    }
    const userResponse = user.toObject();
    delete userResponse.password;
    //save session of user
    req.session.userId = user._id.toString();
    req.session.role = user.role || "client";
    return sendTsRestSuccess(res, 200, {
      message: "User logged in successfully",
      data: userResponse,
    });
  },
);

//LogOut
export const logoutUser = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    req.session.destroy((err) => {
      if (err) {
        return sendTsRestError(res, 500, "could not log out. Please try again");
      }
      res.clearCookie("sessionId"); //matches the cookie name in session.ts
      return sendTsRestSuccess(res, 200, {
        message: "User logged out successfully",
      });
    });
  },
);

//get me
export const getMe = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session.userId;

    const user = await User.findById(userId).lean();
    if (!user) {
      return sendTsRestError(res, 404, "User not found");
    }
    return sendTsRestSuccess(res, 200, {
      message: "User retrieved successfully",
      data: user,
    });
  },
);

//Forgot Password
export const forgotPassword = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const user = await User.findOne({ email }).lean();

    // Construct the verification link
    // encodeURIComponent ensures special characters in the email don't break the URL
    const frontendUrl = env.FRONTEND_URL || "http://localhost:4500";
    const verificationLink = `${frontendUrl}/auth/verify-otp?email=${encodeURIComponent(email)}`;

    //always return success even if user doesnt exist to prevent email enumeration attacks
    if (!user) {
      return sendTsRestSuccess(res, 200, {
        message: "If an account with that email exists, an Otp has been sent",
      });
    }
    //delete any existing OTP for this email
    await Otp.deleteMany({ email });

    //generate+hash OTP
    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);

    //store hashed OTP - expires in 10 minutes
    await Otp.create({
      email,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    //send OTP via email
    const emailSent = await sendOtpEmail(
      email,
      `${user.firstName} ${user.lastName}`,
      otp,
      verificationLink,
    );
    if (!emailSent) {
      return sendTsRestError(
        res,
        500,
        "failed to send OTP email. Please try again",
      );
    }
    return sendTsRestSuccess(res, 200, {
      message: "If an account with that email exists , an OTP has been sent",
    });
  },
);

export const resendOtp = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    // 1. Verify the user exists
    const user = await User.findOne({ email }).lean();
    if (!user) {
      // Return success to prevent email enumeration, same as forgotPassword
      return sendTsRestSuccess(res, 200, {
        message:
          "If an account with that email exists, a new OTP has been sent",
      });
    }
    // Construct the verification link
    // encodeURIComponent ensures special characters in the email don't break the URL
    const frontendUrl = env.FRONTEND_URL || "http://localhost:4500";
    const verificationLink = `${frontendUrl}/auth/verify-otp?email=${encodeURIComponent(email)}`;

    // 2. Rate Limiting Check
    // Check if an OTP was sent very recently
    const existingOtp = await Otp.findOne({ email });
    if (existingOtp && Date.now() - existingOtp.createdAt.getTime() < 60000) {
      return sendTsRestError(
        res,
        429,
        "Please wait 60 seconds before requesting a new OTP",
      );
    }

    // 3. Delete any existing OTP for this email
    await Otp.deleteMany({ email });

    // 4. Generate + Hash new OTP
    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);

    // 5. Store new hashed OTP
    await Otp.create({
      email,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0, // Reset attempts for the new code
    });

    const emailSent = await sendOtpEmail(
      email,
      `${user.firstName} ${user.lastName}`,
      otp,
      verificationLink,
    );

    if (!emailSent) {
      return sendTsRestError(res, 500, "Failed to send OTP. Please try again");
    }

    return sendTsRestSuccess(res, 200, {
      message: "A new OTP has been sent to your email",
    });
  },
);

export const verifyForgotPasswordOtp = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.query;
    const { otp } = req.body;

    // Safety check for the URL parameter
    if (!email) {
      return sendTsRestError(
        res,
        400,
        "Email parameter is missing from the URL.",
      );
    }

    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return sendTsRestError(res, 400, "OTP not found or has expired");
    }
    //check expiry explicity as a safety net
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return sendTsRestError(
        res,
        400,
        "OTP has expired.Please request a new one",
      );
    }
    //max 5 attempts before invalidating
    if (otpRecord.attempts >= 5) {
      await Otp.deleteMany({ email });
      return sendTsRestError(
        res,
        400,
        "Too many incorrect attempts .Please request a new OTP",
      );
    }
    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid) {
      //increment attempts
      await Otp.updateOne({ email }, { $inc: { attempts: 1 } });
      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      return sendTsRestError(
        res,
        400,
        `Invalid OTP. You have ${remainingAttempts} attempts left.`,
      );
    }
    //OTP is valid-store verified email in session for the reset step
    req.session.resetEmail = email as string;

    //clean up OTP
    await Otp.deleteMany({ email });
    return sendTsRestSuccess(res, 200, {
      message: "Otp verified successfully.You may now reset your password",
    });
  },
);

//Reset Password
export const resetPassword = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.query;
    const { newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return sendTsRestError(res, 400, "Passwords do not match");
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return sendTsRestError(res, 404, "User not found");
    }
    //prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return sendTsRestError(
        res,
        400,
        "New password must be different from the old password",
      );
    }
    //hash new password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashPassword;
    await user.save();

    return sendTsRestSuccess(res, 200, {
      message: "Password reset successfully. You can now log in",
    });
  },
);

export const deleteAccount = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Identify the user from the session
    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) {
      return sendTsRestError(res, 404, "User not found or already deleted");
    }

    // 2. Clean up associated data
    // Delete any pending OTPs for this user's email
    await Otp.deleteMany({ email: user.email });

    // 3. Delete the User from the database
    await User.findByIdAndDelete(userId);

    // 4. Destroy the session and clear the cookie
    req.session.destroy((err) => {
      if (err) {
        return sendTsRestError(
          res,
          500,
          "Account deleted, but failed to clear session.",
        );
      }

      res.clearCookie("sessionId"); // Ensure this matches your session config name

      return sendTsRestSuccess(res, 200, {
        message:
          "Account and all associated data have been deleted successfully.",
      });
    });
  },
);
