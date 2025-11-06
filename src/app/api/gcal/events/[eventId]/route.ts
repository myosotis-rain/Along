import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, calendarClient } from "@/lib/google";
import { loadTokensForUser } from "@/lib/db";

function getUserIdFromHeaders(req: NextRequest): string {
  return req.headers.get("x-user-id") || "user-demo";
}

interface RouteParams {
  params: Promise<{
    eventId: string;
  }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = getUserIdFromHeaders(req);
    const { eventId } = await params;
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED" 
      }, { status: 401 });
    }

    if (!eventId) {
      return NextResponse.json({ 
        error: "Event ID required",
        code: "VALIDATION_ERROR" 
      }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId") || "primary";

    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const cal = calendarClient(auth);

    // Enhanced error handling for Google API
    try {
      await cal.events.delete({
        calendarId,
        eventId
      });

      return NextResponse.json({ 
        success: true,
        eventId,
        calendarId 
      });
    } catch (googleError: unknown) {
      const error = googleError as { code?: number; message?: string };
      console.error("Google API deletion error:", error);
      
      if (error.code === 404) {
        return NextResponse.json({ 
          error: "Event not found",
          code: "NOT_FOUND" 
        }, { status: 404 });
      }
      
      if (error.code === 403) {
        return NextResponse.json({ 
          error: "Access denied for calendar event",
          code: "ACCESS_DENIED" 
        }, { status: 403 });
      }
      
      throw googleError;
    }
  } catch (error) {
    console.error("Event deletion error:", error);
    return NextResponse.json({ 
      error: "Failed to delete calendar event",
      code: "DELETE_ERROR" 
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = getUserIdFromHeaders(req);
    const { eventId } = await params;
    
    const tokens = await loadTokensForUser(userId);
    if (!tokens) {
      return NextResponse.json({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED" 
      }, { status: 401 });
    }

    const body = await req.json();
    const { title, startISO, endISO, description, location } = body;
    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId") || "primary";

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

    const auth = getOAuthClient();
    auth.setCredentials(tokens);
    const cal = calendarClient(auth);

    try {
      const { data } = await cal.events.update({
        calendarId,
        eventId,
        requestBody: {
          summary: title.trim(),
          description: description?.trim() || undefined,
          location: location?.trim() || undefined,
          start: { 
            dateTime: startISO, 
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
          },
          end: { 
            dateTime: endISO, 
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
          }
        }
      });

      return NextResponse.json({ 
        googleEventId: data.id,
        title: data.summary,
        start: data.start?.dateTime,
        end: data.end?.dateTime,
        description: data.description,
        location: data.location
      });
    } catch (googleError: unknown) {
      const error = googleError as { code?: number; message?: string };
      console.error("Google API update error:", error);
      
      if (error.code === 404) {
        return NextResponse.json({ 
          error: "Event not found",
          code: "NOT_FOUND" 
        }, { status: 404 });
      }
      
      throw googleError;
    }
  } catch (error) {
    console.error("Event update error:", error);
    return NextResponse.json({ 
      error: "Failed to update calendar event",
      code: "UPDATE_ERROR" 
    }, { status: 500 });
  }
}