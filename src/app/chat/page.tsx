"use client";
import Shell from "@/components/Shell";
import ChatThread from "@/components/ChatThread";
import Composer from "@/components/Composer";
import AppWrapper from "@/components/AppWrapper";
import { useApp } from "@/lib/store";
import { MessageAction, CalendarAction } from "@/types/app";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface FreeTimeSlot {
  start: string;
  end: string;
  duration: number;
}

interface ScheduleContextEvent {
  id?: string;
  title: string;
  start: string;
  end: string;
  type: string;
  day?: string;
}

interface ScheduleContext {
  todaySchedule: ScheduleContextEvent[];
  upcomingWeek: ScheduleContextEvent[];
  freeTimeSlots: FreeTimeSlot[];
  currentTime: string;
  nextCommitment: ScheduleContextEvent | null;
}

export default function Page() {
  const { messages, pushUser, pushAssistant, updateMessage, removeMessage, addTask, useGPT, schedule, tasks } = useApp();
  const [calendarActionLoading, setCalendarActionLoading] = useState<string | undefined>();
  const [composerText, setComposerText] = useState("");
  const [addingToPlanner, setAddingToPlanner] = useState<string | undefined>();
  const router = useRouter();

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
    
    // Clear composer text and optimistic update
    setComposerText("");
    pushUser(text.trim());
    
    // Show thinking indicator
    const thinkingId = crypto.randomUUID();
    pushAssistant("THINKING_INDICATOR", thinkingId);
    
    const isTask = detectTask(text);
    
    // Fetch complete schedule context including Google Calendar events
    let scheduleContext: ScheduleContext | undefined;
    try {
      const scheduleRes = await fetch("/api/schedule/current");
      if (scheduleRes.ok) {
        scheduleContext = await scheduleRes.json() as ScheduleContext;
      }
    } catch {
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
        id: item.id,
        title: item.title,
        start: item.start,
        end: item.end,
        type: item.type,
        day: new Date(item.start).toLocaleDateString('en', { weekday: 'short' })
      }));
      
      scheduleContext = {
        todaySchedule: todaySchedule.map(item => ({
          id: item.id,
          title: item.title,
          start: item.start,
          end: item.end,
          type: item.type
        })),
        upcomingWeek,
        freeTimeSlots: [],
        currentTime: now.toISOString(),
        nextCommitment: todaySchedule.length > 0 ? {
          id: todaySchedule[0].id,
          title: todaySchedule[0].title,
          start: todaySchedule[0].start,
          end: todaySchedule[0].end,
          type: todaySchedule[0].type
        } : null
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
        
        // Remove thinking indicator
        removeMessage(thinkingId);
        
        // Add action buttons if this seems like a task
        const actions = isTask ? [
          { type: "add_to_planner" as const, label: "Add to planner", data: { taskText: text } }
        ] : undefined;
        
        // Handle multiple bubbles
        if (data.bubbles && Array.isArray(data.bubbles)) {
          data.bubbles.forEach((bubble: string, index: number) => {
            setTimeout(() => {
              // Only add actions to the last bubble, and calendar prompt to first bubble
              const bubbleActions = index === data.bubbles.length - 1 ? actions : undefined;
              const calendarPrompt = index === 0 && data.calendarAction ? data.calendarAction : undefined;
              
              const messageId = crypto.randomUUID();
              pushAssistant(bubble, messageId, undefined, bubbleActions);
              
              // Update with calendar prompt if present
              if (calendarPrompt) {
                updateMessage(messageId, { calendarPrompt });
              }
            }, index * 800); // Stagger bubbles by 800ms
          });
        } else {
          const messageId = crypto.randomUUID();
          pushAssistant(data.reply ?? "Want a 20m block or to break it into micro-steps?", messageId, undefined, actions);
          
          // Update with calendar prompt if present
          if (data.calendarAction) {
            updateMessage(messageId, { calendarPrompt: data.calendarAction });
          }
        }
      } catch {
        // Remove thinking indicator
        removeMessage(thinkingId);
        
        const actions = isTask ? [
          { type: "add_to_planner" as const, label: "Add to planner", data: { taskText: text } }
        ] : undefined;
        pushAssistant("connection's wonky but I'm here. what's one small thing we could try?", undefined, undefined, actions);
      }
    } else {
      // Local fallback responses with schedule awareness
      let responses: string[] = [];
      const freeSlots = contextInfo.freeTimeSlots || [];
      const nextCommitment = contextInfo.nextCommitment;
      
      if (isTask && freeSlots.length > 0) {
        const longestSlot = freeSlots.reduce((longest: FreeTimeSlot, slot: FreeTimeSlot) => 
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
        { type: "add_to_planner" as const, label: "Add to planner", data: { taskText: text } }
      ] : undefined;
      
      // Remove thinking indicator
      removeMessage(thinkingId);
      
      // Send multiple bubbles with staggered timing
      responses.forEach((response, index) => {
        setTimeout(() => {
          const bubbleActions = index === responses.length - 1 ? actions : undefined;
          pushAssistant(response, undefined, undefined, bubbleActions);
        }, 500 + (index * 800));
      });
    }
  }

  async function handleAction(action: MessageAction, messageId: string) {
    if (action.type === "add_to_planner") {
      // Prevent multiple clicks
      if (addingToPlanner === messageId) return;
      
      const taskText = action.data?.taskText || "";
      
      // Immediate visual feedback
      setAddingToPlanner(messageId);
      updateMessage(messageId, { actions: undefined }); // Remove action buttons
      pushAssistant("✅ Adding to planner...", undefined, undefined, undefined);
      
      // Immediate navigation
      router.push('/');
      
      // Generate clean title and microsteps in the background
      try {
        // Generate title if text is long or contains multiple sentences
        let titlePromise = Promise.resolve(taskText);
        if (taskText.length > 50 || taskText.includes('.') || taskText.includes('?') || taskText.includes('!')) {
          titlePromise = fetch('/api/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: taskText })
          }).then(res => res.json()).then(data => data.title || taskText).catch(() => taskText);
        }
        
        // Generate microsteps
        const microstepsPromise = fetch("/api/microsteps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskTitle: taskText,
            category: "other",
            estimateMin: 25
          })
        }).then(res => res.json()).then(data => data.microsteps || []).catch(() => 
          ["Break task into smaller parts", "Set a timer for 15 minutes", "Start with the easiest step"]
        );
        
        // Wait for both to complete
        const [taskTitle, microsteps] = await Promise.all([titlePromise, microstepsPromise]);
        
        const task = {
          id: crypto.randomUUID(),
          title: taskTitle,
          description: taskText,
          estimateMin: 25,
          category: "other" as const,
          microsteps
        };
        
        addTask(task);
      } catch (error) {
        // Fallback task creation if APIs fail
        const task = {
          id: crypto.randomUUID(),
          title: taskText.slice(0, 50) + (taskText.length > 50 ? "..." : ""),
          description: taskText,
          estimateMin: 25,
          category: "other" as const,
          microsteps: ["Break task into smaller parts", "Set a timer for 15 minutes", "Start with the easiest step"]
        };
        
        addTask(task);
      } finally {
        setAddingToPlanner(undefined);
      }
    }
  }

  async function handleCalendarAction(action: 'approve' | 'deny', messageId: string) {
    const message = messages.find(m => m.id === messageId);
    if (!message?.calendarPrompt) return;

    if (action === 'deny') {
      // Remove the calendar prompt and show denial message
      updateMessage(messageId, { calendarPrompt: undefined });
      pushAssistant("No problem! I won't make that calendar change.", undefined, undefined, undefined);
      return;
    }

    // Approve - execute the calendar action
    setCalendarActionLoading(messageId);
    
    try {
      const calendarAction = message.calendarPrompt;
      
      if (calendarAction.type === 'create') {
        const response = await fetch('/api/gcal/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarId: 'primary',
            title: calendarAction.event.title,
            startISO: calendarAction.event.start,
            endISO: calendarAction.event.end,
            description: calendarAction.event.description,
            location: calendarAction.event.location,
          }),
        });

        if (response.ok) {
          updateMessage(messageId, { calendarPrompt: undefined });
          pushAssistant(`✅ Created "${calendarAction.event.title}" in your calendar!`, undefined, undefined, undefined);
        } else {
          throw new Error('Failed to create calendar event');
        }
      } else if (calendarAction.type === 'update' && calendarAction.eventId) {
        const response = await fetch(`/api/gcal/events/${calendarAction.eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: calendarAction.event.title,
            startISO: calendarAction.event.start,
            endISO: calendarAction.event.end,
            description: calendarAction.event.description,
            location: calendarAction.event.location,
          }),
        });

        if (response.ok) {
          updateMessage(messageId, { calendarPrompt: undefined });
          pushAssistant(`✅ Updated "${calendarAction.event.title}" in your calendar!`, undefined, undefined, undefined);
        } else {
          throw new Error('Failed to update calendar event');
        }
      } else if (calendarAction.type === 'delete') {
        console.log('Delete action received:', JSON.stringify(calendarAction, null, 2));
        
        if (!calendarAction.eventId) {
          throw new Error('No eventId provided for deletion');
        }
        
        console.log('Attempting to delete event:', calendarAction.eventId);
        const response = await fetch(`/api/gcal/events/${calendarAction.eventId}`, {
          method: 'DELETE',
        });

        console.log('Delete response status:', response.status);
        const responseText = await response.text();
        console.log('Delete response body:', responseText);

        if (response.ok) {
          updateMessage(messageId, { calendarPrompt: undefined });
          pushAssistant(`✅ Deleted "${calendarAction.event.title}" from your calendar!`, undefined, undefined, undefined);
        } else {
          throw new Error(`Failed to delete calendar event: ${response.status} - ${responseText}`);
        }
      }
    } catch (error) {
      console.error('Calendar action failed:', error);
      pushAssistant("Sorry, I couldn't complete that calendar action. Please try again or do it manually.", undefined, undefined, undefined);
    } finally {
      setCalendarActionLoading(undefined);
    }
  }

  // Simple floating bubbles for feature discovery
  function SuggestionBubbles() {
    const bubbles = [
      { text: "Schedule", prompt: "What's on my schedule today?" },
      { text: "Tasks", prompt: "Help me break down a task" },
      { text: "Calendar", prompt: "Add a meeting to my calendar" },
      { text: "Planning", prompt: "Help me plan my day" }
    ];

    if (messages.length > 2) return null; // Hide once conversation starts

    return (
      <div className="px-4 pb-4 max-w-xl mx-auto">
        <div className="flex flex-wrap gap-2 justify-center">
          {bubbles.map((bubble) => (
            <button
              key={bubble.text}
              onClick={() => setComposerText(bubble.prompt)}
              className="px-4 py-2 bg-gray-100/80 hover:bg-gray-200/80 rounded-full text-sm text-gray-700 hover:text-gray-900 transition-all duration-200 hover:shadow-sm border border-gray-200/60"
            >
              {bubble.text}
            </button>
          ))}
        </div>
      </div>
    );
  }


  return (
    <AppWrapper>
      <Shell>
        <ChatThread 
          items={messages} 
          onAction={handleAction} 
          onCalendarAction={handleCalendarAction}
          calendarActionLoading={calendarActionLoading}
          actionLoading={addingToPlanner}
        />
        <SuggestionBubbles />
        <Composer 
          onSend={handleSend} 
          initialText={composerText}
          onTextChange={(text) => setComposerText(text)}
        />
      </Shell>
    </AppWrapper>
  );
}
