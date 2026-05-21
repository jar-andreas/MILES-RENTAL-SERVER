import User from "../models/user.model.js";
import Car from "../models/car.model.js";
import Booking from "../models/booking.model.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import { NextFunction, Request, Response } from "express";
import logger from "../config/logger.js";
import { sendBookingCreatedEmail } from "../email/send-email.js";
import Payment from "../models/payment.model.js";

export const getAdminBookings = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const query = (req.query.query as string | undefined) || "";
    const bookingStatus = req.query.bookingStatus as string | undefined;
    const pickupDate = req.query.pickupDate as string | undefined;
    const returnDate = req.query.returnDate as string | undefined;

    const matchState: any = {};

    // ✅ Clean Regex matching instead of manual string transformation
    if (bookingStatus) {
      matchState.bookingStatus = {
        $regex: `^${bookingStatus.trim()}$`,
        $options: "i",
      };
    }

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

      const User = (await import("../models/user.model.js")).default;
      const getUsers = await User.find({
        $or: [{ firstName: regex }, { lastName: regex }],
      })
        .select("_id")
        .lean();

      const matchUserIds = getUsers.map((user) => user._id);

      matchState.$or = [
        { pickupLocation: regex },
        { returnLocation: regex },
        { user: { $in: matchUserIds } },
      ];
    }

    const Booking = (await import("../models/booking.model.js")).default;
    const PaymentModel = (await import("../models/payment.model.js")).default;

    const bookings = await Booking.find(matchState)
      .populate("user", "firstName lastName email phone")
      .populate("car", "brand modelName slug images status")
      .populate({
        path: "payment",
        model: PaymentModel,
        select: "paymentMethod reference paidAt amount",
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(matchState);

    const pendingOrders = await Booking.find({ bookingStatus: "Pending" });
    const confirmedOrders = await Booking.find({ bookingStatus: "Confirmed" });
    const completedOrders = await Booking.find({ bookingStatus: "Completed" });
    const cancelledOrders = await Booking.find({ bookingStatus: "Cancelled" });

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

export const adminBookRide = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const {
      car,
      fullname,
      phone,
      email,
      pickupLocation,
      returnLocation,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      driverOption,
      paymentMethod,
    } = req.body;

    // 1. Validate required fields
    if (
      !car ||
      !fullname ||
      !phone ||
      !email ||
      !pickupLocation ||
      !returnLocation ||
      !pickupDate ||
      !returnDate ||
      pickupTime ||
      returnTime
    ) {
      return sendTsRestError(res, 400, "All input fields are required");
    }

    // 2. Validate that the car exists
    const carDetails = await Car.findById(car);
    if (!carDetails) {
      return sendTsRestError(res, 404, "Vehicle not found");
    }

    // 4. Check car availability
    if (carDetails.status !== "available") {
      return sendTsRestError(
        res,
        400,
        `Vehicle is currently ${carDetails.status} and cannot be booked`,
      );
    }

    // 3. Validate that the user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendTsRestError(
        res,
        404,
        `The booking you are trying to make for the person with this email: ${email} is not a registered user on our website`,
      );
    }

    // 5. Validate dates
    const now = new Date();
    now.setHours(0, 0, 0, 0); // compare at day precision

    const pickUp = new Date(pickupDate);
    const toReturn = new Date(returnDate);
    const finalPickupTime = pickupTime || "09:00 AM";
    const finalReturnTime = returnTime || "12:00 PM";
    const totalDays = Math.ceil(
      (toReturn.getTime() - pickUp.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (totalDays <= 0) {
      return sendTsRestError(res, 400, "Return date must be after pickup date");
    }

    if (pickUp < now) {
      return sendTsRestError(res, 400, "Pick-up date cannot be in the past");
    }

    // 6. Financial breakdown (Calculated in real NGN Currency Values)
    const serviceFee = 10;
    const driverFeePerDay = driverOption === true ? 25 : 0;

    const rentalTotal = totalDays * carDetails.pricePerDay;
    const driverTotal = totalDays * driverFeePerDay;
    const grandTotal = rentalTotal + serviceFee + driverTotal;

    // 7. Create the Booking record (Pending status)
    const booking = await Booking.create({
      user: user._id,
      car: carDetails._id,
      pickupLocation,
      returnLocation,
      pickupDate: pickUp,
      returnDate: toReturn,
      pickupTime: finalPickupTime,
      returnTime: finalReturnTime,
      totalDays,
      totalPrice: grandTotal,
      driverOption: !!driverOption,
      bookingStatus: "Pending",
    });

    // 8. Update car status to booked
    carDetails.status = "booked";
    await carDetails.save();

    // 9. Generate payment reference and create a pending Payment record
    const reference = `RF${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const resolvedPaymentMethod =
      paymentMethod === "Pay_with_Bank_Transfer"
        ? "Pay_with_Bank_Transfer"
        : "Pay_with_Paystack";

    const payment = await Payment.create({
      userId: user._id,
      bookingId: booking._id,
      carId: carDetails._id,
      amount: grandTotal,
      currency: "NGN",
      paymentMethod: resolvedPaymentMethod,
      status: "pending",
      reference,
    });

    // 10. Send confirmation email using the unified file handler (Keeps controller super clean!)
    const userName = fullname || `${user.firstName} ${user.lastName}`;

    sendBookingCreatedEmail(user.email, {
      userName,
      car,
      pickupLocation,
      returnLocation,
      totalDays,
      driverOption: !!driverOption,
      rentalTotal,
      serviceFee,
      driverTotal,
      grandTotal,
      reference,
    }).catch((err) => {
      logger.error("Background confirmation email failed to dispatch:", err);
      console.error(err);
    });

    return sendTsRestSuccess(res, 201, {
      success: true,
      message: "Booking created successfully",
      booking,
      payment: {
        reference: payment.reference,
        amount: payment.amount,
        status: payment.status,
      },
      breakdown: {
        rentalTotal,
        serviceFee,
        driverTotal,
        grandTotal,
        totalDays,
      },
    });
  },
);

export const adminCancelBooking = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const unmodifiableStatuses = ["Completed", "Cancelled", "Ongoing"];

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return sendTsRestError(res, 404, "Booking record not found");
    }

    // status validation for both roles
    if (unmodifiableStatuses.includes(booking.bookingStatus)) {
      return sendTsRestError(
        res,
        400,
        `Booking cannot be updated because it is already ${booking.bookingStatus}`,
      );
    }

    // update booking status
    booking.bookingStatus = "Cancelled";
    await booking.save();

    if (booking.bookingStatus === "Cancelled" && booking.car) {
      await Car.findByIdAndUpdate(booking.car, { status: "available" });
      logger.info(
        `Vehicle bound to booking ${bookingId} has been successfully updated to 'available'.`,
      );
    }
    logger.info(
      `Admin context modified booking ${bookingId} status to: Cancelled`,
    );

    return sendTsRestSuccess(res, 200, {
      success: true,
      message: `Booking status updated to Cancelled successfully`,
      data: booking,
    });
  },
);

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
      await Car.findByIdAndUpdate(booking.car, {
        $set: { status: "available" },
        $inc: { tripsCount: 1 },
      });
    }

    logger.info(`Admin context successfully completed booking ${bookingId}`);

    return sendTsRestSuccess(res, 200, {
      success: true,
      message: `Booking ${bookingId} has been marked as completed`,
      booking,
    });
  },
);

export const getAdminSingleBooking = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    // 1. Manually import the model object inline so it definitely executes
    const PaymentModel = (await import("../models/payment.model.js")).default;

    const booking = await Booking.findById(bookingId)
      .populate("car")
      .populate("user")
      .populate({
        path: "payment",
        model: PaymentModel,
        select: "paymentMethod reference paidAt",
      })
      .lean();

    if (!booking) {
      return sendTsRestError(res, 404, "Booking not found");
    }

    return sendTsRestSuccess(res as any, 200, {
      success: true,
      booking,
    });
  },
);
