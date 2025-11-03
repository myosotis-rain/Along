"use client";
import { motion } from "framer-motion";
import type { Message } from "@/types/app";

export default function ChatThread({ items }: { items: Message[] }) {
  return (
    <div className="space-y-3 pb-4">
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
          } px-4 py-3 max-w-[80%] min-h-[48px] flex items-center`}>
            <p className="leading-relaxed text-[15px]">{m.text}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}