import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/google";
import { saveTokensForUser } from "@/lib/db";

export async function GET(req: NextRequest) {
  const oauth2Client = getOAuthClient();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Get the base URL for absolute redirects
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/schedule?error=access_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/schedule?error=no_code`);
  }

  try {
    // Get tokens from Google
    const { tokens } = await oauth2Client.getToken(code);
    
    // In production, decode the state to get the actual user ID
    const userId = state || "user-demo";

    // Save encrypted tokens
    await saveTokensForUser(userId, tokens);

    return NextResponse.redirect(`${baseUrl}/schedule?connected=1`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${baseUrl}/schedule?error=oauth_failed`);
  }
}