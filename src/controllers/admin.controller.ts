import User from "src/models/user.model.js";
import Booking from "src/models/booking.model.js";
import tryCatchWrapper from "src/lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "src/lib/responseHandler.js";

export const getAllBookings = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
  },
);
