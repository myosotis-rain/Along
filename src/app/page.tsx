"use client";
import Shell from "@/components/Shell";
import ChatThread from "@/components/ChatThread";
import Composer from "@/components/Composer";
import { useApp } from "@/lib/store";

export default function Page() {
  const { messages, pushUser, pushAssistant, updateMessage, addTask, useGPT, schedule, tasks } = useApp();

  // Detect if user message seems like a task
  function detectTask(text: string): boolean {
    const taskKeywords = [
      'need to', 'have to', 'should', 'want to', 'planning to',
      'working on', 'trying to', 'assignment', 'project', 'task',
      'homework', 'paper', 'report', 'presentation', 'meeting',
      'exercise', 'clean', 'organize', 'finish', 'complete',
      'study', 'learn', 'practice', 'prepare', 'write'
    ];
    return taskKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  async function handleSend(text: string) {
    if (!text.trim()) return;
    
    // Optimistic update
    pushUser(text.trim());
    
    const isTask = detectTask(text);
    
    // Fetch complete schedule context including Google Calendar events
    let scheduleContext;
    try {
      const scheduleRes = await fetch("/api/schedule/current");
      if (scheduleRes.ok) {
        scheduleContext = await scheduleRes.json();
      }
    } catch (error) {
      console.log('Failed to fetch schedule, using local data');
    }
    
    // Fallback to local schedule if API fails
    if (!scheduleContext) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const todaySchedule = schedule.filter(item => {
        const itemDate = new Date(item.start);
        return itemDate >= today && itemDate < tomorrow;
      });
      
      const upcomingWeek = schedule.filter(item => {
        const itemDate = new Date(item.start);
        return itemDate >= tomorrow && itemDate < nextWeek;
      }).map(item => ({
        title: item.title,
        start: item.start,
        end: item.end,
        type: item.type,
        day: new Date(item.start).toLocaleDateString('en', { weekday: 'short' })
      }));
      
      scheduleContext = {
        todaySchedule: todaySchedule.map(item => ({
          title: item.title,
          start: item.start,
          end: item.end,
          type: item.type
        })),
        upcomingWeek,
        freeTimeSlots: [],
        currentTime: now.toISOString(),
        nextCommitment: todaySchedule.length > 0 ? todaySchedule[0] : null
      };
    }
    
    const upcomingTasks = tasks.filter(task => {
      const completedSteps = task.completedSteps || [];
      return !completedSteps.every(step => step);
    }).slice(0, 5);
    
    const contextInfo = {
      ...scheduleContext,
      upcomingTasks: upcomingTasks.map(task => ({
        title: task.title,
        estimateMin: task.estimateMin,
        category: task.category
      })),
      hasUpcomingDeadlines: upcomingTasks.length > 3
    };
    
    if (useGPT) {
      try {
        const res = await fetch("/api/chat", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userText: text,
            context: contextInfo
          })
        });
        const data = await res.json();
        
        // Add action buttons if this seems like a task
        const actions = isTask ? [
          { type: "generate_microsteps" as const, label: "Break into steps", data: { taskText: text } },
          { type: "add_to_planner" as const, label: "Add to planner", data: { taskText: text } }
        ] : undefined;
        
        // Handle multiple bubbles
        if (data.bubbles && Array.isArray(data.bubbles)) {
          data.bubbles.forEach((bubble: string, index: number) => {
            setTimeout(() => {
              // Only add actions to the last bubble
              const bubbleActions = index === data.bubbles.length - 1 ? actions : undefined;
              pushAssistant(bubble, undefined, bubbleActions);
            }, index * 800); // Stagger bubbles by 800ms
          });
        } else {
          pushAssistant(data.reply ?? "Want a 20m block or to break it into micro-steps?", undefined, actions);
        }
      } catch {
        const actions = isTask ? [
          { type: "generate_microsteps" as const, label: "Break into steps", data: { taskText: text } }
        ] : undefined;
        pushAssistant("connection's wonky but I'm here. what's one small thing we could try?", undefined, actions);
      }
    } else {
      // Local fallback responses with schedule awareness
      let responses: string[] = [];
      const freeSlots = contextInfo.freeTimeSlots || [];
      const nextCommitment = contextInfo.nextCommitment;
      
      if (isTask && freeSlots.length > 0) {
        const longestSlot = freeSlots.reduce((longest: any, slot: any) => 
          slot.duration > longest.duration ? slot : longest, freeSlots[0]);
        
        if (longestSlot.duration >= 25) {
          responses = [
            `I see you have ${longestSlot.duration}min free${nextCommitment ? ` before ${nextCommitment.title}` : ''}`,
            "want to use 20-25min of that?"
          ];
        } else {
          responses = [
            `you have ${longestSlot.duration}min free`,
            "maybe just start with opening the right tab?"
          ];
        }
      } else if (isTask && nextCommitment) {
        const timeUntil = Math.floor((new Date(nextCommitment.start).getTime() - new Date().getTime()) / (1000 * 60));
        if (timeUntil > 15) {
          responses = [
            `${timeUntil}min until ${nextCommitment.title}`,
            "worth a quick 10min starter?"
          ];
        } else {
          responses = [
            `${nextCommitment.title} coming up soon`,
            "maybe just prep what you need for later?"
          ];
        }
      } else {
        const singleResponses = [
          "want to break this down? sometimes smaller steps feel less heavy",
          "what's one tiny thing you could try right now? like really tiny", 
          "sounds like a lot. maybe just 10 min to start and see how it feels?",
          "could chunk this into smaller pieces. what feels doable first?",
          "what feels most urgent? maybe start there and see where it goes"
        ];
        responses = [singleResponses[Math.floor(Math.random() * singleResponses.length)]];
      }
      
      const actions = isTask ? [
        { type: "generate_microsteps" as const, label: "Break into steps", data: { taskText: text } },
        { type: "add_to_planner" as const, label: "Add to planner", data: { taskText: text } }
      ] : undefined;
      
      // Send multiple bubbles with staggered timing
      responses.forEach((response, index) => {
        setTimeout(() => {
          const bubbleActions = index === responses.length - 1 ? actions : undefined;
          pushAssistant(response, undefined, bubbleActions);
        }, 500 + (index * 800));
      });
    }
  }

  async function handleAction(action: any, messageId: string) {
    if (action.type === "generate_microsteps") {
      // Show loading
      updateMessage(messageId, { 
        microsteps: ["Generating microsteps..."],
        actions: undefined 
      });
      
      try {
        const response = await fetch("/api/microsteps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskTitle: action.data.taskText,
            category: "other",
            estimateMin: 25
          })
        });
        
        const data = await response.json();
        updateMessage(messageId, { 
          microsteps: data.microsteps || ["Break task into smaller parts", "Set a timer for 15 minutes", "Start with the easiest step"],
          actions: [
            { type: "add_to_planner" as const, label: "Save to planner", data: { taskText: action.data.taskText, microsteps: data.microsteps } }
          ]
        });
      } catch (error) {
        updateMessage(messageId, { 
          microsteps: ["Break task into smaller parts", "Set a timer for 15 minutes", "Start with the easiest step"],
          actions: [
            { type: "add_to_planner" as const, label: "Save to planner", data: { taskText: action.data.taskText } }
          ]
        });
      }
    }
    
    if (action.type === "add_to_planner") {
      const task = {
        id: crypto.randomUUID(),
        title: action.data.taskText.slice(0, 50) + (action.data.taskText.length > 50 ? "..." : ""),
        estimateMin: 25,
        category: "other" as const,
        microsteps: action.data.microsteps || []
      };
      
      addTask(task);
      pushAssistant(`✅ Added "${task.title}" to your planner! You can find it in the Plan tab.`);
    }
  }

  return (
    <Shell>
      <ChatThread items={messages} onAction={handleAction} />
      <Composer onSend={handleSend} />
    </Shell>
  );
}
