import { Router } from "express";
import {
  cancelBooking,
  createBooking,
  getMyBookings,
  getSingleBooking,
} from "../controllers/booking.controller.js";
import { validateFormData } from "../middleware/formValidate.js";
import { validateBookingSchema } from "../lib/schemaValidation.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { customRateLimiter } from "../middleware/rateLimit.middelware.js";
import { cacheMiddleware, clearCache } from "../middleware/cache.middleware.js";

const router = Router();

// 1. CREATE BOOKING (Clears the client's booking metrics and pushes updates up to the admin dashboard)
router.post(
  "/create",
  customRateLimiter(5, 10),
  isAuthenticated,
  validateFormData(validateBookingSchema),
  createBooking,
  clearCache("user_bookings"),       // 🧼 Wipes user-specific records list
  clearCache("customers_dashboard")  // 🧼 Wipes administrative analytics table
);

router.get(
  "/my-bookings", 
  isAuthenticated, 
  cacheMiddleware("user_bookings", 3600), 
  getMyBookings
);

router.get(
  "/single-booking/:id", 
  isAuthenticated, 
  cacheMiddleware("single_user_booking", 3600), 
  getSingleBooking
);

router.post(
  "/cancel-booking/:id", 
  isAuthenticated, 
  cancelBooking,
  clearCache("user_bookings"),
  clearCache("single_user_booking"),
  clearCache("customers_dashboard") // 🧼 Ensures admin table subtracts their lifetime spend instantly
);

export default router;