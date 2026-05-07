import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "src/lib/cloudinary.js";
import { NextFunction, Request, Response } from "express";
import Car from "../models/car.model.js";
import tryCatchWrapper from "src/lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "src/lib/responseHandler.js";

interface ICarImage {
  url: string;
  public_id: string;
}

export const createCar = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      brand,
      description,
      category,
      modelName,
      year,
      tags,
      pricePerDay,
      seats,
      fuelType,
      rating,
      tripsCount,
      slug,
      transmission,
      features,
      carSpecs,
      images,
    } = req.body;

    const uploadPromises = (images ?? []).map((img: string) =>
      uploadToCloudinary(img),
    );

    const cloudinaryResults = await Promise.all(uploadPromises);

    const uploadedImages = cloudinaryResults.map((result) => ({
      url: result.secure_url || result.url,
      public_id: result.public_id,
    }));

    const finalSlug = (slug || `${brand}-${modelName}-${year}`)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // Replaces spaces with dashes
      .replace(/[^\w\-]+/g, "");

    const existingCar = await Car.findOne({ slug: finalSlug });
    if (existingCar) {
      return sendTsRestError(
        res,
        400,
        "A car with this custom slug already exists",
      );
    }

    const car = await Car.create({
      brand,
      description,
      category,
      modelName,
      year,
      tags,
      pricePerDay,
      seats,
      fuelType,
      transmission,
      features,
      rating,
      tripsCount,
      carSpecs,
      images: uploadedImages,
      slug: finalSlug,
    });

    if (!car) {
      return sendTsRestError(
        res,
        500,
        "Failed to create car record in database",
      );
    }

    return sendTsRestSuccess(res, 201, {
      message: "Car created successfully",
      data: car,
    });
  },
);

export const deleteCar = tryCatchWrapper(
  async (req: Request, res: Response) => {
    // 1. Destructure slug instead of id
    const { slug } = req.params as { slug: string };

    // 2. Use findOne with the slug
    const car = await Car.findOne({ slug });

    if (!car) {
      return sendTsRestError(res, 404, "Car not found");
    }

    // 3. Clean up Cloudinary images
    if (car.image && car.image.length > 0) {
      const deletePromises = car.image.map((img: ICarImage) =>
        deleteFromCloudinary(img.public_id),
      );
      await Promise.all(deletePromises);
    }

    // 4. Delete from DB using the slug
    await Car.findOneAndDelete({ slug });

    return sendTsRestSuccess(res, 200, { message: "Car deleted successfully" });
  },
);

export const getAllCars = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { brand, category, sort } = req.query;
    const filter: any = {};
    if (brand) {
      filter.brand = { $regex: brand, $options: "i" }; //turns any query stored in database as uppercase to lowercase whule fetching data
    }

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    const cars = await Car.find(filter).sort(
      sort ? { [sort as string]: 1 } : { createdAt: -1 },
    );
    if (!cars || cars.length === 0) {
      return sendTsRestError(
        res,
        200,
        "No vehicles found matching your criteria",
      );
    }
    return sendTsRestSuccess(res, 200, {
      count: cars.length,
      data: cars,
    });
  },
);

export const getSingleCar = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    // The $options: 'i' handles the user typing uppercase,
    // even though your DB only has lowercase + numbers.
    const car = await Car.findOne({ slug: { $regex: `^${slug}$`, $options: "i" } });
    if (!car) {
      return sendTsRestError(res, 404, "Vehicle not found.");
    }
    return sendTsRestSuccess(res, 200, {
      message: "Vehicle retrieved successfully",
      data: car,
    });
  },
);

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