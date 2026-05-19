import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import { Request, Response } from "express";

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



