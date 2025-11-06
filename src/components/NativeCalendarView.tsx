"use client";
import React from "react";
import { motion } from "framer-motion";

interface EventItem {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  temp?: boolean;
  description?: string;
  location?: string;
}

interface NativeCalendarViewProps {
  events: EventItem[];
  onCreate: (e: EventItem) => Promise<void>;
  weekOffset?: number;
  onEventClick?: (event: EventItem) => void;
  loading?: boolean;
}

export default function NativeCalendarView({ 
  events, 
  onCreate, 
  weekOffset = 0, 
  onEventClick,
  loading = false 
}: NativeCalendarViewProps) {
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

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM - 7 PM

  const handleCellClick = (dayIndex: number, hour: number) => {
    const clickedDate = new Date(days[dayIndex].fullDate);
    clickedDate.setHours(hour, 0, 0, 0);
    const end = new Date(clickedDate.getTime() + 60 * 60000);

    onCreate({
      id: crypto.randomUUID(),
      title: "Focus Session",
      start: clickedDate,
      end,
      temp: true
    });
  };

  const getEventPosition = (event: EventItem) => {
    const eventDay = event.start.getDay();
    const dayIndex = eventDay === 0 ? 6 : eventDay - 1;
    const startHour = event.start.getHours() + event.start.getMinutes() / 60;
    const endHour = event.end.getHours() + event.end.getMinutes() / 60;
    
    const top = Math.max(0, ((startHour - 8) / 11) * 100);
    const height = Math.max(8, ((endHour - startHour) / 11) * 100);
    
    return { dayIndex, top, height };
  };

  const getEventsForDay = (dayIndex: number) => {
    return events.filter(event => {
      const eventDay = event.start.getDay();
      const adjustedEventDay = eventDay === 0 ? 6 : eventDay - 1;
      return adjustedEventDay === dayIndex;
    });
  };

  return (
    <div className="space-y-3">
      {/* Days header */}
      <div className="grid grid-cols-8 gap-px bg-gray-200/30 rounded-lg overflow-hidden">
        <div className="bg-white/60 p-2">
          <div className="text-xs text-gray-500 font-medium">Time</div>
        </div>
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`p-2 text-center ${
              day.isToday 
                ? 'bg-gradient-to-br from-purple-50 to-pink-50' 
                : 'bg-white/60'
            }`}
          >
            <div className="text-xs text-gray-600 font-medium mb-0.5">{day.name}</div>
            <div className={`text-sm font-semibold ${
              day.isToday ? 'text-purple-600' : 'text-gray-900'
            }`}>
              {day.date}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-8 gap-px bg-gray-100/50">
          {/* Time column */}
          <div className="bg-gray-50/50">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="h-16 flex items-center justify-end pr-2 text-xs text-gray-500"
                style={{ borderBottom: '1px solid rgb(229 231 235 / 0.3)' }}
              >
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="relative bg-white/40">
              {/* Hour cells */}
              {hours.map((hour, hourIndex) => (
                <div
                  key={`${dayIndex}-${hourIndex}`}
                  className={`h-16 cursor-pointer transition-colors ${
                    day.isToday 
                      ? 'hover:bg-purple-50/80' 
                      : 'hover:bg-gray-50/80'
                  }`}
                  style={{ borderBottom: '1px solid rgb(229 231 235 / 0.3)' }}
                  onClick={() => handleCellClick(dayIndex, hour)}
                />
              ))}

              {/* Events */}
              <div className="absolute inset-0 p-1">
                {getEventsForDay(dayIndex).map((event, eventIndex) => {
                  const { top, height } = getEventPosition(event);
                  const isGoogleEvent = !event.temp && event.id && !event.id.startsWith('temp-');
                  
                  return (
                    <motion.div
                      key={event.id || eventIndex}
                      className={`absolute left-0.5 right-0.5 rounded-lg cursor-pointer overflow-visible ${
                        event.temp
                          ? 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200/60 text-purple-800'
                          : isGoogleEvent
                          ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/60 text-blue-800'
                          : 'bg-gradient-to-br from-gray-100 to-slate-100 border border-gray-200/60 text-gray-800'
                      }`}
                      style={{
                        top: `${top}%`,
                        height: `${Math.max(height, 12)}%`,
                        minHeight: '24px'
                      }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      whileHover={{ scale: 1.02, zIndex: 10 }}
                      transition={{ duration: 0.12 }}
                    >
                      <div className="p-1.5 h-full overflow-visible">
                        <div className="font-medium text-xs leading-tight mb-1 whitespace-normal break-words">
                          {event.title}
                        </div>
                        <div className="text-xs opacity-75 leading-tight whitespace-nowrap">
                          {event.start.toLocaleTimeString('en', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 card flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            Loading events...
          </div>
        </div>
      )}
    </div>
  );
}