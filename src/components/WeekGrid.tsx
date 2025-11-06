import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EventItem {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  temp?: boolean;
}

interface WeekGridProps {
  events: EventItem[];
  onCreate: (e: EventItem) => Promise<void>;
  weekOffset?: number;
  onEventClick?: (event: EventItem) => void;
}

export default function WeekGrid({ events, onCreate, weekOffset = 0, onEventClick }: WeekGridProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM–9 PM
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7)); // Start on Monday
  
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      name: date.toLocaleDateString('en', { weekday: 'short' }),
      date: date.getDate(),
      fullDate: date
    };
  });

  function handleCellClick(dayIndex: number, hourIndex: number) {
    const clickedDate = new Date(days[dayIndex].fullDate);
    clickedDate.setHours(hours[hourIndex], 0, 0, 0);
    const end = new Date(clickedDate.getTime() + 60 * 60000); // 1 hour default

    const newEvent: EventItem = {
      id: `temp-${crypto.randomUUID()}`,
      title: "Focus Session",
      start: clickedDate,
      end,
      temp: true,
    };
    onCreate(newEvent);
  }

  function getEventPosition(event: EventItem) {
    const eventDay = event.start.getDay();
    const dayIndex = eventDay === 0 ? 6 : eventDay - 1; // Convert Sunday=0 to index 6
    const startHour = event.start.getHours() + event.start.getMinutes() / 60;
    const endHour = event.end.getHours() + event.end.getMinutes() / 60;
    
    const top = Math.max(0, ((startHour - 6) / 15) * 100);
    const height = Math.min(100 - top, ((endHour - startHour) / 15) * 100);
    
    return { dayIndex, top, height };
  }

  function isToday(date: Date) {
    const actualToday = new Date();
    return date.toDateString() === actualToday.toDateString();
  }

  function getEventsByDay(dayIndex: number) {
    return events.filter(event => {
      const eventDay = event.start.getDay();
      const adjustedEventDay = eventDay === 0 ? 6 : eventDay - 1;
      return adjustedEventDay === dayIndex;
    });
  }

  // Calculate current time indicator position
  const getCurrentTimeIndicator = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;
    const currentHour = now.getHours() + now.getMinutes() / 60;
    
    if (currentHour >= 6 && currentHour <= 21) {
      const top = ((currentHour - 6) / 15) * 100;
      
      return {
        left: `${12.5 + (adjustedCurrentDay * 12.5)}%`,
        right: `${87.5 - (adjustedCurrentDay * 12.5)}%`,
        top: `${top}%`,
        transform: 'translateY(-50%)'
      };
    }
    return null;
  };

  const timeIndicatorStyle = getCurrentTimeIndicator();

  return (
    <div className="h-full flex flex-col bg-white/90 backdrop-blur rounded-xl border border-fuchsia-100/40 shadow-sm overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 bg-gradient-to-r from-fuchsia-25 to-rose-25 border-b border-fuchsia-100/30">
        <div className="p-4 text-xs font-medium text-gray-500 border-r border-fuchsia-100/30">Time</div>
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`p-4 text-center border-r border-fuchsia-100/30 last:border-r-0 ${
              isToday(day.fullDate) 
                ? 'bg-gradient-to-br from-fuchsia-50/60 to-rose-50/60 text-fuchsia-800 font-semibold' 
                : 'text-gray-700'
            }`}
          >
            <div className="text-xs font-medium">{day.name}</div>
            <div className={`text-lg font-bold ${
              isToday(day.fullDate) ? 'text-fuchsia-500' : 'text-gray-900'
            }`}>{day.date}</div>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div ref={gridRef} className="flex-1 grid grid-cols-8 relative overflow-auto">
        {/* Time column */}
        <div className="bg-fuchsia-25/30 border-r border-fuchsia-100/30">
          {hours.map((hour) => (
            <div 
              key={hour} 
              className="h-16 flex items-center justify-end pr-4 text-xs text-gray-500 border-b border-fuchsia-100/30 last:border-b-0"
            >
              {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="relative border-r border-fuchsia-100/30 last:border-r-0">
            {/* Hour cells */}
            {hours.map((hour, hourIndex) => (
              <div
                key={`${dayIndex}-${hourIndex}`}
                className={`h-16 border-b border-fuchsia-100/30 last:border-b-0 cursor-pointer transition-colors duration-150 ${
                  hoveredCell?.day === dayIndex && hoveredCell?.hour === hourIndex
                    ? 'bg-fuchsia-50/40'
                    : isToday(day.fullDate)
                    ? 'bg-fuchsia-50/20'
                    : 'hover:bg-rose-50/20'
                }`}
                onClick={() => handleCellClick(dayIndex, hourIndex)}
                onMouseEnter={() => setHoveredCell({ day: dayIndex, hour: hourIndex })}
                onMouseLeave={() => setHoveredCell(null)}
              />
            ))}

            {/* Events for this day */}
            <div className="absolute inset-0 pointer-events-none">
              <AnimatePresence>
                {getEventsByDay(dayIndex).map((event, eventIndex) => {
                  const { top, height } = getEventPosition(event);
                  const isGoogleEvent = !event.temp && event.id && !event.id.startsWith('temp-');
                  
                  return (
                    <motion.div
                      key={event.id || eventIndex}
                      className={`absolute left-2 right-2 rounded-lg shadow-sm border pointer-events-auto overflow-hidden cursor-pointer ${
                        event.temp
                          ? 'bg-gradient-to-r from-fuchsia-300/80 to-rose-300/80 border-fuchsia-200/60 text-fuchsia-900'
                          : isGoogleEvent
                          ? 'bg-gradient-to-r from-rose-300/80 to-orange-300/80 border-rose-200/60 text-rose-900'
                          : 'bg-gradient-to-r from-gray-300/80 to-slate-300/80 border-gray-200/60 text-gray-900'
                      }`}
                      style={{
                        top: `${top}%`,
                        height: `${Math.max(height, 8)}%`
                      }}
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      whileHover={{ scale: 1.02, zIndex: 10 }}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="p-2 h-full flex flex-col justify-center">
                        <div className="text-xs font-semibold truncate">
                          {event.title}
                        </div>
                        <div className="text-xs opacity-90 truncate">
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
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Current time indicator */}
      {timeIndicatorStyle && (
        <motion.div
          className="absolute pointer-events-none z-20"
          style={timeIndicatorStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
            <div className="flex-1 h-0.5 bg-red-500"></div>
          </div>
        </motion.div>
      )}
    </div>
  );
}