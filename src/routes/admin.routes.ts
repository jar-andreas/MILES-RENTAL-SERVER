import Router from "express";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware.js";
import {
  adminBookRide,
  adminCancelBooking,
  adminMarkBookingCompleted,
  getAdminBookings,
  getAdminSingleBooking,
} from "../controllers/admin.controller.js";
import { validateFormData } from "../middleware/formValidate.js";
import { validateAdminNewBookingSchema } from "../lib/schemaValidation.js";

const router = Router();

router.get("/get_bookings", isAuthenticated, isAdmin, getAdminBookings);
router.post(
  "/cancel-booking/:bookingId",
  isAuthenticated,
  isAdmin,
  adminCancelBooking,
);
router.post(
  "/mark_booking_as_completed/:bookingId",
  isAuthenticated,
  isAdmin,
  adminMarkBookingCompleted,
);
router.get(
  "/single_booking/:bookingId",
  isAuthenticated,
  isAdmin,
  getAdminSingleBooking,
);
router.post(
  "/admin_create_booking",
  isAuthenticated,
  isAdmin,
  validateFormData(validateAdminNewBookingSchema),
  adminBookRide,
);

export default router;
