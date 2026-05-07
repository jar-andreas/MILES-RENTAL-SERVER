import { Router } from "express";
import { handleContactInquiry } from "../controllers/contactUs.controller.js";
import { customRateLimiter } from "../middleware/rateLimit.middelware.js";
import { validateFormData } from "../middleware/formValidate.js";
import { validateContactUsSchema } from "../lib/schemaValidation.js";

const router = Router();

router.post(
  "/contact-us",
  customRateLimiter(5, 10), //5 requests per 10 min
  validateFormData(validateContactUsSchema),
  handleContactInquiry,
);

export default router;
