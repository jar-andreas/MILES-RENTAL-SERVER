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

    const finalSlug = (`${brand}-${modelName}-${year}`)
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

    const cars = await Car.find(filter)
      .sort(sort ? { [sort as string]: 1 } : { createdAt: -1 })
      .lean();
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
    const car = await Car.findOne({
      slug: { $regex: `^${slug}$`, $options: "i" },
    }).lean();
    if (!car) {
      return sendTsRestError(res, 404, "Vehicle not found.");
    }
    return sendTsRestSuccess(res, 200, {
      message: "Vehicle retrieved successfully",
      data: car,
    });
  },
);

export const getTrendingCars = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const trendingCars = await Car.find()
      .sort({ rating: -1, tripsCount: -1 })
      .limit(4)
      .select("-description -features")
      .lean(); //for performance optimization removes the descri,features
    if (!trendingCars || trendingCars.length === 0) {
      return sendTsRestError(res, 404, "No trending cars found");
    }
    return sendTsRestSuccess(res, 200, {
      message: "Trending cars retrieved successfully",
      data: trendingCars,
    });
  },
);
