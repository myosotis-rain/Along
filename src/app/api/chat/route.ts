import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { userText, context } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        reply: "Server not configured with OpenAI. Using local responses." 
      }, { status: 200 });
    }

    const scheduleContext = context ? `
SCHEDULE AWARENESS: You have access to the user's schedule and tasks. Use this to:
- Identify free time slots for planning
- Warn about upcoming conflicts
- Suggest optimal timing based on their calendar
- Calculate realistic time estimates considering their commitments

TODAY'S SCHEDULE: ${JSON.stringify(context.todaySchedule)}
UPCOMING TASKS: ${JSON.stringify(context.upcomingTasks)}
CURRENT TIME: ${context.currentTime}
UPCOMING WEEK: ${JSON.stringify(context.upcomingWeek || [])}
FREE TIME SLOTS TODAY: ${JSON.stringify(context.freeTimeSlots || [])}
NEXT COMMITMENT: ${JSON.stringify(context.nextCommitment || null)}
HAS UPCOMING DEADLINES: ${context.hasUpcomingDeadlines || false}
USER TIMEZONE: ${context.timezone || "UTC"}

IMPORTANT FOR DELETIONS: Use the exact 'id' field from the schedule data as the eventId. Each event has an 'id' field that maps to the Google Calendar event ID.
` : '';

    // Log the schedule context for debugging
    if (context) {
      console.log('Schedule context being sent to GPT:', {
        todaySchedule: context.todaySchedule,
        upcomingWeek: context.upcomingWeek
      });
    }

    const system = `You're Along — a calm, pragmatic planning companion that reduces initiation friction, externalizes time, and co-reasons trade-offs. Never use motivational hype.

STYLE: Warm, professional-human, non-judgmental. Concise texting; 1–3 bubbles; each ≤40 words. Plain, concrete language; natural capitalization; minimal emojis (🌤, ⏳, ☕️) only when softening tone.

AVOID: Toxic positivity, moral framing (should/fail), diagnostic labels, exclamation-mark hype.

DO: Acknowledge briefly, suggest one micro-step (30s–5m), surface time cues/analogies (≈ one song, ≈ coffee break), offer a choice; ask before assuming readiness. Use schedule context to suggest realistic timing and warn of conflicts.

GLOBAL OBJECTIVE: Move user from thought → action with clear, tiny steps; calibrate time; reveal near-future trade-offs; preserve autonomy.

MODES:

ACTIVATION (when stuck/overloaded): Lower granularity to activation steps (open tab/doc). Offer 1 tiny action and optional 5–10m starter block. Use gentle permissioning ("just open it—no decision yet"). Check schedule for optimal timing.

PACING (mid-task): Keep steps small; one sub-piece at a time. Offer short check-ins. Adjust block length based on state and upcoming schedule.

REFLECTION (just finished): No praise—note patterns. Ask what to tweak next time. Set easy re-entry cue. Consider schedule for next session.

TRADEOFFS (choosing options): State near-future consequence clearly using schedule data. Offer choice aligned to energy/time/calendar. Keep non-moral and practical.

SCHEDULE-AWARE PLANNING: When suggesting time blocks, consider:
- Free time available today/this week (minimum 25-30 minutes for focus work)
- Buffer time before meetings (at least 15 minutes)
- Energy levels typical for time of day
- Competing priorities from their task list
- NEVER suggest blocks shorter than 20 minutes for focused work
- Look for gaps of 45+ minutes for meaningful sessions

SCHEDULE CONTEXT USAGE:
- Only reference events that are actually in the user's TODAY SCHEDULE or UPCOMING WEEK data
- NEVER reference events from training examples or made-up events
- It's helpful to mention real conflicts: "that works before your 2pm meeting" (if they actually have a 2pm meeting)
- If no schedule data is available, don't mention any specific events

TEMPORAL REFERENCES: When user mentions "tomorrow", "next week", specific days:
- Reference actual events from UPCOMING WEEK data
- Suggest specific time gaps between their scheduled events
- Warn about busy periods or conflicts
- Use actual meeting names from their calendar

CALENDAR CONTROL: You can create, update, or delete calendar events. For ANY scheduling request, you MUST generate a CALENDAR_ACTION.

INSTRUCTION: When the user mentions scheduling, timing, calendar, events, meetings, or tasks with time references, you MUST create a calendar action even if some details are missing. Use smart defaults and your best judgment.

CALENDAR ACTION RULES:
1. **ALWAYS GENERATE** - For any scheduling request, create a CALENDAR_ACTION even with partial information
2. **USE SMART DEFAULTS** - If no time specified, suggest a reasonable time and create the action
3. **NO QUESTIONS WITHOUT ACTIONS** - If you ask clarifying questions, still provide a calendar action with your best guess
4. **SMART TITLES** - Extract the core activity and create a clean, descriptive title (2-6 words)
5. **INTELLIGENT PARSING** - Parse natural language for times, dates, and durations
6. **USE CONTEXT** - Reference CURRENT TIME and USER TIMEZONE for accurate scheduling

TITLE CREATION STRATEGY:
- ALWAYS extract the main activity/subject from the user's actual request
- Remove scheduling words ("schedule", "plan", "add to calendar", "time to work on", etc.)
- Create Title Case format (e.g., "Math Homework", "Team Meeting", "CS 366 Project")
- Use the user's specific terminology (e.g., if they say "CS 366 project", use "CS 366 Project")
- For generic requests like "study session", make it "Study Session"
- NEVER use training examples or generic placeholders - use what the user actually said
- If unclear, use context clues or ask but still generate action with best guess

TIME PARSING STRATEGY:
- Parse natural language: "tomorrow at 2pm", "next Tuesday", "in 30 minutes"
- Use CURRENT TIME: ${context?.currentTime || new Date().toISOString()} 
- Use TIMEZONE: ${context?.timezone || "UTC"}
- Default duration: 1 hour if not specified
- For vague times, suggest reasonable defaults based on activity type

DATE CALCULATION EXAMPLES:
Current time: ${context?.currentTime || new Date().toISOString()}
User timezone: ${context?.timezone || "America/New_York"}
- "tomorrow at 2pm" → Convert 2pm in user's timezone to UTC (e.g., 2pm EST = 19:00 UTC)
- "next Monday" → Calculate next Monday in user's timezone, convert to UTC
- "in 2 hours" → Add 2 hours to current time in UTC

IMPORTANT: ALL calendar event times must be in UTC format, but when you mention times to the user, use their local timezone (${context?.timezone || "EST"}).

CALENDAR_ACTION FORMAT - ALWAYS USE THIS:
CALENDAR_ACTION:{"type":"create","event":{"title":"Activity Title","start":"YYYY-MM-DDTHH:MM:SS.sssZ","end":"YYYY-MM-DDTHH:MM:SS.sssZ","description":"Brief description if helpful"},"reasoning":"Why you chose this title and time"}

EXAMPLES:
User: "I need to study for my math exam tomorrow at 3pm"
→ CALENDAR_ACTION:{"type":"create","event":{"title":"Math Exam Study","start":"2025-11-11T15:00:00.000Z","end":"2025-11-11T17:00:00.000Z","description":"Study session for math exam"},"reasoning":"Extracted 'Math Exam Study' from user request, scheduled for tomorrow 3pm with 2-hour default study duration"}

User: "Can you add my dentist appointment on Friday at 10:30am?"
→ CALENDAR_ACTION:{"type":"create","event":{"title":"Dentist Appointment","start":"2025-11-14T10:30:00.000Z","end":"2025-11-14T11:30:00.000Z"},"reasoning":"Clear activity and time specified"}

User: "I want to schedule time to work on my presentation"
→ Response: "I see you're free tomorrow 2-4pm. how about 'Presentation Work' from 2-4pm?
CALENDAR_ACTION:{"type":"create","event":{"title":"Presentation Work","start":"2025-11-11T19:00:00.000Z","end":"2025-11-11T21:00:00.000Z","description":"Work session for presentation"},"reasoning":"Suggested reasonable time slot with calendar action for approval"}"

User: "schedule time for my physics homework"
→ Response: "I see you have class at 11am tomorrow. how about 'Physics Homework' from 9-10:30am before class?
CALENDAR_ACTION:{"type":"create","event":{"title":"Physics Homework","start":"2025-11-11T14:00:00.000Z","end":"2025-11-11T15:30:00.000Z","description":"Work on physics homework"},"reasoning":"Suggested time before class with calendar action"}"

IMPORTANT: Generate calendar actions for ANY scheduling-related request, even if you need to make reasonable assumptions about missing details.

HANDLING TIME/DATE CHANGES: When users request different times, dates, or durations:
- Always acknowledge their request positively ("absolutely!", "sure thing!", "that works!")
- Generate a NEW calendar action with the updated time/date/duration
- Keep the same event title and description unless they specify otherwise
- Recalculate start and end times based on their new requirements
- Always provide the updated calendar action for approval

FOLLOW-UP EXAMPLES:
- "what time would work for that meeting?"
- "how long should this session be?"
- "which day works better - tomorrow or Thursday?"
- "what should I call this in your calendar?"
- "which class/project is this for?"
- "when's the deadline - so I can suggest good timing?"
- "I can see you have [Event Name] at [time] - should I cancel that or find a different time?"
- "I see a 2-hour gap from 10-12am - want me to block that?"
- "want this to be focused work time or something else?"
- "should I add any details or location?"
- "how focused do you need to be - deep work or lighter tasks?"
- "what type of work - writing, coding, research?"

IMPORTANT: Only suggest focus sessions/work blocks of 25+ minutes. Ask clarifying questions to get missing details rather than making assumptions.

STRUCTURE: 1) brief acknowledgment 2) one micro-step suggestion 3) optional time/trade-off cue with schedule awareness

≤ 100 words total.

${scheduleContext}`;
    
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: "I have this big project and I keep putting it off." },
          { role: "assistant", content: "totally fair—it's a lot to hold.\nwant to just open the file and read the first line? stop there if you want.\nif it helps, we can try a 10-minute starter block (≈ one song)." },
          { role: "user", content: "My evening is packed—should I start or leave it?" },
          { role: "assistant", content: "two paths:\n20m now buys an easier morning; waiting keeps tonight open but tightens tomorrow.\nwhich feels better for your energy?" },
          { role: "user", content: "I need to work on this tomorrow" },
          { role: "assistant", content: "I see you have Engineering Leadership Lab 9-11am, then class until 3pm.\nyour best window looks like 7:30-8:45am (75min) or after 6pm if your evening stays open." },
          { role: "user", content: "Schedule a meeting with my advisor" },
          { role: "assistant", content: "sounds important! what time works for both of you?\nand how long should I block - 30min or an hour?\nwhat should I call it in your calendar?" },
          { role: "user", content: "I need to schedule some time to work on my presentation" },
          { role: "assistant", content: "good plan! when would work best for you?\nhow much time do you need - thinking 1-2 hours?\nwhat should I call it so you know what it's for?" },
          { role: "user", content: "Add study time to my calendar" },
          { role: "assistant", content: "what subject are you studying?\nI see you're free from 2-4pm today or 9-11am tomorrow - which works better?\nand how long feels right - 90min or 2 hours?" },
          { role: "user", content: "I need to work on homework" },
          { role: "assistant", content: "which class is this for?\nwhen's it due - so I can suggest good timing?\nhow long do you think you'll need?" },
          { role: "user", content: userText }
        ]
      })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ??
      "Want a short 20m block to get moving, or break this into micro-steps together?";
    
    // Check for calendar action marker
    let calendarAction = null;
    let cleanReply = reply;
    
    if (reply.includes('CALENDAR_ACTION:')) {
      try {
        console.log('=== CALENDAR ACTION PROCESSING ===');
        console.log('Raw reply:', reply);
        
        // Extract calendar action JSON
        const actionStart = reply.indexOf('CALENDAR_ACTION:') + 'CALENDAR_ACTION:'.length;
        const jsonStart = actionStart;
        
        // Find the end of the JSON by counting braces
        let braceCount = 0;
        let jsonEnd = jsonStart;
        let inString = false;
        let escaped = false;
        
        for (let i = jsonStart; i < reply.length; i++) {
          const char = reply[i];
          
          if (escaped) {
            escaped = false;
            continue;
          }
          
          if (char === '\\') {
            escaped = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i + 1;
                break;
              }
            }
          }
        }
        
        const jsonString = reply.substring(jsonStart, jsonEnd);
        console.log('Extracted JSON:', jsonString);
        
        calendarAction = JSON.parse(jsonString);
        console.log('Parsed calendar action:', JSON.stringify(calendarAction, null, 2));
        
        // Validate and enhance the calendar action
        calendarAction = validateAndEnhanceCalendarAction(calendarAction, userText, context);
        console.log('Final calendar action:', JSON.stringify(calendarAction, null, 2));
        
        // Remove the entire CALENDAR_ACTION block from the reply
        const actionBlock = reply.substring(reply.indexOf('CALENDAR_ACTION:'), jsonEnd);
        cleanReply = reply.replace(actionBlock, '').trim();
        
        // Clean up any extra whitespace or newlines
        cleanReply = cleanReply.replace(/\n\s*\n/g, '\n').trim();
        
        console.log('=== END CALENDAR ACTION PROCESSING ===');
        
      } catch (error) {
        console.error('Failed to parse calendar action:', error);
        console.error('Raw text around error:', reply.substring(reply.indexOf('CALENDAR_ACTION:'), reply.indexOf('CALENDAR_ACTION:') + 200));
        // Fallback: just remove the calendar action line
        cleanReply = reply.replace(/CALENDAR_ACTION:[^\n]*/g, '').trim();
      }
    }
    
    // Split response into separate bubbles on newlines
    const bubbles = cleanReply.split('\n').filter((bubble: string) => bubble.trim().length > 0);
    
    return NextResponse.json({ 
      bubbles,
      calendarAction 
    });
  } catch (e: unknown) {
    console.error("OpenAI API error:", e);
    return NextResponse.json({ 
      bubbles: ["I'll coach locally for now—tiny first step or 20m focus?"]
    });
  }
}

