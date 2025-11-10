import { NextRequest, NextResponse } from "next/server";
import { removeTokensForUser } from "@/lib/db";

function getUserIdFromHeaders(req: NextRequest): string {
  return req.headers.get("x-user-id") || "user-demo";
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(req);
    await removeTokensForUser(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect calendar:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
