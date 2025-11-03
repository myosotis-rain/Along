import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, CALENDAR_SCOPES } from "@/lib/google";

export async function GET(req: NextRequest) {
  try {
    const oauth2Client = getOAuthClient();
    
    // In production, you'd sign a JWT with the user's ID
    // For now, we'll use a simple state parameter
    const state = "user-demo"; // Replace with actual user ID from session
    
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