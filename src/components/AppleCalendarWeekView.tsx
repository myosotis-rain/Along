"use client";
import React, { useState, useRef } from "react";
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

interface CalendarProps {
  events: EventItem[];
  onCreate: (e: EventItem) => Promise<void>;
  onUpdate?: (e: EventItem) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  weekOffset?: number;
  onEventClick?: (event: EventItem) => void;
  loading?: boolean;
}

interface ToastMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function AppleCalendarWeekView({ 
  events, 
  onCreate, 
  weekOffset = 0, 
  onEventClick,
  loading = false 
}: CalendarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventData, setNewEventData] = useState<{start: Date, end: Date} | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Enhanced time slots - every 15 minutes from 6 AM to 10 PM
  const timeSlots = Array.from({ length: 64 }, (_, i) => {
    const hour = Math.floor(i / 4) + 6;
    const minute = (i % 4) * 15;
    return { hour, minute, index: i };
  });

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

  // Show toast notification
  const showToast = (message: ToastMessage) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // Handle cell click for event creation
  const handleCellClick = (dayIndex: number, timeSlotIndex: number) => {
    const timeSlot = timeSlots[timeSlotIndex];
    const clickedDate = new Date(days[dayIndex].fullDate);
    clickedDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
    
    const end = new Date(clickedDate.getTime() + 60 * 60000); // Default 1 hour
    
    setNewEventData({ start: clickedDate, end });
    setShowCreateModal(true);
  };

  // Enhanced event positioning
  const getEventPosition = (event: EventItem) => {
    const eventDay = event.start.getDay();
    const dayIndex = eventDay === 0 ? 6 : eventDay - 1;
    
    const startHour = event.start.getHours() + event.start.getMinutes() / 60;
    const endHour = event.end.getHours() + event.end.getMinutes() / 60;
    
    const startSlot = Math.max(0, (startHour - 6) * 4);
    const endSlot = Math.min(64, (endHour - 6) * 4);
    
    const top = (startSlot / 64) * 100;
    const height = Math.max(6.25, ((endSlot - startSlot) / 64) * 100); // Minimum height
    
    return { dayIndex, top, height };
  };

  // Current time indicator
  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;
    const currentHour = now.getHours() + now.getMinutes() / 60;
    
    if (currentHour >= 6 && currentHour <= 22 && weekOffset === 0) {
      const position = ((currentHour - 6) / 16) * 100;
      return { dayIndex: adjustedCurrentDay, position };
    }
    return null;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div className="relative">
      {/* Enhanced Calendar Container */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50/80 via-white/90 to-gray-50/80 border-b border-gray-200/30">
          <div className="grid grid-cols-8 divide-x divide-gray-200/30">
            <div className="px-4 py-6 text-center">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Time
              </div>
            </div>
            {days.map((day, i) => (
              <div 
                key={i} 
                className={`px-4 py-6 text-center transition-all duration-200 ${
                  day.isToday 
                    ? 'bg-blue-50/70 border-l-2 border-blue-500' 
                    : day.isWeekend 
                    ? 'bg-gray-50/50' 
                    : ''
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                  day.isToday ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {day.name}
                </div>
                <div className={`text-xl font-bold ${
                  day.isToday 
                    ? 'text-blue-600 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                    : 'text-gray-900'
                }`}>
                  {day.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div ref={gridRef} className="relative h-[600px] overflow-auto bg-gradient-to-b from-gray-50/30 to-white/50">
          <div className="grid grid-cols-8 h-full">
            {/* Time Column */}
            <div className="bg-gray-50/50 border-r border-gray-200/30">
              {Array.from({ length: 17 }, (_, i) => {
                const hour = i + 6;
                return (
                  <div 
                    key={hour} 
                    className="h-16 flex items-start justify-end pr-4 pt-2 text-xs font-medium text-gray-500 border-b border-gray-100/50"
                  >
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                );
              })}
            </div>

            {/* Day Columns */}
            {days.map((day, dayIndex) => (
              <div 
                key={dayIndex} 
                className={`relative border-r border-gray-200/30 ${
                  day.isToday ? 'bg-blue-50/20' : day.isWeekend ? 'bg-gray-50/30' : ''
                }`}
              >
                {/* Hour grid lines */}
                {Array.from({ length: 17 }, (_, i) => (
                  <div
                    key={i}
                    className="h-16 border-b border-gray-100/50 cursor-pointer group transition-colors hover:bg-blue-50/30"
                    onClick={() => handleCellClick(dayIndex, i * 4)}
                  >
                    {/* Quarter hour lines */}
                    <div className="h-4 border-b border-gray-50/50" />
                    <div className="h-4 border-b border-gray-50/50" />
                    <div className="h-4 border-b border-gray-50/50" />
                    <div className="h-4" />
                    
                    {/* Hover indicator */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="absolute inset-2 border-2 border-blue-400 border-dashed rounded-lg bg-blue-50/30" />
                    </div>
                  </div>
                ))}

                {/* Events */}
                <div className="absolute inset-0 p-1">
                  <AnimatePresence>
                    {events
                      .filter(event => {
                        const eventDay = event.start.getDay();
                        const adjustedEventDay = eventDay === 0 ? 6 : eventDay - 1;
                        return adjustedEventDay === dayIndex;
                      })
                      .map((event, eventIndex) => {
                        const { top, height } = getEventPosition(event);
                        const isGoogleEvent = !event.temp && event.id && !event.id.startsWith('temp-');
                        
                        return (
                          <motion.div
                            key={event.id || eventIndex}
                            className={`absolute left-1 right-1 rounded-xl shadow-sm border-l-4 cursor-pointer overflow-hidden ${
                              event.temp
                                ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-l-blue-500 text-blue-900'
                                : isGoogleEvent
                                ? 'bg-gradient-to-r from-green-100 to-emerald-50 border-l-green-500 text-green-900'
                                : 'bg-gradient-to-r from-gray-100 to-gray-50 border-l-gray-400 text-gray-900'
                            }`}
                            style={{
                              top: `${top}%`,
                              height: `${Math.max(height, 8)}%`
                            }}
                            initial={{ opacity: 0, scale: 0.95, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: -10 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            whileHover={{ scale: 1.02, zIndex: 10 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(event);
                            }}
                          >
                            <div className="p-2 h-full flex flex-col">
                              <div className="text-xs font-semibold truncate mb-1">
                                {event.title}
                              </div>
                              <div className="text-xs opacity-75 truncate">
                                {event.start.toLocaleTimeString('en', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                                {height > 15 && (
                                  <>
                                    {' - '}
                                    {event.end.toLocaleTimeString('en', { 
                                      hour: 'numeric', 
                                      minute: '2-digit',
                                      hour12: true 
                                    })}
                                  </>
                                )}
                              </div>
                              {event.location && height > 20 && (
                                <div className="text-xs opacity-60 truncate mt-1">
                                  📍 {event.location}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                </div>

                {/* Current time indicator */}
                {currentTimePosition && currentTimePosition.dayIndex === dayIndex && (
                  <motion.div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{ top: `${currentTimePosition.position}%` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg -ml-1.5"></div>
                      <div className="flex-1 h-0.5 bg-red-500"></div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-lg">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sm font-medium text-gray-700">Syncing calendar...</div>
            </div>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && newEventData && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CreateEventForm
                startTime={newEventData.start}
                endTime={newEventData.end}
                onSubmit={async (eventData) => {
                  try {
                    await onCreate(eventData);
                    setShowCreateModal(false);
                    showToast({
                      type: 'success',
                      title: 'Event Created',
                      message: `"${eventData.title}" has been added to your calendar.`
                    });
                  } catch {
                    showToast({
                      type: 'error',
                      title: 'Error',
                      message: 'Failed to create event. Please try again.'
                    });
                  }
                }}
                onCancel={() => setShowCreateModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed top-4 right-4 z-50"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
          >
            <div className={`rounded-2xl p-4 shadow-lg max-w-sm ${
              toast.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : toast.type === 'error' 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  toast.type === 'success' 
                    ? 'bg-green-500' 
                    : toast.type === 'error' 
                    ? 'bg-red-500' 
                    : 'bg-blue-500'
                }`}>
                  {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'i'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{toast.title}</div>
                  <div className="text-gray-600 text-sm">{toast.message}</div>
                </div>
                <button
                  onClick={() => setToast(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Create Event Form Component
function CreateEventForm({ 
  startTime, 
  endTime, 
  onSubmit, 
  onCancel 
}: {
  startTime: Date;
  endTime: Date;
  onSubmit: (event: EventItem) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      start,
      end,
      temp: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">New Event</h3>
        <p className="text-sm text-gray-500">
          {start.toLocaleDateString('en', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Event Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's the occasion?"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={start.toISOString().slice(0, 16)}
              onChange={(e) => setStart(new Date(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              value={end.toISOString().slice(0, 16)}
              onChange={(e) => setEnd(new Date(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Location (optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where is this happening?"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any additional details..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Event
        </button>
      </div>
    </form>
  );
}