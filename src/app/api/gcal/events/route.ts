import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, calendarClient } from "@/lib/google";
import { loadTokensForUser } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userId = "user-demo";
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED" 
      }, { status: 401 });
    }

    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const cal = calendarClient(auth);

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId") || "primary";
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    // Enhanced error handling for Google API
    try {
      const { data } = await cal.events.list({
        calendarId,
        singleEvents: true,
        orderBy: "startTime",
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 1000*60*60*24*7).toISOString(),
        maxResults: 250 // Reasonable limit
      });

      const events = (data.items || []).map(e => ({
        googleEventId: e.id,
        title: e.summary || "Untitled Event",
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location || null,
        description: e.description || null,
        htmlLink: e.htmlLink || null,
        status: e.status || 'confirmed'
      })).filter(e => e.status === 'confirmed'); // Only confirmed events

      return NextResponse.json({ 
        events,
        count: events.length,
        calendarId 
      });
    } catch (googleError: unknown) {
      const error = googleError as { code?: number; message?: string };
      if (error.code === 403) {
        return NextResponse.json({ 
          error: "Calendar access denied",
          code: "ACCESS_DENIED" 
        }, { status: 403 });
      }
      throw googleError;
    }
  } catch (error) {
    console.error("Events list error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch calendar events",
      code: "FETCH_ERROR" 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = "user-demo";
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED" 
      }, { status: 401 });
    }

    const body = await req.json();
    const { calendarId = "primary", title, startISO, endISO, description, location } = body;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ 
        error: "Event title is required",
        code: "VALIDATION_ERROR" 
      }, { status: 400 });
    }

    if (!startISO || !endISO) {
      return NextResponse.json({ 
        error: "Start and end times are required",
        code: "VALIDATION_ERROR" 
      }, { status: 400 });
    }

    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    
    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: "End time must be after start time",
        code: "VALIDATION_ERROR" 
      }, { status: 400 });
    }

    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const cal = calendarClient(auth);

    const eventData = {
      summary: title.trim(),
      description: description?.trim() || undefined,
      location: location?.trim() || undefined,
      start: { dateTime: startISO, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: endISO, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      reminders: {
        useDefault: true
      }
    };

    const { data } = await cal.events.insert({
      calendarId,
      requestBody: eventData
    });

    return NextResponse.json({ 
      googleEventId: data.id,
      title: data.summary,
      start: data.start?.dateTime,
      end: data.end?.dateTime,
      description: data.description,
      location: data.location,
      htmlLink: data.htmlLink
    });
  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json({ 
      error: "Failed to create calendar event",
      code: "CREATE_ERROR" 
    }, { status: 500 });
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