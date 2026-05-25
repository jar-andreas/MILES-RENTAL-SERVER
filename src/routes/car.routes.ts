import { Router } from "express";
import {
  createCar,
  getAllCars,
  getSingleCar,
  getTrendingCars,
  getCar,
} from "../controllers/car.controller.js";
import { isAdmin } from "../middleware/auth.middleware.js";
import { validateFormData } from "../middleware/formValidate.js";
import { validateCreateCarSchema } from "../lib/schemaValidation.js";
import { clearCache } from "src/middleware/cache.middleware.js";

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
router.get("/get-car", getCar);

export default router;
