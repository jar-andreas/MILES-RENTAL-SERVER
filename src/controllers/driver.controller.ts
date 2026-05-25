import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { Request, Response } from "express";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import Driver from "../models/driver.model.js";
import Booking from "../models/booking.model.js";

export const createDriver = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const {
      fullName,
      email,
      phoneNumber,
      licenseNumber,
      expiryDate,
      languages,
      status,
      trips,
      rating,
      baseCity,
      yearsOfExperience,
      isVerified,
    } = req.body;

    const [emailExists, licenseExists, phoneExists] = await Promise.all([
      Driver.findOne({ email }),
      Driver.findOne({ licenseNumber }),
      Driver.findOne({ phoneNumber }),
    ]);

    if (emailExists || licenseExists || phoneExists) {
      return sendTsRestError(res, 400, "Driver already exists");
    }

    // 2. Create driver
    const driver = await Driver.create({
      fullName,
      email,
      phoneNumber,
      licenseNumber,
      expiryDate,
      languages,
      status,
      baseCity,
      yearsOfExperience,
      isVerified,
      rating,
      trips,
    });

    // 3. Return created driver
    return sendTsRestSuccess(res, 201, {
      success: true,
      message: "Driver created successfully",
      driver,
    });
  },
);

export const getAllDrivers = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const drivers = await Driver.find();
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Drivers retrieved successfully",
      drivers,
    });
  },
);

export const getDriverById = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const driver = await Driver.findById(id);
    if (!driver) {
      return sendTsRestError(res, 404, "Driver not found");
    }
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Driver retrieved successfully",
      driver,
    });
  },
);

export const updateDriver = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;
    const driver = await Driver.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!driver) {
      return sendTsRestError(res, 404, "Driver not found");
    }
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Driver updated successfully",
      driver,
    });
  },
);

export const deleteDriver = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const driver = await Driver.findByIdAndDelete(id);
    if (!driver) {
      return sendTsRestError(res, 404, "Driver not found");
    }
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Driver deleted successfully",
      driver,
    });
  },
);

export const getAllDriver = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const query = (req.query.query as string | undefined) || "";
    const status = req.query.status as string | undefined;

    if (page < 1 || limit < 1) {
      return sendTsRestError(
        res,
        400,
        "Page and limit parameters must be positive integers",
      );
    }

    const skipOffset = (page - 1) * limit;

    // Build MongoDB matchStage (Flow Step 2 & 3)
    const matchStage: Record<string, any> = {};

    if (query.trim() !== "") {
      const sanitizeQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const searchRegex = { $regex: sanitizeQuery, $options: "i" };
      matchStage.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
        { licenseNumber: searchRegex },
      ];
    }

    if (status && status?.trim() !== "") {
      matchStage.status = {
        $regex: `^${status.trim()}$`,
        $options: "i",
      };
    }
    const driver = await Driver.find(matchStage)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skipOffset)
      .lean();

    const total = await Driver.countDocuments(matchStage);

    const availableDrivers = await Driver.countDocuments({
      status: "available",
    });
    const onTripDrivers = await Driver.countDocuments({ status: "on-trip" });
    const offDutyDrivers = await Driver.countDocuments({ status: "off-duty" });
    const inactiveDrivers = await Driver.countDocuments({ status: "inactive" });

    return sendTsRestSuccess(res as any, 200, {
      success: true,
      message: "Drivers found",
      body: {
        driver,
        availableDrivers: availableDrivers,
        onTripDrivers: onTripDrivers,
        offDutyDrivers: offDutyDrivers,
        inactiveDrivers: inactiveDrivers,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)) || 1,
          hasMore: skipOffset + driver.length < total,
        },
      },
    });
  },
);

export const getSingleDriver = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { driverId } = req.params;

    // 1. Find driver by ID and populate the linked booking (if any)
    const driver = await Driver.findById(driverId)
      .populate({
        path: "booking",
        select:
          "pickupLocation returnLocation pickupDate returnDate bookingStatus totalPrice",
      })
      .lean();

    // 2. Guard: driver must exist
    if (!driver) {
      return sendTsRestError(res, 404, "Driver not found");
    }

    // 3. Return the driver record
    return sendTsRestSuccess(res as any, 200, {
      success: true,
      message: "Driver retrieved successfully",
      driver,
    });
  },
);

export const assignDriver = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { bookingId, driverId } = req.body;

    if (!bookingId || !driverId) {
      return sendTsRestError(
        res,
        400,
        "Both bookingId and driverId are required in the request body",
      );
    }

    // 2. Fetch both records in parallel to minimize DB round-trips
    const [booking, driver] = await Promise.all([
      Booking.findById(bookingId),
      Driver.findById(driverId),
    ]);

    if (!driver) return sendTsRestError(res, 404, "Driver not found");

    // check if booking requested for driver option
    if (!booking.driverOption) {
      return sendTsRestError(
        res,
        400,
        "This booking does not require a driver",
      );
    }
    if (!driver.isVerified) {
      return sendTsRestError(res, 400, "Driver is not verified");
    }

    if (driver.status === "off-duty") {
      return sendTsRestError(res, 400, "Driver is off-duty");
    }

    // prevent assigning unavailable driver
    if (driver.status !== "available") {
      return sendTsRestError(res, 400, "Driver is not available");
    }

    // prevent assigning driver twice
    if (driver.booking) {
      return sendTsRestError(res, 400, "Driver already assigned to a booking");
    }

    if (!booking) return sendTsRestError(res, 404, "Booking not found");
    // 4. Prevent re-assigning if a driver is already attached to this booking
    if (booking.driver) {
      return sendTsRestError(
        res,
        400,
        "This booking already has a driver assigned",
      );
    }
    if (
      booking.bookingStatus === "Completed" ||
      booking.bookingStatus === "Cancelled"
    ) {
      return sendTsRestError(
        res,
        400,
        "Cannot assign driver to a completed or cancelled booking",
      );
    }

    // assign booking to driver
    driver.booking = booking._id;

    // driver status should still remain available for instance if this booking is scheduled for next Tuesday, you just marked that driver as unavailable for the next 4 days!
    driver.status = "available";

    //link the driver to the Booking
    booking.driver = driver._id;

    // update booking status
    booking.bookingStatus = "Confirmed";

    // save changes
    await Promise.all([booking.save(), driver.save()]);

    // populate booking details inside driver
    await Promise.all([driver.populate("booking"), booking.populate("driver")]);

    return sendTsRestSuccess(res, 200, {
      message: "Driver assigned successfully",
      body: {
        booking,
      },
    });
  },
);
