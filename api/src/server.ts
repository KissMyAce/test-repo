import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { app } from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";

const start = async () => {
  try {
    await connectDb();

    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`API running on http://localhost:${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start API:", error);
    process.exit(1);
  }
};

void start();
