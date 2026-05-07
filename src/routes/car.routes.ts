import { Router } from "express";
import {
  createCar,
  getAllCars,
  getSingleCar,
} from "src/controllers/car.controller.js";

const router = Router();

router.post("/create", createCar);
router.get("/all", getAllCars);
router.get("/single/:slug", getSingleCar);

export default router;
