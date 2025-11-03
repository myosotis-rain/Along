import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, calendarClient } from "@/lib/google";
import { loadTokensForUser } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userId = "user-demo";
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const cal = calendarClient(auth);

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId") || "primary";
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    const { data } = await cal.events.list({
      calendarId,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 1000*60*60*24*7).toISOString() // +7d
    });

    const events = (data.items || []).map(e => ({
      googleEventId: e.id,
      title: e.summary || "Untitled",
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || null,
      description: e.description || null
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Events list error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = "user-demo";
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { calendarId = "primary", title, startISO, endISO, description, location } = body;

    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const cal = calendarClient(auth);

    const { data } = await cal.events.insert({
      calendarId,
      requestBody: {
        summary: title,
        description,
        location,
        start: { dateTime: startISO },
        end: { dateTime: endISO }
      }
    });

    return NextResponse.json({ 
      googleEventId: data.id,
      title: data.summary,
      start: data.start?.dateTime,
      end: data.end?.dateTime
    });
  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = "user-demo";
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { calendarId = "primary", eventId, title, startISO, endISO, description, location } = body;

    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const cal = calendarClient(auth);

    const { data } = await cal.events.update({
      calendarId,
      eventId,
      requestBody: {
        summary: title,
        description,
        location,
        start: { dateTime: startISO },
        end: { dateTime: endISO }
      }
    });

    return NextResponse.json({ 
      googleEventId: data.id,
      title: data.summary,
      start: data.start?.dateTime,
      end: data.end?.dateTime
    });
  } catch (error) {
    console.error("Event update error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = "user-demo";
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId") || "primary";
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const cal = calendarClient(auth);

    await cal.events.delete({
      calendarId,
      eventId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Event deletion error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}