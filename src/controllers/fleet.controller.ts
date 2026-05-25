import tryCatchWrapper from "src/lib/tryCatchWrapper.js";
import { Request, Response } from "express";
import { sendTsRestError, sendTsRestSuccess } from "src/lib/responseHandler.js";
import Car from "src/models/car.model.js";
import Booking from "src/models/booking.model.js";

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
  }
);