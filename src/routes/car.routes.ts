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
import { cacheMiddleware, clearCache } from "../middleware/cache.middleware.js";

const router = Router();

// 1. CREATE VEHICLE (Wipes all inventory lists from cache to push the new car live)
router.post(
  "/create",
  isAdmin,
  validateFormData(validateCreateCarSchema),
  createCar,
  clearCache("all_cars"), // 🧼 Invalidates general fleet listings list
  clearCache("trending_cars"),
  clearCache("admin_fleet_dashboard"), // 🧼 Invalidates trending/featured list window
);

// 2. GET ALL CARS (Cached for 1 hour — extreme database load reduction)
router.get("/all", cacheMiddleware("all_cars", 3600), getAllCars);

// 3. GET TRENDING CARS (Cached for 1 hour globally)
router.get(
  "/trending",
  cacheMiddleware("trending_cars", 3600),
  getTrendingCars,
);

// 4. GET SINGLE CAR BY SLUG (Cached for 1 hour dynamically per unique slug route string)
router.get(
  "/single/:slug",
  cacheMiddleware("single_car_view", 3600),
  getSingleCar,
);

// 5. GET CAR QUERY UTILITY (Cached for 1 hour)
router.get("/get-car", cacheMiddleware("car_query_data", 3600), getCar);

export default router;
