import User from "src/models/user.js";
import Otp from "src/models/otp.js";
import { Request, Response, NextFunction } from "express";
import tryCatchWrapper from "src/lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "src/lib/responseHandler.js";
import { sendOtpEmail } from "src/lib/email.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
    //save session of user
    req.session.userId = newUser._id.toString();
    req.session.role = "client";
    return sendTsRestSuccess(res, 201, {
      message: "User registered successfully",
      data: {
        _id: newUser._id,
      },
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
    req.session.role = "client";
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
      `${user.firstName} $ {user.lastName}`,
      otp,
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
//verify OTP
export const verifyOtp = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp } = req.body;
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
    req.session.resetEmail = email;

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
    const { newPassword, confirmPassword } = req.body;
    //ensure OTP was verified in this session
    const resetEmail = req.session.resetEmail;
    if (!resetEmail) {
      return sendTsRestError(
        res,
        403,
        "Session expired or OTP not verified.Please restart the process again",
      );
    }
    if (newPassword !== confirmPassword) {
      return sendTsRestError(res, 400, "Passwords do not match");
    }
    const user = await User.findOne({ email: resetEmail }).select("+password");
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

    //clear resetEmail from session
    delete req.session.resetEmail;
    return sendTsRestSuccess(res, 200, {
      message: "Password reset successfully. You can now log in",
    });
  },
);
