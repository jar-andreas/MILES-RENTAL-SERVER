import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  resendOtp,
  verifyAccount,
  deleteAccount,
  resendVerifyAccountOtp,
} from "src/controllers/user.controller.js";
import { customRateLimiter } from "src/middleware/rateLimit.middelware.js";
import { isAuthenticated } from "src/middleware/auth.middleware.js";
import {
  validateLoginUser,
  validateSignUpSchema,
  validateForgotPasswordSchema,
  validateResetPasswordSchema,
} from "src/lib/schemaValidation.js";
import { validateFormData } from "src/middleware/formValidate.js";

const router = Router();
router.post(
  "/register",
  customRateLimiter(10, 3),
  validateFormData(validateSignUpSchema),
  registerUser,
);
router.post(
  "/verify-account",
  customRateLimiter(10, 5),
  verifyAccount,
);
router.post(
  "/login",
  customRateLimiter(10, 3),
  validateFormData(validateLoginUser),
  loginUser,
);
router.post(
  "/forgot-password",
  customRateLimiter(5, 10), //5 requests per 10 min
  validateFormData(validateForgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/verify-otp",
  customRateLimiter(10, 5),
  verifyForgotPasswordOtp,
);
router.post(
  "/resend-otp",
  customRateLimiter(5, 10),
  resendOtp,
);
router.post(
  "/resend-verifyaccount-otp",
  customRateLimiter(5, 10),
  resendVerifyAccountOtp,
);
router.post(
  "/reset-password",
  customRateLimiter(5, 10),
  validateFormData(validateResetPasswordSchema),
  resetPassword,
);
//Protected Routes
router.get("/me", isAuthenticated, getMe);
router.post("/logout", isAuthenticated, logoutUser);
router.delete("/delete-account/:id", deleteAccount);
export default router;

