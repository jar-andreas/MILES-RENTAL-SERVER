import { Request, Response } from "express";
import Booking from "../models/booking.model.js";
import Car from "../models/car.model.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestSuccess, sendTsRestError } from "../lib/responseHandler.js";
import logger from "../config/logger.js";

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

    const DRIVERFEE = 25;
    const SERVICEFEE = 10;

    // Pull the price per day directly from the database result
    let totalPrice = totalDays * (carDetails.pricePerDay + SERVICEFEE);

    // Optional: Add driver fee if selected
    if (driverOption === true) {
      totalPrice += DRIVERFEE * totalDays; // $25 extra per day for a driver
    }

    // Availability Check
    // Look for existing bookings for this car that overlap with the new dates
    const existingBooking = await Booking.findOne({
      car,
      bookingStatus: { $nin: ["Cancelled", "Completed"] },
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
      totalPrice,
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

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const totalBookings = await Booking.countDocuments({
      user: userId,
    });

    const bookings = await Booking.find({
      user: userId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("car")
      .populate("user", "firstName lastName email")
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

      page,
      limit,
      totalBookings,
      totalPages: Math.ceil(totalBookings / limit),

      count: bookings.length,
      bookings,
    });
  },
);

export const cancelBooking = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.session.userId;

    //find booking to make sure it is for the User
    const booking = await Booking.findOne({ _id: id, user: userId });

    if (!booking) {
      return sendTsRestError(res, 404, "Booking not found");
    }
    //option to not be able to cancel a trip that has already confrimed or completed
    if (
      booking.bookingStatus !== "Pending" &&
      booking.bookingStatus !== "Confirmed"
    ) {
      return sendTsRestError(
        res,
        400,
        `Cannot cancel a booking that is ${booking.bookingStatus}`,
      );
    }

    const bookingTime = new Date(booking.createdAt).getTime();
    const currentTime = new Date().getTime();

    const twentyFourHours = 24 * 60 * 60 * 1000;

    const differenceInTime = currentTime - bookingTime;

    if (differenceInTime > twentyFourHours) {
      return sendTsRestError(res, 400, "Cancellation window has expired");
    }
    booking.bookingStatus = "Cancelled";
    if (booking.bookingStatus === "Cancelled" && booking.car) {
      await Car.findByIdAndUpdate(booking.car, { status: "available" });
      logger.info(
        `Vehicle bound to booking ${id} has been successfully updated to 'available'.`,
      );
    }
    await booking.save();
    return sendTsRestSuccess(res, 200, {
      message: "Booking cancelled successfully",
      booking,
    });
  },
);

export const getSingleBooking = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.session.userId;

    const booking = await Booking.findOne({
      _id: id,
      user: userId,
    })
      .populate("car")
      .populate("user", "firstName lastName email")
      .lean();

    if (!booking) {
      return sendTsRestSuccess(res, 404, {
        success: false,
        message: "Booking not found",
      });
    }

    return sendTsRestSuccess(res, 200, {
      success: true,
      booking,
    });
  },
);
