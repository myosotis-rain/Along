import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, CALENDAR_SCOPES } from "@/lib/google";

function getUserIdFromHeaders(req: NextRequest): string {
  return req.headers.get("x-user-id") || "user-demo";
}

export async function GET(req: NextRequest) {
  try {
    // Check if Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("Google Calendar integration not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
      const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
      return NextResponse.redirect(`${baseUrl}/schedule?error=config_missing`);
    }
    
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const oauth2Client = getOAuthClient(baseUrl);
    
    // In production, you'd sign a JWT with the user's ID
    // For now, we'll use a simple state parameter
    const state = getUserIdFromHeaders(req);
    
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // Ensures refresh token on first grant
      scope: CALENDAR_SCOPES,
      state
    });
    
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("OAuth start error:", error);
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    return NextResponse.redirect(`${baseUrl}/schedule?error=config_missing`);
  }
}
