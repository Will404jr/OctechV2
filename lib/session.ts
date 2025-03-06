// lib/session.ts
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
  role?: string;
  branchId?: string;
  counterId?: string;
  department?: string;
  permissions?: Record<string, boolean>;
  roomId?: string;
  hallDisplayUsername?: string;
  expiresAt: number; // This will store the expiration timestamp
  destroy: () => Promise<void>;
  save: () => Promise<void>;
}

const sessionOptions = {
  password:
    process.env.SESSION_PASSWORD ||
    "complex_password_at_least_32_characters_long",
  cookieName: "auth-session",
  cookieOptions: {
    secure: false,
    httpOnly: true,
  },
};

function getEndOfDay(): number {
  const now = new Date();
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0
  );
  return endOfDay.getTime();
}

export async function getSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    session.isLoggedIn = false;
  }

  // Check if the session has expired
  if (!session.expiresAt || Date.now() > session.expiresAt) {
    await session.destroy();
    session.isLoggedIn = false;
    session.expiresAt = getEndOfDay();
  }

  return session;
}

export async function createSession(sessionData: Partial<SessionData>) {
  const session = await getSession();
  Object.assign(session, sessionData);
  session.isLoggedIn = true;
  session.expiresAt = getEndOfDay();
  await session.save();
  return session;
}
