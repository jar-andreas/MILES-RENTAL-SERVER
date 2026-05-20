import User from "../models/user.model.js";
import Car from "../models/car.model.js";
import Booking from "../models/booking.model.js";
import Payment from "../models/payment.model.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import { NextFunction, Request, Response } from "express";
import logger from "../config/logger.js";
import { sendEmail } from "../email/send-email.js";

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
        select: "paymentMethod reference paidAt",
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
export const adminCancelBooking = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { bookingId } = req.params;

// ─── Admin: Manually create a booking on behalf of a user 
export const adminBookRide = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const {
      carId,
      email,
      pickupLocation,
      returnLocation,
      pickUpDate,
      dropOffDate,
      pickupTime,
      returnTime,
      addDriver,
      paymentMethod,
    } = req.body;

    // 1. Validate required fields
    if (
      !carId ||
      !email ||
      !pickupLocation ||
      !returnLocation ||
      !pickUpDate ||
      !dropOffDate
    ) {
      return sendTsRestError(
        res,
        400,
        "carId, email, pickupLocation, returnLocation, pickUpDate and dropOffDate are all required",
      );
    }

    // 2. Validate that the car exists
    const car = await Car.findById(carId);
    if (!car) {
      return sendTsRestError(res, 404, "Vehicle not found");
    }

    // 3. Validate that the user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendTsRestError(res, 404, `No user found with email: ${email}`);
    }

    // 4. Check car availability
    if (car.status !== "available") {
      return sendTsRestError(
        res,
        400,
        `Vehicle is currently ${car.status} and cannot be booked`,
      );
    }

    // 5. Validate dates
    const now = new Date();
    now.setHours(0, 0, 0, 0); // compare at day precision

    const pickUp = new Date(pickUpDate);
    const dropOff = new Date(dropOffDate);

    if (isNaN(pickUp.getTime()) || isNaN(dropOff.getTime())) {
      return sendTsRestError(res, 400, "Invalid date format provided");
    }

    if (pickUp < now) {
      return sendTsRestError(res, 400, "Pick-up date cannot be in the past");
    }

    if (dropOff <= pickUp) {
      return sendTsRestError(
        res,
        400,
        "Drop-off date must be after the pick-up date",
      );
    }

    const totalDays = Math.ceil(
      (dropOff.getTime() - pickUp.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 6. Financial breakdown
    const DRIVER_FEE_PER_DAY = 30_000; // ₦30,000 per day
    const SERVICE_FEE_RATE = 0.04;     // 4% of rental total

    const rentalTotal = car.pricePerDay * totalDays;
    const serviceFee = Math.round(rentalTotal * SERVICE_FEE_RATE);
    const driverTotal = addDriver === true ? DRIVER_FEE_PER_DAY * totalDays : 0;
    const grandTotal = rentalTotal + serviceFee + driverTotal;

    // 7. Create the Booking record (Pending status)
    const booking = await Booking.create({
      user: user._id,
      car: car._id,
      pickupLocation,
      returnLocation,
      pickupDate: pickUp,
      returnDate: dropOff,
      pickupTime: pickupTime ?? "",
      returnTime: returnTime ?? "",
      totalDays,
      totalPrice: grandTotal,
      driverOption: addDriver === true,
      driverFee: driverTotal,
      serviceFee,
      bookingStatus: "Pending",
    });

    // 8. Update car status to booked
    car.status = "booked";
    await car.save();

    // 9. Generate payment reference and create a pending Payment record
    const reference = `RF${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const resolvedPaymentMethod =
      paymentMethod === "Pay_with_Paystack"
        ? "Pay_with_Paystack"
        : "Pay_with_Bank_Transfer";

    const payment = await Payment.create({
      userId: user._id,
      bookingId: booking._id,
      carId: car._id,
      amount: grandTotal,
      currency: "NGN",
      paymentMethod: resolvedPaymentMethod,
      status: "pending",
      reference,
    });

    // 10. Send confirmation email to the user
    const userName = `${user.firstName} ${user.lastName}`;
    const htmlContent = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 620px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: #f39317; padding: 24px 32px;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">Booking Confirmation</h1>
          <p style="color: #fff; margin: 4px 0 0; font-size: 14px;">Miles Car Rental</p>
        </div>
        <div style="padding: 28px 32px;">
          <p style="font-size: 15px; color: #374151;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            An administrator has created a booking for you on <strong>Miles Rental</strong>.
            Please find the details of your reservation below.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; color: #374151;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Vehicle</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${car.brand} ${car.modelName} (${car.year})</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Pick-up Location</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${pickupLocation}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Return Location</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${returnLocation}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Pick-up Date</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${pickUp.toDateString()}${pickupTime ? " at " + pickupTime : ""}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Drop-off Date</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${dropOff.toDateString()}${returnTime ? " at " + returnTime : ""}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Duration</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${totalDays} day${totalDays > 1 ? "s" : ""}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Driver</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${addDriver === true ? "Yes (included)" : "No"}</td>
            </tr>
          </table>

          <div style="background: #fffbeb; border: 1px solid #f39317; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px; color: #92400e; font-size: 15px;">Cost Breakdown</h3>
            <table style="width: 100%; font-size: 14px; color: #374151;">
              <tr>
                <td style="padding: 4px 0;">Rental (₦${car.pricePerDay.toLocaleString()} × ${totalDays} day${totalDays > 1 ? "s" : ""})</td>
                <td style="text-align: right;">₦${rentalTotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">Service Fee</td>
                <td style="text-align: right;">₦${serviceFee.toLocaleString()}</td>
              </tr>
              ${driverTotal > 0
        ? `<tr>
                <td style="padding: 4px 0;">Driver Fee (₦10,000 × ${totalDays} day${totalDays > 1 ? "s" : ""})</td>
                <td style="text-align: right;">₦${driverTotal.toLocaleString()}</td>
              </tr>`
        : ""
      }
              <tr style="border-top: 1px solid #f39317; margin-top: 8px;">
                <td style="padding: 10px 0 4px; font-weight: 700; font-size: 15px;">Grand Total</td>
                <td style="padding: 10px 0 4px; text-align: right; font-weight: 700; font-size: 15px; color: #f39317;">₦${grandTotal.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            <strong>Payment Reference:</strong> ${reference}<br/>
            <strong>Booking Status:</strong> Pending
          </p>

          <p style="font-size: 14px; color: #374151;">
            If you have any questions, please contact our support team. We look forward to serving you!
          </p>
          <p style="font-size: 14px; color: #374151;">Safe travels,<br/><strong>The Miles Team</strong></p>
        </div>
        <div style="background: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} Miles Car Rental. All rights reserved.
        </div>
      </div>
    `;

    // Fire-and-forget — don't block the response on email delivery
    sendEmail({
      to: user.email,
      toName: userName,
      subject: `Your Booking is Confirmed – ${car.brand} ${car.modelName} | Ref: ${reference}`,
      htmlContent,
      textContent: `Hi ${userName}, your booking for ${car.brand} ${car.modelName} from ${pickUp.toDateString()} to ${dropOff.toDateString()} has been created. Grand Total: ₦${grandTotal.toLocaleString()}. Reference: ${reference}.`,
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
