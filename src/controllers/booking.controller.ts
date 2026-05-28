import ActivityLog from "../models/activity.log.model.js";
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

    // 1. Core structural field validation
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

    // 2. Fetch the Car Details first
    const carDetails = await Car.findById(car);
    if (!carDetails) {
      return sendTsRestError(res, 404, "Vehicle not found");
    }

    const pickUp = new Date(pickupDate);
    const toReturn = new Date(returnDate);

    const totalDays = Math.ceil(
      (toReturn.getTime() - pickUp.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (totalDays <= 0) {
      return sendTsRestError(res, 400, "Return date must be after pickup date");
    }

    // 3. Define clean business-logic fee rules
    const calculatedDriverFee = driverOption === true ? 25000 * totalDays : 0;
    const flatServiceFee = 10000; // Flat fee per rental, not multiplied by days

    // 4. Calculate total price dynamically
    const carRentalTotal = carDetails.pricePerDay * totalDays;
    const totalPrice = carRentalTotal + flatServiceFee + calculatedDriverFee;

    // 5. Availability Check (Overlapping dates)
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

    // 6. Create Booking and pass ALL required attributes explicitly
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
      driverOption,
      driverFee: calculatedDriverFee,
      serviceFee: flatServiceFee,
      totalPrice,
    });

    // 🌟 LIVE LOG INJECTION (Uses verified local userId from session storage)
    await ActivityLog.create({
      label: `New reservation placed for a ${carDetails.brand} ${carDetails.modelName} - Ref: #${booking._id.toString().slice(-6).toUpperCase()}`,
      variant: "info",
      user: userId,
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
    //option to not be able to cancel a trip that has already confirmed or completed
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
      await Car.findByIdAndUpdate(
        booking.car,
        { status: "available" },
        { runValidators: true },
      );
      logger.info(
        `Vehicle bound to booking ${id} has been successfully updated to 'available'.`,
      );
    }
    await booking.save();

    // 🌟 LIVE LOG INJECTION (Uses verified local userId from session storage)
    await ActivityLog.create({
      label: `Customer cancelled pending reservation request #${id.slice(-6)}`,
      variant: "warning",
      user: userId,
    });

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
