import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
  role?: string;
  permissions?: Record<string, boolean>;
}

const sessionOptions = {
  password:
    process.env.SESSION_PASSWORD ||
    "complex_password_at_least_32_characters_long",
  cookieName: "auth-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};

export async function getSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    session.isLoggedIn = false;
  }

  return session;
}
