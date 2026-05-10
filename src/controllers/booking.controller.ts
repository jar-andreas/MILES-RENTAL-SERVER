import { Request, Response } from "express";
import Booking from "../models/booking.model.js";
import Car from "../models/car.model.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestSuccess, sendTsRestError } from "../lib/responseHandler.js";

export const createBooking = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const {
      car,
      pickupLocation,
      returnLocation,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      totalPrice,
      driverOption,
    } = req.body;

    const userId = req.session.userId;
    // 1. Fetch the Car Details first
    const carDetails = await Car.findById(car);
    if (!carDetails) {
      return sendTsRestError(res, 404, "Vehicle not found");
    }
    if (
      !car ||
      !pickupLocation ||
      !returnLocation ||
      !pickupDate ||
      !returnDate
    ) {
      return sendTsRestError(
        res,
        400,
        "All primary booking fields are required",
      );
    }

    const pickUp = new Date(pickupDate);
    const toReturn = new Date(returnDate);

    const totalDays = Math.ceil(
      (toReturn.getTime() - pickUp.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (totalDays <= 0) {
      return sendTsRestError(res, 400, "Return date must be after pickup date");
    }

    // Pull the price per day directly from the database result
    let calculatedPrice = totalDays * carDetails.pricePerDay;

    // Optional: Add driver fee if selected
    if (driverOption === true) {
      calculatedPrice += 25 * totalDays; // $25 extra per day for a driver
    }

    // Availability Check
    // Look for existing bookings for this car that overlap with the new dates
    const existingBooking = await Booking.findOne({
      car,
      bookingStatus: { $ne: "Cancelled" }, // Ignore cancelled bookings
      $or: [{ pickupDate: { $lte: toReturn }, returnDate: { $gte: pickUp } }],
    });

    if (existingBooking) {
      return sendTsRestError(
        res,
        400,
        "This vehicle is already booked for the selected dates",
      );
    }

    const booking = await Booking.create({
      user: userId,
      car,
      pickupLocation,
      returnLocation,
      pickupDate: pickUp,
      returnDate: toReturn,
      pickupTime,
      returnTime,
      totalDays,
      totalPrice: calculatedPrice,
      driverOption,
    });

    return sendTsRestSuccess(res, 201, {
      success: true,
      booking,
    });
  },
);

export const getMyBookings = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const userId = req.session.userId;

    const bookings = await Booking.find({
      user: userId,
    })
      .populate("car")
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 }) // Show newest bookings first
      .lean();
    // 2. Handle empty states gracefully
    if (!bookings || bookings.length === 0) {
      return sendTsRestSuccess(res, 200, {
        success: true,
        message: "No bookings found",
        bookings: [],
      });
    }
    return sendTsRestSuccess(res, 200, {
      success: true,
      count: bookings.length,
      bookings,
    });
  },
);
