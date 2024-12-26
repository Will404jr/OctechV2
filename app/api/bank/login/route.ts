import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/bank";
import { Settings } from "@/lib/models/hospital";
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

    if (isAdminLogin) {
      // Admin login logic
      const settings = await Settings.findOne();
      console.log("Admin login attempt:", {
        email,
        settingsEmail: settings?.email,
      });

      if (!settings) {
        console.log("Settings not found");
        return NextResponse.json(
          { error: "Invalid admin credentials" },
          { status: 401 }
        );
      }

      console.log("Stored hashed password:", settings.password);
      console.log("Provided password:", password);
      const isValidPassword = await settings.compareAdminPassword(password);
      console.log(
        "Password validation result:",
        isValidPassword,
        "using compareAdminPassword method"
      );

      if (settings.email !== email || !isValidPassword) {
        console.log("Admin authentication failed");
        return NextResponse.json(
          { error: "Invalid admin credentials" },
          { status: 401 }
        );
      }

      const session = await getSession();
      session.userId = "admin";
      session.isLoggedIn = true;
      session.role = "admin";
      session.permissions = {
        Branches: true,
        Users: true,
        Roles: true,
        Serving: true,
        Queues: true,
        ExchangeRates: true,
        Ads: true,
        Settings: true,
      };
      await session.save();

      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // Regular staff login logic
      const user = await User.findOne({ email }).populate("role");
      if (!user) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const session = await getSession();
      session.userId = user._id.toString();
      session.isLoggedIn = true;
      session.role = user.role.name;
      session.permissions = user.role.permissions;
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
