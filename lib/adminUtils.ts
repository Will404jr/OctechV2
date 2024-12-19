import { Settings } from "./models/hospital";
import dbConnect from "./db";
import bcrypt from "bcryptjs";

export async function resetAdminPassword(newPassword: string) {
  await dbConnect();

  const settings = await Settings.findOne();
  if (!settings) {
    throw new Error("Settings not found");
  }

  settings.password = await bcrypt.hash(newPassword, 10);
  await settings.save();

  console.log("Admin password has been reset");
}
