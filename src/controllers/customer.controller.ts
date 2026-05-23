import { Request, Response, NextFunction } from "express";
import User from "../models/user.model.js";
import { sendTsRestSuccess, sendTsRestError } from "../lib/responseHandler.js";

const PAGE_SIZE = 11;

// GET /api/v1/customers?page=1//
export const getAllCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    // run both queries in parallel for performance
    const [customers, total] = await Promise.all([
      User.find({ role: "client" })
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE),
      User.countDocuments({ role: "client" }),
    ]);

    if (!customers.length) {
      return sendTsRestError(res, 404, "No customers found");
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Customers fetched successfully",
      body: customers,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        pageSize: PAGE_SIZE,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    next(error);
  }
};