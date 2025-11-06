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

interface SimpleWeekViewProps {
  events: EventItem[];
  onCreate: (e: EventItem) => Promise<void>;
  weekOffset?: number;
  onEventClick?: (event: EventItem) => void;
  loading?: boolean;
}

export default function SimpleWeekView({ 
  events, 
  onCreate, 
  weekOffset = 0, 
  onEventClick,
  loading = false 
}: SimpleWeekViewProps) {

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

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM - 8 PM

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
    
    const top = Math.max(0, ((startHour - 7) / 13) * 100);
    const height = Math.max(6, ((endHour - startHour) / 13) * 100);
    
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
    <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-gray-100">
        <div className="p-3 text-xs font-medium text-gray-500 border-r border-gray-100">Time</div>
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`p-3 text-center border-r border-gray-100 last:border-r-0 ${
              day.isToday ? 'bg-fuchsia-50' : ''
            }`}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">{day.name}</div>
            <div className={`text-base font-semibold ${
              day.isToday ? 'text-fuchsia-600' : 'text-gray-900'
            }`}>
              {day.date}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="relative">
        <div className="grid grid-cols-8">
          {/* Time column */}
          <div className="bg-gray-50/50">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="h-12 flex items-center justify-end pr-3 text-xs text-gray-500 border-b border-gray-100 last:border-b-0"
              >
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="relative border-r border-gray-100 last:border-r-0">
              {/* Hour cells */}
              {hours.map((hour, hourIndex) => (
                <div
                  key={`${dayIndex}-${hourIndex}`}
                  className={`h-12 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                    day.isToday ? 'hover:bg-fuchsia-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleCellClick(dayIndex, hour)}
                />
              ))}

              {/* Events */}
              <div className="absolute inset-0 p-0.5">
                {getEventsForDay(dayIndex).map((event, eventIndex) => {
                  const { top, height } = getEventPosition(event);
                  const isGoogleEvent = !event.temp && event.id && !event.id.startsWith('temp-');
                  
                  return (
                    <motion.div
                      key={event.id || eventIndex}
                      className={`absolute left-0.5 right-0.5 rounded-md text-xs cursor-pointer overflow-hidden border-l-2 ${
                        event.temp
                          ? 'bg-fuchsia-100 border-l-fuchsia-400 text-fuchsia-800'
                          : isGoogleEvent
                          ? 'bg-blue-100 border-l-blue-400 text-blue-800'
                          : 'bg-gray-100 border-l-gray-400 text-gray-800'
                      }`}
                      style={{
                        top: `${top}%`,
                        height: `${Math.max(height, 10)}%`,
                        minHeight: '16px'
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="p-1 h-full">
                        <div className="font-medium leading-tight line-clamp-2 mb-0.5">
                          {event.title}
                        </div>
                        <div className="text-xs opacity-75 leading-tight">
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