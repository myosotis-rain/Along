"use client";
import { useState } from "react";

export default function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [val, setVal] = useState("");

  const handleSubmit = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal("");
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 z-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white/95 backdrop-blur border border-white/60 rounded-3xl flex items-center gap-2 px-3 py-2 shadow-lg">
          <input 
            className="flex-1 bg-transparent outline-none p-2 text-sm placeholder:text-gray-500"
            placeholder="Message Along…" 
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          <button 
            onClick={handleSubmit}
            disabled={!val.trim()}
            className="px-4 py-2 rounded-full bg-cta text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            Send
          </button>
        </div>
        <div className="text-xs text-center text-gray-500 mt-2 px-4">
          Local prototype—nothing leaves your browser unless you enable GPT in Settings.
        </div>
      </div>
    </div>
  );
}