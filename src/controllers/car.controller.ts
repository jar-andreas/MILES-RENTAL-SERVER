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
      ratings,
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
      ratings,
      tripsCount,
      carSpecs,
      image: uploadedImages,
      slug: finalSlug,
    });

    if (!car) {
      return sendTsRestError(
        res,
        500,
        "Failed to create car record in database",
      );
    }

    return sendTsRestSuccess(res, 201, car);
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
        deleteFromCloudinary(img.public_id)
      );
      await Promise.all(deletePromises);
    }

    // 4. Delete from DB using the slug
    await Car.findOneAndDelete({ slug });

    return sendTsRestSuccess(res, 200, { message: "Car deleted successfully" });
  }
);
