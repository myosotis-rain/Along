"use client";
import { motion } from "framer-motion";
import { useState } from "react";

interface CalendarAction {
  type: 'create' | 'update' | 'delete';
  event: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
  };
  eventId?: string;
}

interface CalendarActionPromptProps {
  action: CalendarAction;
  onApprove: () => void;
  onDeny: () => void;
  loading?: boolean;
}

export default function CalendarActionPrompt({ 
  action, 
  onApprove, 
  onDeny, 
  loading = false 
}: CalendarActionPromptProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Safety check for action and event
  if (!action) {
    console.log('CalendarActionPrompt: No action provided');
    return null;
  }
  
  console.log('CalendarActionPrompt received:', action);

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Time not specified';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid time';
      return date.toLocaleString('en', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Invalid time';
    }
  };

  const getActionText = () => {
    switch (action.type) {
      case 'create':
        return 'create a new calendar event';
      case 'update':
        return 'update this calendar event';
      case 'delete':
        return 'delete this calendar event';
      default:
        return 'modify your calendar';
    }
  };

  const getActionColor = () => {
    switch (action.type) {
      case 'create':
        return 'from-green-100 to-emerald-100 border-green-200';
      case 'update':
        return 'from-blue-100 to-indigo-100 border-blue-200';
      case 'delete':
        return 'from-red-100 to-pink-100 border-red-200';
      default:
        return 'from-gray-100 to-slate-100 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`card p-4 border-2 bg-gradient-to-br ${getActionColor()}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
          {action.type === 'create' && (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          )}
          {action.type === 'update' && (
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
          {action.type === 'delete' && (
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">
                Permission needed to {getActionText()}
              </h4>
              <div className="space-y-1">
                <div className="font-medium text-sm text-gray-800">
                  {action.event?.title || 'Calendar Event'}
                </div>
                <div className="text-sm text-gray-600">
                  {action.event?.start ? formatTime(action.event.start) : 'Time not specified'}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Details
              <svg 
                className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-white/50 space-y-2"
            >
              <div className="text-xs text-gray-600">
                <div><strong>Start:</strong> {formatTime(action.event?.start)}</div>
                <div><strong>End:</strong> {formatTime(action.event?.end)}</div>
                {action.event?.location && (
                  <div><strong>Location:</strong> {action.event.location}</div>
                )}
                {action.event?.description && (
                  <div><strong>Description:</strong> {action.event.description}</div>
                )}
              </div>
            </motion.div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={onDeny}
              disabled={loading}
              className="px-3 py-1.5 bg-white/80 hover:bg-white text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Deny
            </button>
            <button
              onClick={onApprove}
              disabled={loading}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1"
            >
              {loading && (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              Allow
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}