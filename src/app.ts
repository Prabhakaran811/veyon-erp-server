
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";


import customerRoutes from "./routes/customer.routes";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/customers", customerRoutes);

// HTTP request logging
app.use(morgan("dev"));

// Health check API
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ERP Backend is running",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export default app;
