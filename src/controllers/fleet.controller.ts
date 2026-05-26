import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { Request, Response } from "express";
import { sendTsRestSuccess } from "../lib/responseHandler.js";
import Car from "../models/car.model.js";

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
