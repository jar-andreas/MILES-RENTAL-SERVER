import tryCatchWrapper from "src/lib/tryCatchWrapper.js";
import { Request, Response } from "express";
import { sendTsRestError, sendTsRestSuccess } from "src/lib/responseHandler.js";
import Driver from "src/models/driver.model.js";

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
