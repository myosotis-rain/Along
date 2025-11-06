"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EventItem {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  temp?: boolean;
  description?: string;
  location?: string;
}

interface SimpleMobileCalendarProps {
  events: EventItem[];
  onCreate: (e: EventItem) => Promise<void>;
  weekOffset?: number;
  onEventClick?: (event: EventItem) => void;
  loading?: boolean;
}

export default function SimpleMobileCalendar({ 
  events, 
  onCreate, 
  weekOffset = 0, 
  onEventClick,
  loading = false 
}: SimpleMobileCalendarProps) {
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
      isToday: date.toDateString() === today.toDateString()
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
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0); // Default to 9 AM
    const end = new Date(start.getTime() + 60 * 60000); // 1 hour

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
    <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Week navigation */}
      <div className="border-b border-gray-100">
        <div className="flex">
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDay(index)}
              className={`flex-1 p-3 text-center transition-colors ${
                selectedDay === index
                  ? 'bg-fuchsia-100 text-fuchsia-700'
                  : day.isToday
                  ? 'bg-fuchsia-50 text-fuchsia-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-xs font-medium mb-1">{day.name}</div>
              <div className={`text-sm font-semibold ${
                selectedDay === index || day.isToday
                  ? 'text-fuchsia-700'
                  : 'text-gray-900'
              }`}>
                {day.date}
              </div>
              {getEventsForDay(index).length > 0 && (
                <div className={`w-1 h-1 rounded-full mx-auto mt-1 ${
                  selectedDay === index
                    ? 'bg-fuchsia-600'
                    : 'bg-gray-400'
                }`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selected day content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Day header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {days[selectedDay].fullDate.toLocaleDateString('en', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <p className="text-sm text-gray-500">
                  {getEventsForDay(selectedDay).length} events
                </p>
              </div>
              <button
                onClick={() => createQuickEvent(selectedDay)}
                disabled={loading}
                className="px-3 py-1.5 bg-fuchsia-100 text-fuchsia-700 rounded-lg text-sm font-medium hover:bg-fuchsia-200 disabled:opacity-50 transition-colors"
              >
                + Add
              </button>
            </div>

            {/* Events list */}
            <div className="space-y-2">
              {getEventsForDay(selectedDay).length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">No events scheduled</p>
                  <button
                    onClick={() => createQuickEvent(selectedDay)}
                    className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700 transition-colors"
                  >
                    Add Event
                  </button>
                </div>
              ) : (
                getEventsForDay(selectedDay).map((event, index) => {
                  const duration = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60));
                  const isGoogleEvent = !event.temp && event.id && !event.id.startsWith('temp-');
                  
                  return (
                    <motion.div
                      key={event.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => onEventClick?.(event)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border-l-4 ${
                        event.temp
                          ? 'bg-fuchsia-50 border-l-fuchsia-400 hover:bg-fuchsia-100'
                          : isGoogleEvent
                          ? 'bg-blue-50 border-l-blue-400 hover:bg-blue-100'
                          : 'bg-gray-50 border-l-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>
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
                            <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                              {duration}m
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm">
            <div className="w-4 h-4 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-gray-600">Loading...</div>
          </div>
        </div>
      )}
    </div>
  );
}