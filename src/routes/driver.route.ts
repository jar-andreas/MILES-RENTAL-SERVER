import Router from "express";
import {
  assignDriver,
  createDriver,
  getAllDriver,
  getSingleDriver,
} from "../controllers/driver.controller.js";
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
router.post(
  "/assign/:bookingId/:driverId",
  isAuthenticated,
  isAdmin,
  assignDriver,
);
router.get("/get-all-drivers", isAuthenticated, isAdmin, getAllDriver);
router.get("/:driverId", isAuthenticated, isAdmin, getSingleDriver);

export default router;
