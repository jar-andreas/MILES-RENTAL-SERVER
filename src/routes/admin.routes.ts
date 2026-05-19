import Router from "express";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware.js";
import { getAdminBookings, adminBookRide } from "../controllers/admin.controller.js";

const router = Router();

router.get("/get_bookings", isAuthenticated, isAdmin, getAdminBookings);
router.post("/book_ride", isAuthenticated, isAdmin, adminBookRide);

export default router;
