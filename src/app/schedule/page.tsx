"use client";
import Shell from "@/components/Shell";
import WeekGrid from "@/components/WeekGrid";
import { useApp } from "@/lib/store";
import { useState, useEffect } from "react";
import { formatTime } from "@/lib/utils";

interface EventItem {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  temp?: boolean;
}

export default function SchedulePage() {
  const { schedule, addSchedule } = useApp();
  const [view, setView] = useState<"day" | "week">("week");
  const [connected, setConnected] = useState(false);
  const [calendars, setCalendars] = useState<{id: string, title: string, primary: boolean}[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState("primary");
  const [googleEvents, setGoogleEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if connected on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === '1') {
      setConnected(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', '/schedule');
    }
    
    // Show error if config is missing
    if (urlParams.get('error') === 'config_missing') {
      alert('Google Calendar integration not configured. Please set up environment variables.');
      window.history.replaceState({}, '', '/schedule');
    }
    
    // Check if already connected by trying to fetch calendars
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch('/api/gcal/calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars);
        setConnected(true);
        // Load events for the primary calendar
        loadGoogleEvents();
      }
    } catch (error) {
      // Not connected, which is fine
    }
  }

  // Reload events when week changes
  useEffect(() => {
    if (connected) {
      loadGoogleEvents();
    }
  }, [currentWeekOffset, selectedCalendar]);

  async function loadGoogleEvents() {
    setLoading(true);
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + (currentWeekOffset * 7)); // Start on Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End on Sunday
      
      const timeMin = weekStart.toISOString();
      const timeMax = weekEnd.toISOString();
      
      const res = await fetch(`/api/gcal/events?calendarId=${selectedCalendar}&timeMin=${timeMin}&timeMax=${timeMax}`);
      if (res.ok) {
        const data = await res.json();
        const events = data.events.map((e: any) => ({
          id: e.googleEventId,
          title: e.title,
          start: new Date(e.start),
          end: new Date(e.end),
          temp: false
        }));
        setGoogleEvents(events);
      }
    } catch (error) {
      console.error('Failed to load Google events:', error);
    } finally {
      setLoading(false);
    }
  }

  function getCurrentWeekRange() {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + (currentWeekOffset * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return {
      start: weekStart,
      end: weekEnd,
      isCurrentWeek: currentWeekOffset === 0
    };
  }

  function navigateWeek(direction: 'prev' | 'next') {
    setCurrentWeekOffset(prev => direction === 'next' ? prev + 1 : prev - 1);
  }

  // Combine local and Google events
  const localEvents: EventItem[] = schedule.map(item => ({
    id: item.id,
    title: item.title,
    start: new Date(item.start),
    end: new Date(item.end),
    temp: false
  }));

  const events: EventItem[] = [...localEvents, ...googleEvents];

  async function createEvent(event: EventItem): Promise<void> {
    if (connected) {
      // Create in Google Calendar directly
      try {
        setLoading(true);
        const res = await fetch("/api/gcal/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId: selectedCalendar,
            title: event.title,
            startISO: event.start.toISOString(),
            endISO: event.end.toISOString(),
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          // Immediately add to the display
          setGoogleEvents(prev => [...prev, {
            id: data.googleEventId,
            title: data.title,
            start: new Date(data.start),
            end: new Date(data.end),
            temp: false
          }]);
        } else {
          throw new Error('Failed to create Google Calendar event');
        }
      } catch (error) {
        console.error('Failed to create Google Calendar event:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create Google Calendar event');
        // Fall back to local storage
        addSchedule({
          id: event.id || crypto.randomUUID(),
          type: "focus",
          title: event.title,
          start: event.start.toISOString(),
          end: event.end.toISOString()
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Add to local state only
      addSchedule({
        id: event.id || crypto.randomUUID(),
        type: "focus",
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString()
      });
    }
  }

  async function addQuickBlock() {
    const start = new Date(); 
    // Round to next 15 minute interval
    const minutes = start.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    start.setMinutes(roundedMinutes, 0, 0);
    
    const end = new Date(start.getTime() + 25 * 60 * 1000); // 25 minutes
    
    await createEvent({
      id: crypto.randomUUID(),
      title: "Focus Session",
      start,
      end,
      temp: false
    });
  }

  const weekRange = getCurrentWeekRange();

  return (
    <Shell>
      {/* Header with week navigation */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-fuchsia-100/50 px-1 py-1">
              <button 
                onClick={() => navigateWeek('prev')}
                className="p-2.5 hover:bg-fuchsia-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center px-6 py-1">
                <div className="text-sm font-semibold text-gray-900">
                  {weekRange.start.toLocaleDateString('en', { month: 'long', day: 'numeric' })} - {weekRange.end.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                {weekRange.isCurrentWeek && (
                  <div className="text-xs text-fuchsia-600 font-medium">This Week</div>
                )}
              </div>
              
              <button 
                onClick={() => navigateWeek('next')}
                className="p-2.5 hover:bg-fuchsia-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {!weekRange.isCurrentWeek && (
              <button 
                onClick={() => setCurrentWeekOffset(0)}
                className="px-3 py-1.5 bg-fuchsia-100 text-fuchsia-700 rounded-lg text-sm font-medium hover:bg-fuchsia-200 transition-colors"
              >
                Today
              </button>
            )}
          </div>
          
          <button 
            onClick={addQuickBlock} 
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : '+ Focus (25min)'}
          </button>
        </div>
      </div>

      {/* Google Calendar Integration Status */}
      {!connected ? (
        <div className="bg-white/80 backdrop-blur rounded-xl border border-fuchsia-100/50 p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-fuchsia-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-fuchsia-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Google Calendar</div>
                <div className="text-xs text-gray-500">Not connected</div>
              </div>
            </div>
            <button 
              onClick={() => {
                window.location.href = '/api/gcal/auth/start';
              }}
              className="px-4 py-2 bg-fuchsia-500 text-white rounded-xl text-sm font-medium hover:bg-fuchsia-600 transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur rounded-xl border border-fuchsia-100/50 p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900">Google Calendar</div>
                <div className="text-xs text-gray-500">{googleEvents.length} events this week</div>
              </div>
              {calendars.length > 1 && (
                <select 
                  value={selectedCalendar} 
                  onChange={(e) => {
                    setSelectedCalendar(e.target.value);
                  }}
                  className="text-sm bg-fuchsia-50 border border-fuchsia-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-300 max-w-[140px] flex-shrink-0"
                >
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>
                      {cal.title.length > 10 ? cal.title.substring(0, 10) + '...' : cal.title} {cal.primary ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button 
              onClick={loadGoogleEvents}
              disabled={loading}
              className="px-4 py-2 bg-fuchsia-50 text-fuchsia-700 rounded-lg text-sm font-medium hover:bg-fuchsia-100 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </span>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </div>
      )}

      <div className="h-[650px] rounded-xl overflow-hidden">
        <WeekGrid 
          events={events} 
          onCreate={createEvent} 
          weekOffset={currentWeekOffset}
          onEventClick={(event) => {
            setSelectedEvent(event);
            setShowEventModal(true);
          }}
        />
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold bg-gradient-to-r from-fuchsia-600 to-rose-600 bg-clip-text text-transparent">
                Event Details
              </h3>
              <button 
                onClick={() => setShowEventModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                <div className="text-base font-semibold text-gray-900 bg-gray-50 rounded-xl p-3">
                  {selectedEvent.title}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time</label>
                  <div className="text-sm text-gray-900 bg-gray-50 rounded-xl p-3">
                    {selectedEvent.start.toLocaleDateString('en', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    <br />
                    {selectedEvent.start.toLocaleTimeString('en', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">End Time</label>
                  <div className="text-sm text-gray-900 bg-gray-50 rounded-xl p-3">
                    {selectedEvent.end.toLocaleDateString('en', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    <br />
                    {selectedEvent.end.toLocaleTimeString('en', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Duration</label>
                <div className="text-sm text-gray-900 bg-gray-50 rounded-xl p-3">
                  {Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / (1000 * 60))} minutes
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Source</label>
                <div className="text-sm text-gray-900 bg-gray-50 rounded-xl p-3">
                  {selectedEvent.temp ? 'Local Event' : 'Google Calendar'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {!selectedEvent.temp && (
                <button 
                  onClick={() => {
                    // Use the correct Google Calendar URL format
                    window.open(`https://calendar.google.com/calendar/u/0/r/eventedit/${selectedEvent.id}`, '_blank');
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-fuchsia-400/80 to-rose-400/80 text-white rounded-xl text-sm font-medium hover:from-fuchsia-500/90 hover:to-rose-500/90 transition-all shadow-sm"
                >
                  Edit in Google Calendar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}