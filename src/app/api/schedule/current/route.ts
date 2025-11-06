import { NextRequest, NextResponse } from "next/server";

interface GoogleCalendarEvent {
  googleEventId: string;
  title: string;
  start: string;
  end: string;
}

interface ProcessedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "meeting";
  day?: string;
}

interface FreeTimeSlot {
  start: string;
  end: string;
  duration: number;
}

export async function GET(req: NextRequest) {
  try {
    // Get current week range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const timeMin = today.toISOString();
    const timeMax = nextWeek.toISOString();
    
    // Fetch Google Calendar events
    let googleEvents: ProcessedEvent[] = [];
    try {
      const baseUrl = req.nextUrl.origin;
      const eventsResponse = await fetch(`${baseUrl}/api/gcal/events?calendarId=primary&timeMin=${timeMin}&timeMax=${timeMax}`, {
        headers: {
          'Cookie': req.headers.get('cookie') || ''
        }
      });
      
      if (eventsResponse.ok) {
        const eventsData: { events: GoogleCalendarEvent[] } = await eventsResponse.json();
        googleEvents = eventsData.events.map((e: GoogleCalendarEvent): ProcessedEvent => ({
          id: e.googleEventId,
          title: e.title,
          start: e.start,
          end: e.end,
          type: "meeting" as const
        }));
      }
    } catch {
      console.log('No Google Calendar access, using local events only');
    }
    
    // Filter for today and upcoming week
    const todayEvents = googleEvents.filter((event: ProcessedEvent) => {
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate < tomorrow;
    });
    
    const upcomingWeekEvents = googleEvents.filter((event: ProcessedEvent) => {
      const eventDate = new Date(event.start);
      return eventDate >= tomorrow && eventDate < nextWeek;
    }).map((event: ProcessedEvent) => ({
      ...event,
      day: new Date(event.start).toLocaleDateString('en', { weekday: 'short' })
    }));
    
    // Calculate free time slots for today
    const getFreeTimeSlots = (todaySchedule: ProcessedEvent[]): FreeTimeSlot[] => {
      const slots: FreeTimeSlot[] = [];
      const sortedToday = [...todaySchedule].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      
      // Check for free time between now and first event
      if (sortedToday.length > 0) {
        const firstEvent = new Date(sortedToday[0].start);
        const timeDiff = (firstEvent.getTime() - now.getTime()) / (1000 * 60);
        if (timeDiff > 30) {
          slots.push({
            start: now.toISOString(),
            end: sortedToday[0].start,
            duration: Math.floor(timeDiff)
          });
        }
      }
      
      // Check gaps between events
      for (let i = 0; i < sortedToday.length - 1; i++) {
        const currentEnd = new Date(sortedToday[i].end);
        const nextStart = new Date(sortedToday[i + 1].start);
        const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
        
        if (gapMinutes > 15) {
          slots.push({
            start: sortedToday[i].end,
            end: sortedToday[i + 1].start,
            duration: Math.floor(gapMinutes)
          });
        }
      }
      
      return slots;
    };
    
    const freeTimeSlots = getFreeTimeSlots(todayEvents);
    
    return NextResponse.json({
      todaySchedule: todayEvents,
      upcomingWeek: upcomingWeekEvents,
      freeTimeSlots,
      currentTime: now.toISOString(),
      nextCommitment: todayEvents.length > 0 ? todayEvents[0] : null
    });
    
  } catch (error) {
    console.error('Error fetching current schedule:', error);
    return NextResponse.json({
      todaySchedule: [],
      upcomingWeek: [],
      freeTimeSlots: [],
      currentTime: new Date().toISOString(),
      nextCommitment: null
    });
  }
}