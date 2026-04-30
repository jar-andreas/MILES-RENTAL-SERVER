import { Router } from "express";
import { registerUser, loginUser, logoutUser,getMe,forgotPassword,verifyOtp,resetPassword } from "src/controllers/user.controller.js";
import { customRateLimiter } from "src/middleware/rateLimit.middelware.js";
import {isAuthenticated} from "src/middleware/auth.middleware.js"
import {
  validateLoginUser,
  validateSignUpSchema,
  validateForgotPasswordSchema,
  validateVerifyOtpSchema,
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
  "/login",
  customRateLimiter(10, 3),
  validateFormData(validateLoginUser),
  loginUser,
);
router.post("/forgot-password",
  customRateLimiter(5, 10),//5 requests per 10 min
  validateFormData(validateForgotPasswordSchema),
  forgotPassword
);
router.post("/verify-otp",
  customRateLimiter(10,5),
  validateFormData(validateVerifyOtpSchema),
  verifyOtp
);
router.post("/reset-password",
  customRateLimiter(5,10),
  validateFormData(validateResetPasswordSchema),
  resetPassword
);
//Protected Routes
router.get ("/me", isAuthenticated,getMe);
router.post("/logout",isAuthenticated,logoutUser);
export default router;
