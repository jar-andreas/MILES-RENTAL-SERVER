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

    // prevent double booking
    if (carDetails.status === "booked") {
      return sendTsRestError(res, 400, "Sorry, this car is already booked and unavailable.");
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
      totalPrice,
      driverOption,
      driverFee,
      serviceFee,
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
