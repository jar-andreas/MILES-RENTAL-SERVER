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
import { cacheMiddleware, clearCache } from "../middleware/cache.middleware.js";

const router = Router();

// 1. CREATE DRIVER (Wipes driver list caches so the new employee shows up instantly)
router.post(
  "/create-driver",
  isAuthenticated,
  isAdmin,
  validateFormData(validateDriverSchema),
  createDriver,
  clearCache("all_drivers") // 🧼 Invalidates the driver directory list cache
);

// 2. ASSIGN DRIVER (Clears caches since driver status or availability changes upon assignment)
router.post(
  "/assign-driver", 
  isAuthenticated, 
  isAdmin, 
  assignDriver,
  clearCache("all_drivers"),       // 🧼 Wipes the driver management directory list
  clearCache("single_driver_view") // 🧼 Wipes specific driver profile details cache
);

// 3. GET ALL DRIVERS (Cached for 1 hour — massive admin panel speedup)
router.get(
  "/get-all-drivers", 
  isAuthenticated, 
  isAdmin, 
  cacheMiddleware("all_drivers", 3600), 
  getAllDriver
);

// 4. GET SINGLE DRIVER DETAILS (Cached dynamically per specific driverId parameter)
router.get(
  "/:driverId", 
  isAuthenticated, 
  isAdmin, 
  cacheMiddleware("single_driver_view", 3600), 
  getSingleDriver
);

export default router;