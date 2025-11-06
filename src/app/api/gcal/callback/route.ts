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
    const redirectUrl = state?.includes('onboarding') 
      ? `${baseUrl}/?onboarding=calendar&error=access_denied`
      : `${baseUrl}/schedule?error=access_denied`;
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = state?.includes('onboarding') 
      ? `${baseUrl}/?onboarding=calendar&error=no_code`
      : `${baseUrl}/schedule?error=no_code`;
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Get tokens from Google
    const { tokens } = await oauth2Client.getToken(code);
    
    // Parse state to get user ID and check if this is onboarding flow
    const stateData = state || "user-demo";
    const [userId, flow] = stateData.split('|');
    const isOnboarding = flow === 'onboarding';

    // Save encrypted tokens
    await saveTokensForUser(userId, {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
      token_type: tokens.token_type || undefined,
      scope: tokens.scope || undefined
    });

    // Redirect based on flow type
    if (isOnboarding) {
      return NextResponse.redirect(`${baseUrl}/?onboarding=calendar&connected=1`);
    } else {
      return NextResponse.redirect(`${baseUrl}/schedule?connected=1`);
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    const redirectUrl = state?.includes('onboarding') 
      ? `${baseUrl}/?onboarding=calendar&error=oauth_failed`
      : `${baseUrl}/schedule?error=oauth_failed`;
    return NextResponse.redirect(redirectUrl);
  }
}