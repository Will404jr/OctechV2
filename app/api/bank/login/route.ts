// api/bank/login/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/bank";
import { BankSettings } from "@/lib/models/bank";
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
      // Admin login logic (unchanged)
      const settings = await BankSettings.findOne();
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

      // const session = await getSession();
      session.userId = "admin";
      session.isLoggedIn = true;
      session.role = "admin";
      session.permissions = {
        Branches: true,
        Users: true,
        Roles: true,
        // Serving: true,
        Queues: true,
        ExchangeRates: true,
        Ads: true,
        Settings: true,
      };
      session.expiresAt = Date.now() + expirationTime;
      await session.save();

      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // Regular user login logic
      const user = await User.findOne({ email })
        .populate("role")
        .populate("branch");
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

      // const session = await getSession();
      session.userId = user._id.toString();
      session.isLoggedIn = true;
      session.role = user.role.name;
      session.permissions = user.role.permissions;
      session.branchId = user.branch ? user.branch._id.toString() : undefined;
      session.expiresAt = Date.now() + expirationTime;
      await session.save();

      return NextResponse.json(
        {
          success: true,
          user: {
            id: user._id,
            name: user.name,
            role: user.role.name,
            branchId: user.branch ? user.branch._id.toString() : undefined,
          },
        },
        { status: 200 }
      );
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
