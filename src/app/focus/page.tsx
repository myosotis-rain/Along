"use client";
import Shell from "@/components/Shell";
import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";

export default function FocusPage() {
  const { addSession } = useApp();
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState(25);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        }
      }, 1000);
    } else if (minutes === 0 && seconds === 0 && isRunning) {
      // Timer finished
      setIsRunning(false);
      addSession({
        id: crypto.randomUUID(),
        plannedMin: totalMinutes,
        actualMin: totalMinutes,
        at: new Date().toISOString()
      });
    }
    
    return () => clearInterval(interval);
  }, [isRunning, minutes, seconds, totalMinutes, addSession]);

  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setMinutes(totalMinutes);
    setSeconds(0);
  };

  const setDuration = (mins: number) => {
    if (!isRunning) {
      setTotalMinutes(mins);
      setMinutes(mins);
      setSeconds(0);
    }
  };

  const progress = ((totalMinutes * 60 - (minutes * 60 + seconds)) / (totalMinutes * 60)) * 100;

  return (
    <Shell>
      <div className="text-center space-y-6">
        <h1 className="text-lg font-semibold">Focus Timer</h1>
        
        {/* Timer Display */}
        <div className="relative w-48 h-48 mx-auto">
          <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#gradient)"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-in-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#9B7BF7'}} />
                <stop offset="100%" style={{stopColor: '#FF9EBF'}} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-500">
                {totalMinutes}m session
              </div>
            </div>
          </div>
        </div>

        {/* Duration Presets */}
        {!isRunning && (
          <div className="flex justify-center gap-2">
            {[15, 25, 45].map(mins => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  totalMinutes === mins 
                    ? 'bg-cta text-white' 
                    : 'card hover:bg-gray-50'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!isRunning ? (
            <button
              onClick={startTimer}
              className="px-6 py-3 rounded-full bg-cta text-white font-medium"
            >
              Start Focus
            </button>
          ) : (
            <>
              <button
                onClick={pauseTimer}
                className="px-6 py-3 rounded-full card font-medium"
              >
                Pause
              </button>
              <button
                onClick={resetTimer}
                className="px-6 py-3 rounded-full card font-medium"
              >
                Reset
              </button>
            </>
          )}
        </div>

        {isRunning && (
          <div className="card p-4 text-sm text-gray-600">
            <p>🧠 Focus time! I'll check in with you in a bit.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}