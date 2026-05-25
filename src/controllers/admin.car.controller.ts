import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { Request, Response, NextFunction } from "express";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import Car from "../models/car.model.js";
import { uploadToCloudinary } from "../lib/cloudinary.js";

export const getAllCarsAdmin = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const cars = await Car.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCars = await Car.countDocuments({});

    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Cars retrieved successfully",
      cars,
      body: {
        pagination: {
          total: totalCars,
          currentPage: page,
          totalPages: Math.ceil(totalCars / limit),
          hasNextPage: page * limit < totalCars,
          hasPrevPage: page > 1,
        },
      },
    });
  },
);

export const createCarAdmin = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      images,
      brand,
      modelName,
      year,
      category,
      seats,
      fuelType,
      transmission,
      carSpecs,
      status,
    } = req.body;

    if (
      !images ||
      !brand ||
      !modelName ||
      !year ||
      !category ||
      !seats ||
      !fuelType ||
      !carSpecs ||
      !status
    ) {
      return sendTsRestError(res, 400, "All primary fields are required");
    }

    const uploadPromises = (images ?? []).map((img: string) =>
      uploadToCloudinary(img),
    );

    const cloudinaryResults = await Promise.all(uploadPromises);

    const uploadedImages = cloudinaryResults.map((result) => ({
      url: result.secure_url || result.url,
      public_id: result.public_id,
    }));

    const finalSlug = `${brand}-${modelName}-${year}`
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
    //handle slug creation
    const car = await Car.create({
      brand,
      category,
      modelName,
      year,
      seats,
      fuelType,
      transmission,
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
