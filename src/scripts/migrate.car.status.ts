import mongoose from "mongoose";
import { env } from "../config/keys.js";
import logger from "../config/logger.js";

const migrateCars = async () => {
  try {
    // Connect to the server
    await mongoose.connect(env.DATABASE_URL);

    // Switch to your specific database (Replace 'miles_db' with your actual DB name)
    const db = mongoose.connection.useDb("Miles_Car_Rental");

    logger.info("Accessing Miles_Car_Rental database...");

    // Access the 'cars' collection inside that database
    const result = await db
      .collection("car")
      .updateMany({}, { $set: { status: "available" } });

    logger.info(
      `Success! Updated ${result.modifiedCount} cars in the miles_db database.`,
    );
    process.exit(0);
  } catch (error) {
    logger.error("Migration failed:");
    process.exit(1);
  }
};

migrateCars();