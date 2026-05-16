import { connectDb } from "../config/db";
import { UserModel } from "../models";
import { hashPassword } from "../utils/password";

const DEFAULT_EMAIL = "admin@gmail.com";
const DEFAULT_PASSWORD = "qweasd123";
const DEFAULT_NAME = "Admin";

const run = async () => {
  const email = (process.argv[2] || DEFAULT_EMAIL).toLowerCase().trim();
  const password = process.argv[3] || DEFAULT_PASSWORD;
  const name = (process.argv[4] || DEFAULT_NAME).trim();

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  await connectDb();

  const passwordHash = await hashPassword(password);

  await UserModel.updateOne(
    { email },
    {
      $set: {
        name,
        passwordHash,
        role: "admin",
        status: "active",
      },
      $setOnInsert: {
        phone: null,
        profileImageKey: null,
      },
    },
    { upsert: true }
  );

  const admin = await UserModel.findOne({ email }).select("email role status name").lean();
  // eslint-disable-next-line no-console
  console.log("Admin account ready:", admin);
};

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to seed admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
