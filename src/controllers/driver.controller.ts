import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { Request, Response } from "express";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import Driver from "../models/driver.model.js";

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
