export type Sender = "user" | "assistant";

export type MessageAction = {
  type: "generate_microsteps" | "add_to_planner" | "start_focus" | "calendar_action";
  label: string;
  data?: {
    taskText?: string;
    microsteps?: string[];
    calendarAction?: CalendarAction;
    [key: string]: unknown;
  };
};

export type CalendarAction = {
  type: 'create' | 'update' | 'delete';
  event: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
  };
  eventId?: string;
};

export type Message = {
  id: string; 
  text: string; 
  sender: Sender; 
  ts: number;
  microsteps?: string[];
  actions?: MessageAction[];
  calendarPrompt?: CalendarAction;
};

export type Task = {
  id: string; 
  title: string; 
  estimateMin: number;
  category: "study"|"writing"|"chores"|"admin"|"other";
  microsteps: string[];
  completedSteps?: boolean[];
  priority?: "high" | "medium" | "low";
  dueDate?: string; // ISO date string
  createdAt?: string; // ISO date string
};

export type FocusSession = {
  id: string; 
  taskId?: string; 
  plannedMin: number; 
  actualMin: number; 
  at: string;
};

export type ScheduleItem = {
  id: string;
  type: "focus"|"class"|"meeting"|"personal";
  title: string;
  start: string; // ISO
  end: string;   // ISO
  taskId?: string;
};

export type Preferences = {
  checkInMin: number; 
  doNotNag: boolean; 
  privacyLocalOnly: boolean;
};

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  timezone: string;
  hasConnectedGoogleCalendar: boolean;
  onboardingCompleted: boolean;
};

export type AppState = {
  messages: Message[];
  tasks: Task[];
  sessions: FocusSession[];
  schedule: ScheduleItem[];
  prefs: Preferences;
  useGPT: boolean;
  userProfile: UserProfile;
};