import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/google";

function getUserIdFromHeaders(req: NextRequest): string {
  return req.headers.get("x-user-id") || "user-demo";
}

export async function GET(req: NextRequest) {
  const oauth2Client = getOAuthClient();

  // Use the standard callback URL that's registered in Google OAuth
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  oauth2Client.setCredentials({});
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    state: getUserIdFromHeaders(req) + '|onboarding', // Add onboarding flag to state
    prompt: 'consent' // Force consent to get refresh token
  });

  return NextResponse.redirect(authUrl);
}