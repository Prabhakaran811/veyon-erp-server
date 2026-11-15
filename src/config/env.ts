
import dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
  "MONGODB_URI"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI as string,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173"
};
