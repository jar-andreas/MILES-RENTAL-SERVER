import { uploadToCloudinary } from "src/lib/cloudinary.js";
import { deleteFromCloudinary } from "src/lib/cloudinary.js";
import { Request, Response } from "express";
import Car from "../models/car.model.js";
import tryCatchWrapper from "src/lib/tryCatchWrapper.js";

type CreateCarBody = {
  brand: string;
  description: string;
  segment:
    | "EXECUTIVE"
    | "LOGISTICS"
    | "FAMILY"
    | "CITY"
    | "PREMIUM"
    | "ELECTRIC";
  category: string;
  modelName: string;
  year: number;
  tags: ("CITY" | "BEST SELLER" | "ECONOMY" | "POPULAR")[];
  pricePerDay: number;
  seats: number;
  fuelType: string;
  transmission: "AUTO" | "MANUAL";
  features?: string[];
  carSpecs?: {
    engine?: string;
    topSpeed?: string;
    mileage?: string;
    boot?: string;
  };
  image: string[];
};

export const createCar = tryCatchWrapper(
  async (req: Request<{}, {}, CreateCarBody>, res: Response) => {
    const {
      brand,
      description,
      segment,
      category,
      modelName,
      year,
      tags,
      pricePerDay,
      seats,
      fuelType,
      transmission,
      features,
      carSpecs,
      image,
    } = req.body;

    const uploadedImages: { url: string; public_id: string }[] = [];

    for (const img of image ?? []) {
      const result = await uploadToCloudinary(img);

      uploadedImages.push({
        url: result.url,
        public_id: result.public_id,
      });
    }

    const slug = `${brand}-${modelName}-${year}`
      .toLowerCase()
      .replace(/\s+/g, "-");

    const car = await Car.create({
      brand,
      description,
      segment,
      category,
      modelName,
      year,
      tags,
      pricePerDay,
      seats,
      fuelType,
      transmission,
      features,
      carSpecs,
      image: uploadedImages,
      slug,
    });

    return res.status(201).json({
      success: true,
      data: car,
    });
  }
);

export const deleteCar = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    if (car.image && car.image.length > 0) {
      for (const img of car.image) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    await Car.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Car deleted successfully",
    });
  }
);