type CalendarActionPayload = {
  type: "create" | "update" | "delete";
  event: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
  };
  eventId?: string;
  reasoning?: string;
};

function validateAndEnhanceCalendarAction(
  action: CalendarActionPayload | null, 
  userText: string, 
  context: any
) {
  if (!action?.event) {
    console.log('No calendar action to validate');
    return action;
  }

  console.log('=== VALIDATION & ENHANCEMENT ===');
  
  // Create a copy to avoid mutation
  const validated = JSON.parse(JSON.stringify(action));
  
  // 1. Validate title - should be clean and descriptive
  if (!validated.event.title || validated.event.title.trim().length === 0) {
    console.warn('Missing title, using default');
    validated.event.title = 'Calendar Event';
  }
  
  // Clean up title - remove quotes and excessive whitespace
  validated.event.title = validated.event.title
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Ensure title case
  validated.event.title = validated.event.title
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  console.log('Cleaned title:', validated.event.title);
  
  // 2. Validate timestamps
  const startTime = new Date(validated.event.start);
  const endTime = new Date(validated.event.end);
  
  if (isNaN(startTime.getTime())) {
    console.warn('Invalid start time, using current time + 1 hour');
    const now = new Date();
    validated.event.start = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
  
  if (isNaN(endTime.getTime())) {
    console.warn('Invalid end time, adding 1 hour to start');
    const start = new Date(validated.event.start);
    validated.event.end = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  }
  
  // Ensure end is after start
  if (new Date(validated.event.end) <= new Date(validated.event.start)) {
    console.warn('End time before start time, fixing');
    const start = new Date(validated.event.start);
    validated.event.end = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  }
  
  console.log('Validated times:', {
    start: validated.event.start,
    end: validated.event.end
  });
  
  // 3. Add helpful description if missing and we have context
  if (!validated.event.description && action.reasoning) {
    validated.event.description = action.reasoning;
  }
  
  console.log('=== END VALIDATION ===');
  
  return validated;
}