import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import {
  initializePayment,
  verifyPayment,
} from "../controllers/payment.controller.js";
import { validateFormData } from "../middleware/formValidate.js";
import { ValidateVerifyPaymentSchema } from "../lib/schemaValidation.js";

const router = Router();

router.post("/initialize", isAuthenticated, initializePayment);
router.get(
  "/verify",
  isAuthenticated,
  validateFormData(ValidateVerifyPaymentSchema),
  verifyPayment,
);

export default router;
