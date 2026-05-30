import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { NextFunction, Request, Response } from "express";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import Car from "../models/car.model.js";
import { uploadToCloudinary } from "../lib/cloudinary.js";

interface ICarImage {
  url: string;
  public_id: string;
}

export const getAllCarsAdmin = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const [cars, totalCars] = await Promise.all([
      Car.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Car.countDocuments({}),
    ]);

    // 🚀 2. Calculate the top summary badges dynamically from your Car collection
    // This groups all cars by status and counts them in a single fast query
    const statusCountsGroup = await Car.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // 🚀 3. Map the aggregation array into a clean, flat object for the frontend
    // Ensures keys default to 0 if no vehicles currently possess that specific status
    const stats = {
      available: 0,
      booked: 0,
      maintenance: 0,
      reserved: 0,
    };

    statusCountsGroup.forEach((item) => {
      // Normalize your DB schema strings (handles lowercase/uppercase safely)
      const dbStatus = String(item._id).toLowerCase();

      if (dbStatus === "available") stats.available = item.count;
      if (dbStatus === "booked") stats.booked = item.count;
      if (dbStatus === "maintenance") stats.maintenance = item.count;
      if (dbStatus === "reserved") stats.reserved = item.count;
    });

    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Cars and fleet summary stats retrieved successfully",
      stats,
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

export const createCar = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    // 🚀 1. Destructure exactly what is defined in your request body specification
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
      slug,
      rating,
      tripsCount,
      transmission,
      features,
      carSpecs,
    } = req.body;

    // 🛑 Early Validation Check
    if (!brand || !modelName || !year) {
      return sendTsRestError(res, 400, "Brand, model name, and year are required.");
    }

    // 🚀 2. Intercept raw files from req.files and convert them to Base64 strings
    let uploadedImages: ICarImage[] = [];
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const uploadPromises = files.map((file) => {
        // Convert binary buffer to base64
        const base64String = file.buffer.toString("base64");

        // Format it as a valid Data URI syntax for Cloudinary
        const fileDataUri = `data:${file.mimetype};base64,${base64String}`;

        return uploadToCloudinary(fileDataUri);
      });

      const cloudinaryResults = await Promise.all(uploadPromises);
      uploadedImages = cloudinaryResults.map((result) => ({
        url: result.url,
        public_id: result.public_id,
      }));
    }

    // 🚀 3. Safe-parse incoming arrays or objects if they were sent as Form-Data string payloads
    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
    const parsedFeatures =
      typeof features === "string" ? JSON.parse(features) : features;
    const parsedCarSpecs =
      typeof carSpecs === "string" ? JSON.parse(carSpecs) : carSpecs;

    // 🚀 4. Generate the unique slug
    const finalSlug = slug || `${brand}-${modelName}-${year}`
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");

    const existingCar = await Car.findOne({ slug: finalSlug });
    if (existingCar) {
      return sendTsRestError(
        res,
        400,
        "A car with this custom slug already exists",
      );
    }

    // 🚀 5. Create the database record exactly with your properties
    const car = await Car.create({
      brand,
      description,
      category,
      modelName,
      year: Number(year) || new Date().getFullYear(),
      tags: Array.isArray(parsedTags) ? parsedTags : [],
      pricePerDay: Number(pricePerDay) || 0,
      seats: Number(seats) || 5,
      fuelType,
      transmission,
      features: Array.isArray(parsedFeatures) ? parsedFeatures : [],
      rating: Number(rating) || 5.0,
      tripsCount: Number(tripsCount) || 0,
      carSpecs: parsedCarSpecs || {},
      images: uploadedImages, // Saved array of { url, public_id } objects
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
