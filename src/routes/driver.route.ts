import Router from "express";
import { createDriver } from "../controllers/driver.controller.js";
import { isAdmin, isAuthenticated } from "../middleware/auth.middleware.js";
import { validateFormData } from "../middleware/formValidate.js";
import { validateDriverSchema } from "../lib/schemaValidation.js";

const router = Router();

router.post(
  "/create-driver",
  isAuthenticated,
  isAdmin,
  validateFormData(validateDriverSchema),
  createDriver,
);

export default router;
