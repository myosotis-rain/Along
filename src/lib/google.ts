import { google } from "googleapis";

function normalizeBaseUrl(url?: string) {
  if (!url) return undefined;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getOAuthClient(originOverride?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  }

  let redirectUri: string | undefined;
  const normalizedOrigin = normalizeBaseUrl(originOverride);

  if (normalizedOrigin) {
    redirectUri = `${normalizedOrigin}/api/gcal/callback`;
  } else if (process.env.GOOGLE_REDIRECT_URI) {
    redirectUri = process.env.GOOGLE_REDIRECT_URI;
  } else {
    const fallbackOrigin = normalizeBaseUrl(process.env.NEXTAUTH_URL) || "http://localhost:3000";
    redirectUri = `${fallbackOrigin}/api/gcal/callback`;
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

export function calendarClient(auth: InstanceType<typeof google.auth.OAuth2>) {
  return google.calendar({ version: "v3", auth });
}

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly"
];
