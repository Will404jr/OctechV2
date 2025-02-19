//api/session/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json(session);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json();

  if (body.branchId) {
    session.branchId = body.branchId;
    session.isLoggedIn = true;
  }

  if (body.hallDisplayUsername) {
    session.hallDisplayUsername = body.hallDisplayUsername;
  }

  if (body.roomId) {
    session.roomId = body.roomId;
  }

  await session.save();

  return NextResponse.json(session);
}
