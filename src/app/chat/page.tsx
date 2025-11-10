"use client";
import Shell from "@/components/Shell";
import ChatThread from "@/components/ChatThread";
import Composer from "@/components/Composer";
import AppWrapper from "@/components/AppWrapper";
import { useApp } from "@/lib/store";
import { MessageAction } from "@/types/app";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

function ChatPage() {
  const { messages, pushUser, pushAssistant, updateMessage, removeMessage, addTask, useGPT, schedule, tasks, userProfile } = useApp();
  const [calendarActionLoading, setCalendarActionLoading] = useState<string | undefined>();
  const [composerText, setComposerText] = useState("");
  const [addingToPlanner, setAddingToPlanner] = useState<string | undefined>();
  const [addingToCalendar, setAddingToCalendar] = useState<string | undefined>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for prompt parameter from URL and auto-fill composer
  useEffect(() => {
    const promptFromUrl = searchParams.get('prompt');
    if (promptFromUrl) {
      setComposerText(promptFromUrl);
      // Clear the URL parameter to avoid re-triggering on subsequent navigations
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('prompt');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

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
      hasUpcomingDeadlines: upcomingTasks.length > 3,
      timezone: userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
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
          { type: "add_to_planner" as const, label: "Add to planner", data: { taskText: text } },
          { type: "add_to_calendar" as const, label: "Add to calendar", data: { taskText: text } }
        ] : undefined;
        
        // Handle multiple bubbles
        if (data.bubbles && Array.isArray(data.bubbles)) {
          data.bubbles.forEach((bubble: string, index: number) => {
            setTimeout(() => {
              // Only add actions to the last bubble, and calendar prompt to first bubble
              const bubbleActions = index === data.bubbles.length - 1 ? actions : undefined;
              const calendarPrompt = index === 0 && data.calendarAction 
                ? sanitizeCalendarPrompt(data.calendarAction, text, bubble)
                : undefined;
              
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
          const replyText = data.reply ?? "Want a 20m block or to break it into micro-steps?";
          pushAssistant(replyText, messageId, undefined, actions);
          
          // Update with calendar prompt if present
          if (data.calendarAction) {
            const sanitizedPrompt = sanitizeCalendarPrompt(data.calendarAction, text, replyText);
            updateMessage(messageId, { calendarPrompt: sanitizedPrompt });
          }
        }
      } catch {
        // Remove thinking indicator
        removeMessage(thinkingId);
        
        const actions = isTask ? [
          { type: "add_to_planner" as const, label: "Add to planner", data: { taskText: text } },
          { type: "add_to_calendar" as const, label: "Add to calendar", data: { taskText: text } }
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
        { type: "add_to_planner" as const, label: "Add to planner", data: { taskText: text } },
        { type: "add_to_calendar" as const, label: "Add to calendar", data: { taskText: text } }
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
        console.error("Failed to add to planner via AI:", error);
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
    } else if (action.type === "add_to_calendar") {
      // Prevent multiple clicks
      if (addingToCalendar === messageId) return;
      
      const taskText = action.data?.taskText || "";
      
      // Immediate visual feedback
      setAddingToCalendar(messageId);
      updateMessage(messageId, { actions: undefined }); // Remove action buttons
      
      try {
        // Generate a clean title for the calendar event
        let titlePromise = Promise.resolve(taskText);
        if (taskText.length > 50 || taskText.includes('.') || taskText.includes('?') || taskText.includes('!')) {
          titlePromise = fetch('/api/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: taskText })
          }).then(res => res.json()).then(data => data.title || taskText).catch(() => taskText);
        }
        
        const eventTitle = await titlePromise;
        
        // Create a 1-hour work session starting in the next available time slot
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
        
        // Create calendar action for confirmation
        const calendarAction = sanitizeCalendarPrompt({
          type: 'create' as const,
          event: {
            title: eventTitle,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            description: `Work session: ${taskText}`,
          }
        }, taskText, `I'll create "${eventTitle}" in your calendar.`);
        
        // Show confirmation prompt
        const confirmationMessageId = crypto.randomUUID();
        pushAssistant(`I'll create "${eventTitle}" in your calendar for ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Is that okay?`, confirmationMessageId);
        updateMessage(confirmationMessageId, { calendarPrompt: calendarAction });
        
      } catch (error) {
        console.error("Failed to prepare calendar event:", error);
        pushAssistant("Sorry, I couldn't prepare the calendar event. Please try again.", undefined, undefined, undefined);
      } finally {
        setAddingToCalendar(undefined);
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

  return (
    <AppWrapper>
      <Shell>
        <ChatThread 
          items={messages} 
          onAction={handleAction} 
          onCalendarAction={handleCalendarAction}
          calendarActionLoading={calendarActionLoading}
          actionLoading={addingToPlanner || addingToCalendar}
        />
        <Composer 
          onSend={handleSend} 
          initialText={composerText}
          onTextChange={(text) => setComposerText(text)}
          accessory={(
            <>
              {[
                {
                  title: "Get started",
                  prompt: "Help me get started on this task and break it into microsteps.",
                  styles: "from-purple-50 to-purple-100 text-purple-700 border-purple-100"
                },
                {
                  title: "Figure out priority",
                  prompt: "Help me figure out the priority of what I should tackle next.",
                  styles: "from-blue-50 to-indigo-100 text-indigo-700 border-indigo-100"
                },
                {
                  title: "Edit calendar",
                  prompt: "Show me today's Google Calendar events and help me adjust anything that conflicts.",
                  styles: "from-slate-50 to-slate-100 text-slate-700 border-slate-100"
                }
              ].map((option) => (
                <button
                  key={option.title}
                  type="button"
                  onClick={() => setComposerText(option.prompt)}
                  className={`text-[11px] font-medium px-3 py-1 rounded-full border bg-gradient-to-r shadow-[0_1px_2px_rgba(15,23,42,0.08)] whitespace-nowrap transition-colors hover:brightness-95 ${option.styles}`}
                  title={option.prompt}
                >
                  {option.title}
                </button>
              ))}
            </>
          )}
        />
      </Shell>
    </AppWrapper>
  );
}

type CalendarActionData = {
  type: "create" | "update" | "delete";
  event: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
  };
  eventId?: string;
};

function sanitizeCalendarPrompt(action: CalendarActionData, userInput?: string, assistantText?: string) {
  if (!action?.event) return action;
  const updated = {
    ...action,
    event: { ...action.event }
  };
  updated.event.title = buildCalendarTitle(updated.event.title, userInput, assistantText);
  // DISABLE TIME ALIGNMENT - AI generates correct times, don't override them
  // alignEventTimesWithText(updated, assistantText, Intl.DateTimeFormat().resolvedOptions().timeZone);
  return updated;
}

function buildCalendarTitle(rawTitle?: string, userInput?: string, assistantText?: string) {
  const fallback = deriveTitleFromContext(userInput) ?? deriveTitleFromContext(assistantText) ?? "Study Session";
  if (!rawTitle) return fallback;
  const cleaned = normalizeCalendarTitle(rawTitle);
  if (!cleaned) return fallback;
  
  // Ban full user prompts being used as titles
  const banned = /(help me schedule|please schedule|add (this )?to (my )?calendar|schedule.*for|schedule.*time|time for my|^schedule time)/i;
  if (banned.test(rawTitle) || banned.test(cleaned)) {
    return fallback;
  }
  
  // If title is too long (likely a full sentence), use fallback
  if (cleaned.length > 20) {
    return fallback;
  }
  
  return cleaned;
}

function normalizeCalendarTitle(value: string) {
  if (!value) return "";
  let cleaned = value
    .replace(/[“”]/g, '"')
    .replace(/^[\"']+|[\"']+$/g, '')
    .trim();
  cleaned = cleaned.replace(/^[-–—:]+/, '').trim();
  cleaned = cleaned.replace(/[^A-Za-z0-9 '&-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return "";
  return cleaned
    .split(' ')
    .slice(0, 6)
    .map(word => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(' ');
}

function deriveTitleFromContext(text?: string) {
  if (!text) return null;
  
  // Look for quoted content
  const quoted = text.match(/"([^"]{2,80})"/);
  if (quoted) {
    return normalizeCalendarTitle(quoted[1]);
  }
  
  // Look for "my [subject] homework" pattern
  const homework = text.match(/my\s+([a-z]+)\s+homework/i);
  if (homework) {
    return normalizeCalendarTitle(homework[1] + " Homework");
  }
  
  // Look for "for my [subject]" pattern
  const forMy = text.match(/for\s+my\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (forMy) {
    return normalizeCalendarTitle(forMy[1]);
  }
  
  // Look for content after colon
  const afterColon = text.split(':').slice(1).join(':').trim();
  if (afterColon) {
    const sentence = afterColon.split(/[.?!\n]/)[0];
    const normalized = normalizeCalendarTitle(sentence);
    if (normalized) return normalized;
  }
  
  const leading = text.split(/[.?!\n]/)[0];
  return normalizeCalendarTitle(leading);
}

type SlotMention = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  dayToken?: "today" | "tomorrow";
};

function alignEventTimesWithText(action: CalendarActionData, assistantText?: string, timeZone?: string) {
  if (!assistantText) return;
  const slot = extractSlotMention(assistantText);
  if (!slot) return;
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const baseIso = new Date().toISOString();
  const startDate = buildZonedDate(slot.startHour, slot.startMinute, slot.dayToken, baseIso, zone);
  const endDate = buildZonedDate(slot.endHour, slot.endMinute, slot.dayToken, baseIso, zone);
  if (!startDate || !endDate) return;
  const previous = action.event.start ? Date.parse(action.event.start) : NaN;
  const diff = Number.isFinite(previous) ? Math.abs(previous - startDate.getTime()) : Infinity;
  if (diff > 5 * 60 * 1000) {
    action.event.start = startDate.toISOString();
    action.event.end = endDate.toISOString();
  }
}

function extractSlotMention(text: string): SlotMention | null {
  const rangeRegex = /(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)?(?:\s+(today|tomorrow))?/i;
  const match = rangeRegex.exec(text);
  if (!match) return null;
  const [, startRaw, startMeridiemRaw, endRaw, endMeridiemRaw, dayTokenRaw] = match;
  let startMeridiem = startMeridiemRaw;
  let endMeridiem = endMeridiemRaw;
  if (!startMeridiem && endMeridiem) startMeridiem = endMeridiem;
  if (!endMeridiem && startMeridiem) endMeridiem = startMeridiem;
  if (!startMeridiem || !endMeridiem) return null;
  const start = convertTo24Hour(startRaw, startMeridiem);
  const end = convertTo24Hour(endRaw, endMeridiem);
  if (!start || !end) return null;
  const normalizedDay = dayTokenRaw?.toLowerCase() === "tomorrow"
    ? "tomorrow"
    : dayTokenRaw?.toLowerCase() === "today"
      ? "today"
      : undefined;
  return {
    startHour: start.hour,
    startMinute: start.minute,
    endHour: end.hour,
    endMinute: end.minute,
    dayToken: normalizedDay
  };
}

function convertTo24Hour(value: string, meridiem: string) {
  if (!value) return null;
  const [hourPart, minutePart] = value.split(':');
  let hour = parseInt(hourPart, 10);
  const minute = minutePart ? parseInt(minutePart, 10) : 0;
  if (isNaN(hour) || isNaN(minute)) return null;
  const mer = meridiem.toLowerCase();
  hour = hour % 12;
  if (mer === "pm") hour += 12;
  return { hour, minute };
}

function buildZonedDate(
  hour: number,
  minute: number,
  dayToken: "today" | "tomorrow" | undefined,
  baseIso: string,
  timeZone: string
) {
  if (hour === undefined || minute === undefined) return null;
  const base = new Date(baseIso);
  const target = addDaysInZone(base, dayToken === "tomorrow" ? 1 : 0, timeZone);
  return zonedTimeToUtc(
    {
      year: target.year,
      month: target.month,
      day: target.day,
      hour,
      minute
    },
    timeZone
  );
}

function addDaysInZone(date: Date, days: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const future = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  const parts = formatter.formatToParts(future);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      map[part.type] = Number(part.value);
    }
  }
  return {
    year: map.year,
    month: map.month,
    day: map.day
  };
}

function zonedTimeToUtc(
  components: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
) {
  const utcDate = new Date(Date.UTC(components.year, components.month - 1, components.day, components.hour, components.minute, 0));
  const offset = getTimeZoneOffset(utcDate, timeZone);
  return new Date(utcDate.getTime() - offset);
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const { type, value } of parts) {
    if (type !== "literal") {
      map[type] = Number(value);
    }
  }
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second || 0);
  return asUTC - date.getTime();
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPage />
    </Suspense>
  );
}
