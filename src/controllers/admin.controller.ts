import tryCatchWrapper from "../lib/tryCatchWrapper.js"
import { Request, Response } from "express";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";

export const getAllBookings = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const bookings = await booking.find().populate("user").populate("car");
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Bookings retrieved successfully",
      data: bookings,
    });
  },
);

export const getBookingById = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params; 
    const booking = await Booking.findById(id).populate("user").populate("car");
    if (!booking) {
      return sendTsRestError(res, 404, "Booking not found");
    }
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Booking retrieved successfully",
      data: booking,
    });
  },
);


// ─── Mark Booking As Completed (Admin) ───────────────────────────────────────

export const adminMarkBookingCompleted = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return sendTsRestError(res, 404, "Booking not found");
    }

    const validPreviousStatuses = ["Confirmed", "Ongoing", "Picked Up"];

    if (!validPreviousStatuses.includes(booking.bookingStatus)) {
      return sendTsRestError(
        res,
        400,
        `Cannot mark a ${booking.bookingStatus} booking as completed.`
      );
    }

    booking.bookingStatus = "Completed";
    await booking.save();

    return sendTsRestSuccess(res, 200, {
      success: true,
      message: `Booking ${id} has been marked as completed`,
      booking,
    });
  }
);


