import { Router } from "express";
import {
  createBooking,
  getMyBookings,
} from "../controllers/booking.controller.js";
import { validateFormData } from "../middleware/formValidate.js";
import { validateBookingSchema } from "../lib/schemaValidation.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/create",
  isAuthenticated,
  validateFormData(validateBookingSchema),
  createBooking,
);

router.get("/my-bookings", isAuthenticated, getMyBookings);

export default router;
