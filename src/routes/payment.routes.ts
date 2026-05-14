import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import {
  handlePaystackWebhook,
  initializePayment,
  verifyPayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/initialize", isAuthenticated, initializePayment);
router.get("/verify", isAuthenticated, verifyPayment);
router.get("/verify", handlePaystackWebhook);

export default router;
