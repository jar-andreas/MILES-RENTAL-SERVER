import cron from "node-cron";
import Booking from "../models/booking.model.js";
import Car from "../models/car.model.js";
import Payment from "../models/payment.model.js";
import logger from "../config/logger.js";

let isRunning = false;

export const startCleanupPendingBookingsJob = (): void => {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    if (isRunning) {
      logger.warn("Booking cleanup job already running, skipping...");
      return;
    }

    isRunning = true;

    try {
      logger.info("Starting cleanup of expired pending bookings...");

      const now = new Date();
      // Define "expired" as pending and older than 24 hours
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const expiredBookings = await Booking.find({
        bookingStatus: "Pending",
        createdAt: { $lt: twentyFourHoursAgo },
      }).lean();

      let cancelledCount = 0;

      for (const booking of expiredBookings) {
        const payment = await Payment.findOne({
          bookingId: booking._id,
        }).lean();

        // If both booking and payment are still pending after 24 hrs
        if (payment && payment.status === "pending") {
          await Promise.all([
            Booking.findByIdAndUpdate(booking._id, {
              $set: { bookingStatus: "Cancelled" },
            }),
            Payment.findByIdAndUpdate(payment._id, {
              $set: { status: "failed" },
            }),
          ]);
          cancelledCount++;
        }
      }

      if (cancelledCount > 0) {
        logger.info(
          `Cleanup complete: Cancelled ${cancelledCount} expired pending bookings and payments.`,
        );
      }

      // --- Job 2: Release cars whose dropOffDate has passed ---
      const expiredActiveBookings = await Booking.find({
        bookingStatus: { $in: ["Confirmed", "Ongoing"] },
        returnDate: { $lt: now },
      }).lean();

      if (expiredActiveBookings.length > 0) {
        const carIds = expiredActiveBookings.map((b) => b.car);
        await Car.updateMany(
          { _id: { $in: carIds } },
          { $set: { status: "available" } },
        );
        logger.info(
          `Car release: Freed ${expiredActiveBookings.length} car(s) with expired dropOffDate.`,
        );
      }

      // --- Job 3: Release cars tied to cancelled or completed bookings ---
      const closedBookings = await Booking.find({
        bookingStatus: { $in: ["Cancelled", "Completed"] },
        car: { $exists: true },
      }).lean();

      if (closedBookings.length > 0) {
        const closedCarIds = closedBookings.map((b) => b.car);
        // Only update cars that are still marked as booked
        const updatedCars = await Car.updateMany(
          { _id: { $in: closedCarIds }, status: "booked" },
          { $set: { status: "available" } },
        );
        if (updatedCars.modifiedCount > 0) {
          logger.info(
            `Car release: Freed ${updatedCars.modifiedCount} car(s) from cancelled/completed bookings.`,
          );
        }
      }
    } catch (error) {
      logger.error({ error }, "Booking cleanup job failed");
    } finally {
      isRunning = false;
    }
  });

  logger.info("Booking cleanup cron job scheduled (runs every hour)");
};