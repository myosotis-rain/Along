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

interface NativeMobileCalendarProps {
  events: EventItem[];
  onCreate: (e: EventItem) => Promise<void>;
  weekOffset?: number;
  onEventClick?: (event: EventItem) => void;
  loading?: boolean;
}

export default function NativeMobileCalendar({ 
  events, 
  onCreate, 
  weekOffset = 0, 
  onEventClick,
  loading = false 
}: NativeMobileCalendarProps) {
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
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60000);

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
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="grid grid-cols-7 gap-px bg-gray-200/30 rounded-lg overflow-hidden">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => setSelectedDay(index)}
            className={`p-2 text-center transition-colors ${
              selectedDay === index
                ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700'
                : day.isToday
                ? 'bg-gradient-to-br from-purple-50 to-pink-50 text-purple-600'
                : 'bg-white/60 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs font-medium mb-0.5">{day.name}</div>
            <div className="text-sm font-semibold">{day.date}</div>
            {getEventsForDay(index).length > 0 && (
              <div className={`w-1 h-1 rounded-full mx-auto mt-1 ${
                selectedDay === index || day.isToday
                  ? 'bg-purple-500'
                  : 'bg-gray-400'
              }`} />
            )}
          </button>
        ))}
      </div>

      {/* Selected day content */}
      <div className="card p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
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
                className="px-3 py-1.5 bg-cta text-white rounded-full text-sm font-medium disabled:opacity-50 transition-all"
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
                  <p className="text-sm text-gray-500 mb-3">No events today</p>
                  <button
                    onClick={() => createQuickEvent(selectedDay)}
                    className="px-4 py-2 bg-cta text-white rounded-full text-sm font-medium transition-all"
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
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onEventClick?.(event)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border-l-4 ${
                        event.temp
                          ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-l-purple-400 hover:from-purple-100 hover:to-pink-100'
                          : isGoogleEvent
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-blue-400 hover:from-blue-100 hover:to-indigo-100'
                          : 'bg-gradient-to-r from-gray-50 to-slate-50 border-l-gray-400 hover:from-gray-100 hover:to-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1 break-words">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
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
                            <span className="bg-white/60 px-1.5 py-0.5 rounded text-xs font-medium">
                              {duration}m
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 break-words">
                              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.description && (
                            <div className="text-xs text-gray-500 mt-1 break-words">
                              {event.description.length > 60 
                                ? event.description.substring(0, 60) + '...' 
                                : event.description}
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
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="card p-4 flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            Loading events...
          </div>
        </div>
      )}
    </div>
  );
}