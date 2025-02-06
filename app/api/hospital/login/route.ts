import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Staff, HospitalSettings } from "@/lib/models/hospital";
import { getSession } from "@/lib/session";

interface LoginRequestBody {
  email: string;
  password: string;
  isAdminLogin?: boolean;
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, password, isAdminLogin }: LoginRequestBody =
      await request.json();

    const session = await getSession();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (isAdminLogin) {
      // Admin login logic
      const settings = await HospitalSettings.findOne();
      // console.log("Admin login attempt:", {
      //   email,
      //   settingsEmail: settings?.email,
      // });

      if (!settings) {
        console.log("Settings not found");
        return NextResponse.json(
          { error: "Invalid admin credentials" },
          { status: 401 }
        );
      }

      // console.log("Stored hashed password:", settings.password);
      // console.log("Provided password:", password);
      const isValidPassword = await settings.compareAdminPassword(password);
      // console.log(
      //   "Password validation result:",
      //   isValidPassword,
      //   "using compareAdminPassword method"
      // );

      if (settings.email !== email || !isValidPassword) {
        console.log("Admin authentication failed");
        return NextResponse.json(
          { error: "Invalid admin credentials" },
          { status: 401 }
        );
      }

      session.userId = "admin";
      session.isLoggedIn = true;
      session.role = "admin";
      session.permissions = {
        Staff: true,
        Roles: true,
        // Receptionist: true,
        // Serving: true,
        Queues: true,
        UpcomingEvents: true,
        Ads: true,
        Settings: true,
      };
      session.expiresAt = Date.now() + expirationTime;
      await session.save();

      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // Regular staff login logic
      const staffMember = await Staff.findOne({ email }).populate("role");
      if (!staffMember) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const isValidPassword = await staffMember.comparePassword(password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      session.userId = staffMember._id.toString();
      session.department = staffMember.department;
      session.isLoggedIn = true;
      session.role = staffMember.role.name;
      session.permissions = staffMember.role.permissions;
      session.expiresAt = Date.now() + expirationTime;
      await session.save();

      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
