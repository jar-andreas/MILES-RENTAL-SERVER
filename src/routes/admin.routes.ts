import Router from "express";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware.js";
import { getAdminBookings } from "../controllers/admin.controller.js";

const router = Router();

router.get("/get_bookings", isAuthenticated, isAdmin, getAdminBookings);

export default router;
