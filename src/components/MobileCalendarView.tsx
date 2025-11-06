"use client";
import React, { useState } from "react";
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

interface MobileCalendarProps {
  events: EventItem[];
  onCreate: (e: EventItem) => Promise<void>;
  weekOffset?: number;
  onEventClick?: (event: EventItem) => void;
  loading?: boolean;
}

export default function MobileCalendarView({ 
  events, 
  onCreate, 
  weekOffset = 0, 
  onEventClick,
  loading = false 
}: MobileCalendarProps) {
  const [selectedDay, setSelectedDay] = useState(0);

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
  
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      name: date.toLocaleDateString('en', { weekday: 'short' }),
      date: date.getDate(),
      fullDate: date,
      isToday: date.toDateString() === today.toDateString(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    };
  });


  const getEventsForDay = (dayIndex: number) => {
    return events.filter(event => {
      const eventDay = event.start.getDay();
      const adjustedEventDay = eventDay === 0 ? 6 : eventDay - 1;
      return adjustedEventDay === dayIndex;
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const createQuickEvent = async (dayIndex: number) => {
    const selectedDate = days[dayIndex].fullDate;
    const now = new Date();
    const start = new Date(selectedDate);
    
    // Set to current time if it's today, otherwise default to 9 AM
    if (selectedDate.toDateString() === now.toDateString() && now.getHours() >= 6) {
      start.setHours(now.getHours(), 0, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    
    const end = new Date(start.getTime() + 60 * 60000); // 1 hour later

    try {
      await onCreate({
        id: crypto.randomUUID(),
        title: "Focus Session",
        start,
        end,
        temp: true
      });
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Week Days Header */}
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200/50">
        <div className="flex">
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDay(index)}
              className={`flex-1 p-4 text-center transition-all duration-200 ${
                selectedDay === index
                  ? 'bg-blue-500 text-white'
                  : day.isToday
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-xs font-semibold uppercase mb-1">
                {day.name}
              </div>
              <div className={`text-lg font-bold ${
                selectedDay === index
                  ? 'text-white'
                  : day.isToday
                  ? 'text-blue-600'
                  : 'text-gray-900'
              }`}>
                {day.date}
              </div>
              {getEventsForDay(index).length > 0 && (
                <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${
                  selectedDay === index
                    ? 'bg-white/70'
                    : 'bg-blue-500'
                }`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Day Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col"
          >
            {/* Day Header */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {days[selectedDay].fullDate.toLocaleDateString('en', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {getEventsForDay(selectedDay).length} events scheduled
                  </p>
                </div>
                <button
                  onClick={() => createQuickEvent(selectedDay)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-lg"
                >
                  {loading ? '...' : '+ Event'}
                </button>
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {getEventsForDay(selectedDay).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No events scheduled</h4>
                    <p className="text-gray-500 mb-4">Tap the + Event button to add your first event</p>
                    <button
                      onClick={() => createQuickEvent(selectedDay)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
                    >
                      Create Event
                    </button>
                  </div>
                ) : (
                  getEventsForDay(selectedDay).map((event, index) => {
                    const duration = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60));
                    const isGoogleEvent = !event.temp && event.id && !event.id.startsWith('temp-');
                    
                    return (
                      <motion.div
                        key={event.id || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => onEventClick?.(event)}
                        className={`p-4 rounded-3xl border-l-4 cursor-pointer transition-all hover:shadow-lg ${
                          event.temp
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-blue-500'
                            : isGoogleEvent
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-green-500'
                            : 'bg-gradient-to-r from-gray-50 to-slate-50 border-l-gray-400'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg mb-1 truncate">
                              {event.title}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold">
                                {event.start.toLocaleTimeString('en', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                                {' - '}
                                {event.end.toLocaleTimeString('en', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                              </span>
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                                {duration}m
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            {event.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-2 ${
                            event.temp
                              ? 'bg-blue-500'
                              : isGoogleEvent
                              ? 'bg-green-500'
                              : 'bg-gray-400'
                          }`} />
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-lg">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm font-medium text-gray-700">Loading events...</div>
          </div>
        </div>
      )}
    </div>
  );
}