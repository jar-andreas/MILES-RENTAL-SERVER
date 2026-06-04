import Router from "express";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware.js";
import {
  adminBookRide,
  adminCancelBooking,
  adminMarkBookingCompleted,
  getAdminBookings,
  getAdminSingleBooking,
  getDashboardStats,
} from "../controllers/admin.controller.js";
import { validateFormData } from "../middleware/formValidate.js";
import { validateAdminNewBookingSchema } from "../lib/schemaValidation.js";
import { customRateLimiter } from "../middleware/rateLimit.middelware.js";
import { getAllUsers } from "../controllers/customer.controller.js";
import { cacheMiddleware, clearCache } from "../middleware/cache.middleware.js";
import { createCar, getAllCarsAdmin } from "../controllers/fleet.controller.js";
import { uploadMemory } from "../middleware/upload.middleware.js";
import { deleteAdmin, updateAdmin } from "../controllers/setting.controller.js";

const router = Router();

// 1. GET BOOKINGS LIST (Cached for 1 hour, or until cleared by updates)
router.get(
  "/get_bookings",
  isAuthenticated,
  isAdmin,
  cacheMiddleware("admin_bookings", 3600),
  getAdminBookings,
);

router.get(
  "/single_booking/:bookingId",
  isAuthenticated,
  isAdmin,
  cacheMiddleware("single_booking", 3600),
  getAdminSingleBooking,
);

router.get(
  "/customers-dashboard",
  isAuthenticated,
  isAdmin,
  cacheMiddleware("customers_dashboard", 3600),
  getAllUsers,
);

router.get(
  "/fleet-dashboard",
  isAuthenticated,
  isAdmin,
  cacheMiddleware("admin_fleet_dashboard", 1800), // Optional: Cache for 30 minutes to stay high-performance
  getAllCarsAdmin,
);

// 📊 ADMINISTRATIVE ANALYTICS ROUTE
// Fetches time-bound financial computations, operational alerts, recent timelines, and KPIs.
router.get(
  "/dashboard-stats",
  isAuthenticated,
  isAdmin,
  cacheMiddleware("admin_dashboard_stats", 300), // 🧠 Optional: Cache for 5 minutes (300s) to reduce continuous DB strain
  getDashboardStats,
);

router.post(
  "/cancel-booking/:bookingId",
  isAuthenticated,
  isAdmin,
  adminCancelBooking,
  clearCache("admin_bookings"),
  clearCache("single_booking"),
  clearCache("customers_dashboard"),
);

router.post(
  "/mark_booking_as_completed/:bookingId",
  isAuthenticated,
  isAdmin,
  adminMarkBookingCompleted,
  clearCache("admin_bookings"),
  clearCache("single_booking"),
  clearCache("customers_dashboard"),
);

router.post(
  "/admin_create_booking",
  customRateLimiter(5, 10),
  isAuthenticated,
  isAdmin,
  validateFormData(validateAdminNewBookingSchema),
  adminBookRide,
  clearCache("admin_bookings"),
  clearCache("customers_dashboard"),
);

router.post(
  "/create-car",
  isAuthenticated,
  isAdmin,
  uploadMemory.array("images", 4), // 📸 3. Parse 'images' file array from Postman/Gallery
  createCar,
  clearCache("admin_fleet_dashboard"), // 🧼 5. Wipe cache tags so updates reflect instantly
  clearCache("all_cars"),
);

router.patch("/update-admin", isAuthenticated, isAdmin, updateAdmin);
router.delete("/delete-workspace", isAuthenticated, isAdmin, deleteAdmin);

export default router;
