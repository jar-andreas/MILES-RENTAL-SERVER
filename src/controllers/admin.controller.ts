import User from "src/models/user.model.js";
import Booking from "src/models/booking.model.js";
import tryCatchWrapper from "src/lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "src/lib/responseHandler.js";
import { Request, Response, NextFunction } from "express";



export const getAdminBookings = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      bookingStatus,
      pickupLocation,
      pickupDate,
      query,
      returnDate,
      pickupTime,
      returnTime,
    } = (req as any).query;
    const sanitizeQuery = query
      ? query.toLowerCase().replace(/[^\w\s]/gi, "")
      : "";
    const sanitizePickupDate = pickupDate ? new Date(pickupDate) : null;
    const sanitizeReturnDate = returnDate ? new Date(returnDate) : null;
    const getUsers = await User.find({
      $or: [
        { firstName: { $regex: sanitizeQuery, $options: "i" } },
        { lastName: { $regex: sanitizeQuery, $options: "i" } },
      ],
    }).lean();
    const matchUserIds = getUsers.map((user) => user._id);

    const bookings = await Booking.find({
      ...(sanitizeQuery && {
        $or: [{ userId: { $in: matchUserIds } }],
      }),
      ...(bookingStatus && { bookingStatus: bookingStatus }),
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
