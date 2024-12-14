import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/bank";
import { Branch } from "@/lib/models/bank";
import { Admin } from "@/lib/models/admin";
import { getSession } from "@/lib/session";
import ActiveDirectory from "activedirectory2";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, password, username, isActiveDirectory } =
      await request.json();

    if (isActiveDirectory) {
      // Active Directory authentication
      const user = await User.findOne({ username }).populate("branch");
      if (!user || !user.branch) {
        return NextResponse.json(
          { error: "User not found or no branch assigned" },
          { status: 401 }
        );
      }

      const branch = user.branch;
      const config = {
        url: `ldap://${branch.localNetworkAddress}`,
        baseDN: branch.databaseName,
        username: branch.databaseUser,
        password: branch.databasePassword,
        tlsOptions: { rejectUnauthorized: false }, // Add this line to bypass SSL certificate verification
      };

      console.log("AD Config:", JSON.stringify(config, null, 2));

      const ad = new ActiveDirectory(config);

      return new Promise((resolve) => {
        ad.authenticate(username, password, async (err, auth) => {
          if (err) {
            console.error("AD Authentication error:", err);
            console.error("AD Error details:", JSON.stringify(err, null, 2));
            resolve(
              NextResponse.json(
                {
                  error: `Authentication failed: ${"Unknown error"}`,
                },
                { status: 401 }
              )
            );
          } else if (auth) {
            const session = await getSession();
            session.userId = user._id.toString();
            session.isLoggedIn = true;
            await session.save();
            resolve(NextResponse.json({ success: true }, { status: 200 }));
          } else {
            resolve(
              NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
              )
            );
          }
        });
      });
    } else {
      // Original email/password authentication
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const isValidPassword = await admin.comparePassword(password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const session = await getSession();
      session.userId = admin._id.toString();
      session.isLoggedIn = true;
      await session.save();

      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
