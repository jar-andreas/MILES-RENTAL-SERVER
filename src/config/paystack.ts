import axios from "axios"
import { env } from "./keys.js"
import logger from "./logger.js"

export const PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY;
export const PAYSTACK_BASE_URL = 'https://api.paystack.co'; 

let paystackClient : any = null;

export const getPaystackClient = () => {
  if (!paystackClient) {
    const secret =  PAYSTACK_SECRET_KEY;
    if (!secret) {
      logger.error("Paystack secret key is not defined. Please set PAYSTACK_SECRET_KEY in your .env file.");
      throw new Error("Paystack secret key is required");
    }
    logger.info("Initializing Paystack client...");
    paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  },
});

  }
  return paystackClient;
};