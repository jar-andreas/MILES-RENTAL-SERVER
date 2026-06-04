import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { Request, Response } from "express";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import Car from "../models/car.model.js";
import Booking from "../models/booking.model.js";

export const addCarToFleet = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { make, model, year, pricePerDay, location, availabilityStatus } =
      req.body;

    if (!make || !model || !year || !pricePerDay || !location) {
      return sendTsRestError(res, 400, "All fields are required");
    }
    const car = await Car.create({
      make,
      model,
      year,
      pricePerDay,
      location,
      availabilityStatus: availabilityStatus || "available",
    });
    return sendTsRestSuccess(res, 201, {
      success: true,
      message: "Car added to fleet successfully",
      car,
    });
  },
);
