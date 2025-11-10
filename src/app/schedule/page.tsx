"use client";
import Shell from "@/components/Shell";
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
  const { userProfile, updateUserProfile } = useApp();
  const [connected, setConnected] = useState(false);
  const [calendars, setCalendars] = useState<{id: string, title: string, primary: boolean}[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState("primary");
  const [googleEvents, setGoogleEvents] = useState<EventItem[]>([]);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [viewPeriod, setViewPeriod] = useState<'today' | 'week'>('week');

  const loadGoogleEvents = useCallback(async (showLoader = true) => {
    if (showLoader) setSyncing(true);
    try {
      const now = new Date();
      let timeMin, timeMax;
      
      if (viewPeriod === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        timeMin = startOfDay.toISOString();
        timeMax = endOfDay.toISOString();
      } else {
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        timeMin = weekStart.toISOString();
        timeMax = weekEnd.toISOString();
      }
      
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
            message: `Loaded ${events.length} events`
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
  }, [selectedCalendar, viewPeriod]);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/gcal/calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars);
        setConnected(true);
        loadGoogleEvents();
      }
    } catch {
      // Not connected, which is fine
    }
  }, [loadGoogleEvents]);

  const disconnectCalendar = useCallback(async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/gcal/auth/disconnect', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to disconnect');
      }
      updateUserProfile({ hasConnectedGoogleCalendar: false });
      setConnected(false);
      setGoogleEvents([]);
      setToastMessage({
        type: 'success',
        title: 'Disconnected',
        message: 'Google Calendar access has been disabled. Connect again anytime.'
      });
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      setToastMessage({
        type: 'error',
        title: 'Could not disconnect',
        message: 'Please try again or refresh the page.'
      });
    } finally {
      setDisconnecting(false);
    }
  }, [disconnecting, updateUserProfile]);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Check if connected when user has linked calendar
  useEffect(() => {
    if (!userProfile.hasConnectedGoogleCalendar) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === '1') {
      setConnected(true);
      window.history.replaceState({}, '', '/schedule');
    }
    
    if (urlParams.get('error') === 'config_missing') {
      setToastMessage({
        type: 'error',
        title: 'Configuration Missing',
        message: 'Google Calendar integration requires OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) to be configured in environment variables.'
      });
      window.history.replaceState({}, '', '/schedule');
    }
    
    checkConnection();
  }, [userProfile.hasConnectedGoogleCalendar, checkConnection]);

  // Reload events when view changes
  useEffect(() => {
    if (connected) {
      loadGoogleEvents(false);
    }
  }, [selectedCalendar, connected, loadGoogleEvents, viewPeriod]);

  // Helper functions for event formatting
  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // Group events by day
  const eventsByDay = googleEvents.reduce((acc, event) => {
    const dayKey = event.start.toDateString();
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(event);
    return acc;
  }, {} as Record<string, EventItem[]>);

  // Sort days and events
  const sortedDays = Object.keys(eventsByDay)
    .map(dayKey => new Date(dayKey))
    .sort((a, b) => a.getTime() - b.getTime());

  sortedDays.forEach(day => {
    eventsByDay[day.toDateString()].sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  return (
    <AppWrapper>
      <Shell>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Schedule
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Google Calendar Preview
              </p>
            </div>
            
            {connected && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewPeriod('today')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewPeriod === 'today' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setViewPeriod('week')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewPeriod === 'week' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        {!connected ? (
          <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-fuchsia-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-fuchsia-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Calendar Integration</h3>
            <p className="text-sm text-gray-500 mb-4">
              {toastMessage?.message?.includes('Configuration Missing') 
                ? 'Google Calendar integration requires OAuth credentials to be configured.' 
                : 'View your Google Calendar events in a clean, scrollable format'}
            </p>
            <button 
              onClick={() => window.location.href = '/api/gcal/auth/start'}
              className="px-6 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700 transition-colors"
            >
              {toastMessage?.message?.includes('Configuration Missing') ? 'Setup Required' : 'Connect Calendar'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900">Google Calendar</div>
                    <div className="text-xs text-gray-500">
                      {googleEvents.length} event{googleEvents.length !== 1 ? 's' : ''} {viewPeriod === 'today' ? 'today' : 'this week'}
                    </div>
                  </div>
                  {calendars.length > 1 && (
                    <select 
                      value={selectedCalendar} 
                      onChange={(e) => setSelectedCalendar(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 flex-shrink-0"
                    >
                      {calendars.map(cal => (
                        <option key={cal.id} value={cal.id}>
                          {cal.title.length > 15 ? cal.title.substring(0, 15) + '...' : cal.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => loadGoogleEvents(true)}
                    disabled={syncing}
                    className="px-3 py-1.5 bg-fuchsia-50 text-fuchsia-700 rounded-lg text-xs font-medium hover:bg-fuchsia-100 transition-colors disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Refresh'}
                  </button>
                  <button 
                    onClick={disconnectCalendar}
                    disabled={disconnecting}
                    className="px-3 py-1.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>

            {/* Events List */}
            {googleEvents.length === 0 ? (
              <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14V7H5v14z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
                <p className="text-sm text-gray-500">
                  No events scheduled for {viewPeriod === 'today' ? 'today' : 'this week'}
                </p>
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 max-h-[600px] overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {sortedDays.map(day => (
                    <div key={day.toDateString()} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${
                          isToday(day) ? 'bg-fuchsia-500' : 'bg-gray-300'
                        }`} />
                        <h3 className={`font-semibold ${
                          isToday(day) ? 'text-fuchsia-600' : 'text-gray-900'
                        }`}>
                          {formatDate(day)}
                          {isToday(day) && (
                            <span className="ml-2 text-xs font-medium text-fuchsia-500 bg-fuchsia-50 px-2 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </h3>
                      </div>
                      
                      <div className="space-y-2 ml-6">
                        {eventsByDay[day.toDateString()].map((event, idx) => (
                          <div key={event.id || idx} className="group">
                            <div className="flex items-start justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900 truncate">
                                    {event.title}
                                  </h4>
                                </div>
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatTime(event.start)} - {formatTime(event.end)}
                                  </div>
                                  
                                  {event.location && (
                                    <div className="flex items-center gap-1 truncate">
                                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span className="truncate">{event.location}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {event.description && (
                                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              
                              {event.id && (
                                <button
                                  onClick={() => {
                                    // Deep-link into Google Calendar week view anchored on the event date
                                    const eventDate = event.start.toISOString().split('T')[0]; // YYYY-MM-DD format
                                    const calendarUrl = `https://calendar.google.com/calendar/u/0/r/week/${eventDate.replace(/-/g, '/')}?tab=mc`;
                                    window.open(calendarUrl, '_blank');
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-md ml-2 flex-shrink-0"
                                  title="View date in Google Calendar"
                                >
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
