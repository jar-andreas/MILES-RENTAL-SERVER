import { Router } from "express";
import {
  createCar,
  getAllCars,
  getSingleCar,
  getTrendingCars,
} from "../controllers/car.controller.js";
import { isAdmin } from "../middleware/auth.middleware.js";
import { validateFormData } from "../middleware/formValidate.js";
import { validateCreateCarSchema } from "../lib/schemaValidation.js";

const router = Router();

router.post(
  "/create",
  isAdmin,
  validateFormData(validateCreateCarSchema),
  createCar,
);
router.get("/all", getAllCars);
router.get("/trending", getTrendingCars);
router.get("/single/:slug", getSingleCar);

export default router;
