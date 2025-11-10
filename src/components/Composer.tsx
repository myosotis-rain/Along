"use client";
import { useState, type ReactNode } from "react";

interface ComposerProps {
  onSend: (text: string) => void;
  initialText?: string;
  onTextChange?: (text: string) => void;
  accessory?: ReactNode;
}

export default function Composer({ onSend, initialText, onTextChange, accessory }: ComposerProps) {
  const [internalVal, setInternalVal] = useState("");
  const isControlled = initialText !== undefined;
  const val = isControlled ? initialText ?? "" : internalVal;

  const handleChange = (text: string) => {
    if (!isControlled) setInternalVal(text);
    onTextChange?.(text);
  };

  const handleSubmit = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    if (!isControlled) {
      setInternalVal("");
    } else {
      onTextChange?.("");
    }
  };

  return (
    <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 z-30">
      <div className="relative pb-4 pt-3 px-3 sm:px-4">
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-20 bg-gradient-to-t from-white/40 via-white/10 to-transparent backdrop-blur" aria-hidden="true" />
        <div className="relative max-w-xl mx-auto">
          <div className="bg-white/95 backdrop-blur border border-white/60 rounded-3xl flex flex-col gap-2 px-4 py-3 shadow-lg">
            {accessory && (
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {accessory}
              </div>
            )}
            <div className="flex items-center gap-2">
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
    </div>
  );
}
