
import app from "./app";
import connectDB from "./config/database";
import { env } from "./config/env";

const startServer = async (): Promise<void> => {
  try {
    // Connect database first
    await connectDB();

    // Start Express server
    app.listen(env.PORT, () => {
      console.log("--------------------------------");
      console.log("ERP Backend Started");
      console.log(`Port: ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`URL: http://localhost:${env.PORT}`);
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
