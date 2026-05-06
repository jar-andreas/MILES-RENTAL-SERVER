import { Request, Response } from "express";
import Car from "../models/car.model.js";

// GET /api/cars
export const getAllCars = async (req: Request, res: Response): Promise<void> => {
  const {
    segment,
    category,
    fuelType,
    transmission,
    page  = 1,
    limit = 6,
  } = req.query;

  const filter: Record<string, any> = {};

  if (segment)      filter.segment      = (segment as string).toUpperCase();
  if (category)     filter.category     = (category as string).toUpperCase();
  if (fuelType)     filter.fuelType     = fuelType;
  if (transmission) filter.transmission = (transmission as string).toUpperCase();

  const total = await Car.countDocuments(filter);
  const cars  = await Car.find(filter)
    .sort({ rating: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .select('brand modelName year slug category segment tags thumbnail pricePerDay seats fuelType transmission rating tripsCount image');

  res.status(200).json({
    success: true,
    data: cars,
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
};

// GET /api/cars/:slug
export const getSingleCar = async (req: Request, res: Response): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
    return;
  }

  const car = await Car.findOne({ slug: req.params.slug });

  if (!car) {
    res.status(404).json({ success: false, message: "Car not found" });
    return;
  }

  res.status(200).json({ success: true, data: car });
};