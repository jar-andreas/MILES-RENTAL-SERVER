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
} from "../controllers/user.controller.js";
import { customRateLimiter } from "../middleware/rateLimit.middelware.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import {
  validateLoginUser,
  validateSignUpSchema,
  validateForgotPasswordSchema,
  validateResetPasswordSchema,
} from "../lib/schemaValidation.js";
import { validateFormData } from "../middleware/formValidate.js";

// 🚀 IMPORT CACHE MIDDLEWARES
import { cacheMiddleware, clearCache } from "../middleware/cache.middleware.js";

const router = Router();

router.post(
  "/register",
  customRateLimiter(10, 3),
  validateFormData(validateSignUpSchema),
  registerUser,
  clearCache("customers_dashboard") // 🧼 Optional but helpful: Clears the admin's customer dashboard list so the new signup shows up live!
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
  customRateLimiter(5, 10), 
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

// 1. GET CURRENT USER PROFILE (Cached for 1 hour per specific user session)
router.get(
  "/me", 
  isAuthenticated, 
  cacheMiddleware("user_profile", 3600), // ⏱️ Great for avoiding fetching the same user document on every page refresh
  getMe
);

// 2. LOGOUT USER (Clears their user profile cache upon exit)
router.post(
  "/logout", 
  isAuthenticated, 
  logoutUser,
  clearCache("user_profile") // 🧼 Safeguard: wipes the cache for this logged-out user session
);

// 3. DELETE ACCOUNT (Clears their profile cache and updates the admin metrics view)
router.delete(
  "/delete-account/:id", 
  deleteAccount,
  clearCache("user_profile"),
  clearCache("customers_dashboard") // 🧼 Updates the administrative user analytics list instantly
);

export default router;