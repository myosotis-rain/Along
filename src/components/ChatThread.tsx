"use client";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Message, MessageAction } from "@/types/app";

interface ChatThreadProps {
  items: Message[];
  onAction?: (action: MessageAction, messageId: string) => void;
}

export default function ChatThread({ items, onAction }: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Add a small delay to ensure content is rendered before scrolling
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [items]);

  return (
    <div className="space-y-3 pb-8">
      {items.map((m, i) => (
        <motion.div 
          key={m.id}
          initial={{ opacity: 0, y: 8, scale: 0.98 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
          className={`flex ${m.sender === "assistant" ? "justify-start" : "justify-end"}`}
        >
          <div className={`${
            m.sender === "assistant" 
              ? "bubble assistant" 
              : "bubble"
          } px-4 py-3 max-w-[85%] sm:max-w-[80%] min-h-[48px]`}>
            <div className="space-y-3">
              <p className="leading-relaxed text-sm sm:text-[15px] break-words whitespace-pre-wrap">{m.text}</p>
              
              {/* Microsteps List */}
              {m.microsteps && m.microsteps.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium opacity-80">Here's how to break it down:</div>
                  <div className="space-y-1">
                    {m.microsteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {m.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => onAction?.(action, m.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 flex items-center gap-1.5 ${
                        m.sender === "assistant" 
                          ? "bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 border border-fuchsia-200" 
                          : "bg-white/20 hover:bg-white/30 text-white"
                      }`}
                    >
                      {action.type === "generate_microsteps" && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
                        </svg>
                      )}
                      {action.type === "add_to_planner" && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}