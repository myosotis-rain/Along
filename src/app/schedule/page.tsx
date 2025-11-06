"use client";
import Shell from "@/components/Shell";
import NativeCalendarView from "@/components/NativeCalendarView";
import NativeMobileCalendar from "@/components/NativeMobileCalendar";
import AppWrapper from "@/components/AppWrapper";
import { useApp } from "@/lib/store";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EventItem {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  temp?: boolean;
  color?: string;
  description?: string;
  location?: string;
}

interface ToastMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function SchedulePage() {
  const { schedule, addSchedule } = useApp();
  const [connected, setConnected] = useState(false);
  const [calendars, setCalendars] = useState<{id: string, title: string, primary: boolean}[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState("primary");
  const [googleEvents, setGoogleEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const loadGoogleEvents = useCallback(async (showLoader = true) => {
    if (showLoader) setSyncing(true);
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + (currentWeekOffset * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const timeMin = weekStart.toISOString();
      const timeMax = weekEnd.toISOString();
      
      const res = await fetch(`/api/gcal/events?calendarId=${selectedCalendar}&timeMin=${timeMin}&timeMax=${timeMax}`);
      if (res.ok) {
        const data = await res.json();
        const events = data.events.map((e: { googleEventId: string; title: string; start: string; end: string; location?: string; description?: string }) => ({
          id: e.googleEventId,
          title: e.title,
          start: new Date(e.start),
          end: new Date(e.end),
          location: e.location,
          description: e.description,
          temp: false
        }));
        setGoogleEvents(events);
        
        if (showLoader) {
          setToastMessage({
            type: 'success',
            title: 'Calendar Synced',
            message: `Loaded ${events.length} events from Google Calendar`
          });
        }
      } else {
        throw new Error('Failed to load events');
      }
    } catch (error) {
      console.error('Failed to load Google events:', error);
      if (showLoader) {
        setToastMessage({
          type: 'error',
          title: 'Sync Failed',
          message: 'Could not load events from Google Calendar'
        });
      }
    } finally {
      if (showLoader) setSyncing(false);
    }
  }, [currentWeekOffset, selectedCalendar]);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/gcal/calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars);
        setConnected(true);
        // Load events for the primary calendar
        loadGoogleEvents();
      }
    } catch {
      // Not connected, which is fine
    }
  }, [loadGoogleEvents]);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize(); // Check initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
      setToastMessage({
        type: 'error',
        title: 'Configuration Missing',
        message: 'Google Calendar integration not configured. Please contact support.'
      });
      window.history.replaceState({}, '', '/schedule');
    }
    
    // Check if already connected by trying to fetch calendars
    checkConnection();
  }, [checkConnection]);

  // Reload events when week changes
  useEffect(() => {
    if (connected) {
      loadGoogleEvents(false); // Don't show loading spinner for automatic refreshes
    }
  }, [currentWeekOffset, selectedCalendar, connected, loadGoogleEvents]);

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

  const createEvent = useCallback(async (event: EventItem): Promise<void> => {
    setLoading(true);
    try {
      if (connected) {
        const res = await fetch("/api/gcal/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId: selectedCalendar,
            title: event.title,
            startISO: event.start.toISOString(),
            endISO: event.end.toISOString(),
            description: event.description,
            location: event.location
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setGoogleEvents(prev => [...prev, {
            id: data.googleEventId,
            title: data.title,
            start: new Date(data.start),
            end: new Date(data.end),
            description: event.description,
            location: event.location,
            temp: false
          }]);
        } else {
          throw new Error('Failed to create Google Calendar event');
        }
      } else {
        addSchedule({
          id: event.id || crypto.randomUUID(),
          type: "focus",
          title: event.title,
          start: event.start.toISOString(),
          end: event.end.toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error; // Let the UI handle the error
    } finally {
      setLoading(false);
    }
  }, [connected, selectedCalendar, addSchedule]);


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
    <AppWrapper>
      <Shell>
        {/* Simple Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Schedule
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {weekRange.isCurrentWeek ? 'This week' : 
               `${Math.abs(currentWeekOffset)} week${Math.abs(currentWeekOffset) === 1 ? '' : 's'} ${currentWeekOffset > 0 ? 'ahead' : 'ago'}`}
            </p>
          </div>
          
          <button 
            onClick={addQuickBlock} 
            disabled={loading || syncing}
            className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Adding...' : '+ Focus'}
          </button>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-white/70 backdrop-blur rounded-lg border border-gray-200">
            <button 
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-50 rounded-l-lg transition-colors"
              aria-label="Previous week"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-center px-4 py-2">
              <div className="text-sm font-semibold text-gray-900">
                {weekRange.start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - {weekRange.end.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            
            <button 
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-50 rounded-r-lg transition-colors"
              aria-label="Next week"
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
      </div>

      {/* Google Calendar Status */}
      {!connected ? (
        <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 p-4 mb-4">
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
              onClick={() => window.location.href = '/api/gcal/auth/start'}
              className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700 transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 p-4 mb-4">
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
                  onChange={(e) => setSelectedCalendar(e.target.value)}
                  className="text-xs bg-fuchsia-50 border border-fuchsia-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-300 max-w-[120px] flex-shrink-0"
                >
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>
                      {cal.title.length > 8 ? cal.title.substring(0, 8) + '...' : cal.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button 
              onClick={() => loadGoogleEvents(true)}
              disabled={syncing}
              className="px-3 py-1.5 bg-fuchsia-50 text-fuchsia-700 rounded-lg text-xs font-medium hover:bg-fuchsia-100 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {syncing ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div className="mb-6">
        {isMobile ? (
          <NativeMobileCalendar
            events={events} 
            onCreate={createEvent}
            weekOffset={currentWeekOffset}
            loading={loading || syncing}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setShowEventModal(true);
            }}
          />
        ) : (
          <NativeCalendarView
            events={events} 
            onCreate={createEvent} 
            weekOffset={currentWeekOffset}
            loading={loading || syncing}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setShowEventModal(true);
            }}
          />
        )}
      </div>

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventModal && selectedEvent && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Event Details
                </h3>
                <button 
                  onClick={() => setShowEventModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                  <div className="font-semibold text-gray-900 bg-gray-50 rounded-lg p-3 text-sm">
                    {selectedEvent.title}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Start</label>
                    <div className="text-xs text-gray-900 bg-gray-50 rounded-lg p-2">
                      {selectedEvent.start.toLocaleDateString('en', { 
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
                    <label className="text-sm font-medium text-gray-700 mb-1 block">End</label>
                    <div className="text-xs text-gray-900 bg-gray-50 rounded-lg p-2">
                      {selectedEvent.end.toLocaleDateString('en', { 
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
                
                {selectedEvent.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
                    <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
                      {selectedEvent.location}
                    </div>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                    <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                      {selectedEvent.description}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Duration</label>
                  <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
                    {Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / (1000 * 60))} minutes
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                {!selectedEvent.temp && selectedEvent.id && (
                  <button 
                    onClick={() => {
                      window.open(`https://calendar.google.com/calendar/u/0/r/eventedit/${selectedEvent.id}`, '_blank');
                    }}
                    className="flex-1 px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700 transition-colors"
                  >
                    Edit in Google Calendar
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="fixed top-4 right-4 z-50 max-w-xs"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
          >
            <div className={`rounded-lg p-4 shadow-lg border ${
              toastMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : toastMessage.type === 'error' 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  toastMessage.type === 'success' 
                    ? 'bg-green-500' 
                    : toastMessage.type === 'error' 
                    ? 'bg-red-500' 
                    : 'bg-blue-500'
                }`}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    {toastMessage.type === 'success' ? (
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    ) : toastMessage.type === 'error' ? (
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    )}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{toastMessage.title}</div>
                  <div className="text-xs mt-0.5">{toastMessage.message}</div>
                </div>
                <button
                  onClick={() => setToastMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </Shell>
    </AppWrapper>
  );
}