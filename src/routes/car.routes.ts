import { Router } from "express";
import { createCar, getAllCars } from "src/controllers/car.controller.js";

const router = Router();

router.post("/create", createCar);
router.get('/all', getAllCars);

export default router;
