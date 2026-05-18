import User from "src/models/user.model.js";
import Booking from "src/models/booking.model.js";
import tryCatchWrapper from "src/lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "src/lib/responseHandler.js";

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
