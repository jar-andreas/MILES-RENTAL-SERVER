import { Router } from "express";
import { handleContactInquiry } from "src/controllers/contactUs.controller.js";
import { customRateLimiter } from "src/middleware/rateLimit.middelware.js";
import { validateFormData } from "src/middleware/formValidate.js";
import { validateContactUsSchema } from "src/lib/schemaValidation.js";

const router = Router();

router.post(
  "/contact-us",
  customRateLimiter(5, 10), //5 requests per 10 min
  validateFormData(validateContactUsSchema),
  handleContactInquiry,
);

export default router;
