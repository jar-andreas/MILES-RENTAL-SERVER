import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import { NextFunction, Request, Response } from "express";
import Car from "../models/car.model.js";
import logger from "../config/logger.js";

export const getAdminBookings = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const query = (req.query.query as string | undefined) || "";
    const bookingStatus = req.query.bookingStatus as string | undefined;
    const pickupDate = req.query.pickupDate as string | undefined;
    const returnDate = req.query.returnDate as string | undefined;

    const matchState: any = {
      ...(bookingStatus && { bookingStatus }),
    };

    if (pickupDate) {
      matchState.pickupDate = {
        $gte: new Date(pickupDate),
        $lte: new Date(new Date(pickupDate).setHours(23, 59, 59, 999)),
      };
    }

    if (returnDate) {
      matchState.returnDate = {
        $gte: new Date(returnDate),
        $lte: new Date(new Date(returnDate).setHours(23, 59, 59, 999)),
      };
    }

    if (query) {
      const sanitizeQuery = query.replace(/[^\w\s]/gi, "");
      const regex = { $regex: sanitizeQuery, $options: "i" };
      const getUsers = await User.find({
        $or: [{ firstName: regex }, { lastName: regex }],
      })
        .select("_id")
        .lean();
      console.log("aa", getUsers);
      const matchUserIds = getUsers.map((user) => user._id);

      matchState.$or = [
        { pickupLocation: regex },
        { returnLocation: regex },
        { user: { $in: matchUserIds } },
      ];
    }

    const bookings = await Booking.find(matchState)
      .populate("user", "firstName lastName email phone")
      .populate("car", "brand modelName slug images status")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(matchState);

    const pendingOrders = await Booking.find({
      bookingStatus: "Pending",
    });
    const confirmedOrders = await Booking.find({
      bookingStatus: "Confirmed",
    });
    const completedOrders = await Booking.find({
      bookingStatus: "Completed",
    });
    const cancelledOrders = await Booking.find({
      bookingStatus: "Cancelled",
    });
    return sendTsRestSuccess(res as any, 200, {
      pendingOrders: pendingOrders.length,
      confirmedOrders: confirmedOrders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      bookings,
      pagination: {
        currentPage: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasMore: (page - 1) * limit + bookings.length < total,
      },
    });
  },
);

export const adminCancelBooking = async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { status } = req.body; // new status from request body

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return sendTsRestError(res, 404, "Booking not found");
  }

  const unmodifiableStatuses = ["Completed", "Cancelled", "Ongoing"];

  // status validation for both roles
  if (unmodifiableStatuses.includes(booking.bookingStatus)) {
    return sendTsRestError(
      res,
      400,
      `Booking cannot be updated because it is already ${booking.bookingStatus}`,
    );
  }

  // update booking status
  booking.bookingStatus = status;
  await booking.save();

  if (booking.bookingStatus === "Cancelled" && booking.car) {
    await Car.findByIdAndUpdate(booking.car, { status: "available" });
    logger.info(
      `Vehicle bound to booking ${bookingId} has been successfully updated to 'available'.`,
    );
  }
  logger.info(
    `Admin context modified booking ${bookingId} status to: ${status}`,
  );

  return sendTsRestSuccess(res, 200, {
    success: true,
    message: `Booking status updated to ${status} successfully`,
    data: booking,
  });
};

export const adminMarkBookingCompleted = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return sendTsRestError(res, 404, "Booking not found");
    }

    const validPreviousStatuses = ["Confirmed", "Ongoing"];

    if (!validPreviousStatuses.includes(booking.bookingStatus)) {
      return sendTsRestError(
        res,
        400,
        `Cannot mark a ${booking.bookingStatus} booking as completed.`,
      );
    }

    // Time Enforcement Guard Gate

    // 1. Get a clean "YYYY-MM-DD" local date string from Mongoose directly
    const formattedReturnDate = booking.returnDate.toLocaleDateString("en-CA");

    // 2. Combine it with the 12-hour time string ("09:00 PM")
    const scheduledReturnDateTime = new Date(
      `${formattedReturnDate} ${booking.returnTime}`,
    );
    
     // 3. Block if the admin tries to close it early
    const currentDateTime = new Date();
    if (currentDateTime < scheduledReturnDateTime) {
      return sendTsRestError(
        res,
        400,
        `Cannot complete booking yet. The scheduled rental return window closes on ${formattedReturnDate} at ${booking.returnTime}.`,
      );
    }

    booking.bookingStatus = "Completed";
    await booking.save();

    if (booking.car) {
      await Car.findByIdAndUpdate(booking.car, { status: "available" });
      logger.info(
        `Vehicle bound to booking ${bookingId} has been successfully released back to 'available'.`,
      );
    }

    logger.info(`Admin context successfully completed booking ${bookingId}`);

    return sendTsRestSuccess(res, 200, {
      success: true,
      message: `Booking ${bookingId} has been marked as completed`,
      booking,
    });
  },
);
