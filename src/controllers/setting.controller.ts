import User from "../models/user.model.js";
import { Request, Response } from "express";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import bcrypt from "bcrypt";

export const updateAdmin = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const adminId = req.session?.userId;

    if (!adminId) {
      return sendTsRestError(res, 401, "Not authenticated");
    }

    const { firstName, lastName, email, password, phone } = req.body;

    const admin = await User.findById(adminId);

    if (!admin) {
      return sendTsRestError(res, 404, "Admin not found");
    }

    if (admin.role !== "admin") {
      return sendTsRestError(res, 403, "User is not an admin");
    }

    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();

    return sendTsRestSuccess(res, 200, {
      message: "Admin updated successfully",
      data: admin,
    });
  },
);

export const deleteAdmin = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const adminId = req.session?.userId;

    if (!adminId) {
      return sendTsRestError(res, 401, "Not authenticated");
    }

    const admin = await User.findById({ adminId });

    if (!admin) {
      return sendTsRestError(res, 404, "Admin not found");
    }

    if (admin.role !== "admin") {
      return sendTsRestError(res, 403, "User is not an admin");
    }

    await admin.deleteOne();

    req.session.destroy(() => {});

    return sendTsRestSuccess(res, 200, "Admin deleted successfully");
  },
);
