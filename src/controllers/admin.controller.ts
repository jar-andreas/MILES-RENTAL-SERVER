import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import { NextFunction, Request, Response } from "express";

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
      .populate("car", "brand modelName slug images")
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

export const adminCancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bookingId = req.params.id;
  const { userId, role } = req.session;
  const { status } = req.body; // new status from request body

  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return sendTsRestError(res, 404, "Booking not found");
    }

    // switch role-based logic
    if (role === "client") {
      // clients can only cancel their own bookings
      if (booking.userId.toString() !== userId) {
        return sendTsRestError(
          res,
          403,
          "You are not authorised to update this booking"
        );
      }

      // clients can only cancel — not set any other status
      if (status !== "cancelled") {
        return sendTsRestError(
          res,
          403,
          "Clients can only cancel bookings"
        );
      }

      // clients can only cancel within 24 hours of creation
      const hoursSinceCreation =
        (Date.now() - new Date(booking.createdAt).getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > 24) {
        return sendTsRestError(
          res,
          403,
          "Cancellation window has expired. Bookings can only be cancelled within 24 hours of creation"
        );
      }
    }

    // status validation for both roles
    if (["completed", "cancelled", "ongoing"].includes(booking.status)) {
      return sendTsRestError(
        res,
        400,
        `Booking cannot be updated because it is already ${booking.status}`
      );
    }

    // validate new status
    const allowedStatuses = ["pending", "confirmed", "ongoing", "completed", "cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return sendTsRestError(
        res,
        400,
        `Invalid status. Allowed values are: ${allowedStatuses.join(", ")}`
      );
    }

    // update booking status
    booking.status = status;
    await booking.save();

    return sendTsRestSuccess(res, 200, {
      success: true,
      message: `Booking status updated to ${status} successfully`,
      data: booking,
    });

  } catch (error) {
    next(error);
  }
};
