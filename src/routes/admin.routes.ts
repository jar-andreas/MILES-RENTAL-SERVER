import Router from "express";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware.js";
import { adminCancelBooking, getAdminBookings } from "../controllers/admin.controller.js";

const router = Router();

router.get("/get_bookings", isAuthenticated, isAdmin, getAdminBookings);
router.post("/cancel-booking/:bookingId", isAuthenticated, isAdmin, adminCancelBooking);

export default router;
