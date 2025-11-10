"use client";
import { useState, useEffect } from "react";

interface ComposerProps {
  onSend: (text: string) => void;
  initialText?: string;
  onTextChange?: (text: string) => void;
}

export default function Composer({ onSend, initialText, onTextChange }: ComposerProps) {
  const [val, setVal] = useState("");

  useEffect(() => {
    if (initialText !== undefined) {
      setVal(initialText);
    }
  }, [initialText]);

  const handleChange = (text: string) => {
    setVal(text);
    onTextChange?.(text);
  };

  const handleSubmit = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal("");
  };

  return (
    <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 z-30">
      <div className="bg-gradient-to-t from-white/95 via-white/90 to-transparent pb-4 pt-3 px-3 sm:px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white/95 backdrop-blur border border-white/60 rounded-3xl flex items-center gap-2 px-4 py-3 shadow-lg">
            <input 
              className="flex-1 bg-transparent outline-none text-base sm:text-sm placeholder:text-gray-500"
              placeholder="Message Along…" 
              value={val}
              onChange={e => handleChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
            <button 
              onClick={handleSubmit}
              disabled={!val.trim()}
              className="px-4 py-2 rounded-full bg-cta text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex-shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}