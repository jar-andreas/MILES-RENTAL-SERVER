import { Request, Response, NextFunction } from "express";
import User from "../models/user.model.js";
import { sendTsRestSuccess, sendTsRestError } from "../lib/responseHandler.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import Booking from "../models/booking.model.js";

export const getAllUsers = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const query = (req.query.query as string | undefined) || "";

    const skipOffSet = (page - 1) * limit;

    // Build a plain search filter for your query
    const matchStage: any = { role: "client" };

    // Dynamic search across firstName, lastName, and email
    if (query.trim()) {
      matchStage.$or = [
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }
    const [userData, totalUsers] = await Promise.all([
      User.find(matchStage)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skipOffSet)
        .limit(limit)
        .lean(),
      User.countDocuments(matchStage),
    ]);
    // Use a regular loop to fetch and calculate metrics for each customer
    const formattedUser = [];
    for (const user of userData) {
      //fetch all bookings that belongs to each particular users
      const bookingHistory = await Booking.find({ user: user._id }).lean();
      //filter out cancelled bookings when calculating total lifetime spend
      const validBookings = bookingHistory.filter(
        (b) => b.bookingStatus !== "Cancelled",
      );
      // Calculate lifetime spend by adding up the total prices
      let lifetimeSpend = 0;
      for (const b of validBookings) {
        lifetimeSpend += b.totalPrice || 0;
      }

      //find the most recent booking date
      let lastBookingDate = null;
      if (bookingHistory.length > 0) {
        // Sort bookings by date to find the latest one
        const sortedBookings = bookingHistory.sort(
          (a, b) =>
            new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime(),
        );
        lastBookingDate = sortedBookings[0].pickupDate;
      }
      // Combine the original customer data with our new calculated table fields
      formattedUser.push({
        ...user,
        bookingsCount: bookingHistory.length,
        lifetimeSpend: lifetimeSpend,
        lastBookingDate: lastBookingDate,
      });
    }
    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / limit);
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Customer dashboard analytics retrieved successfully",
      body: {
        users: formattedUser,
        pagination: {
          totalUsers,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  },
);
