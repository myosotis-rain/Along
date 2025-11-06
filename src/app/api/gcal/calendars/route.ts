import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, calendarClient } from "@/lib/google";
import { loadTokensForUser } from "@/lib/db";

function getUserIdFromHeaders(req: NextRequest): string {
  return req.headers.get("x-user-id") || "user-demo";
}

export async function GET(req: NextRequest) {
  try {
    // In production, get user ID from session
    const userId = getUserIdFromHeaders(req);
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const auth = getOAuthClient();
    auth.setCredentials(tokens);

    const cal = calendarClient(auth);
    const { data } = await cal.calendarList.list();
    
    // Return simplified calendar list for picker
    const calendars = (data.items || []).map(c => ({ 
      id: c.id, 
      title: c.summary,
      primary: c.primary || false
    }));
    
    return NextResponse.json({ calendars });
  } catch (error) {
    console.error("Calendar list error:", error);
    return NextResponse.json({ error: "Failed to fetch calendars" }, { status: 500 });
  }
}