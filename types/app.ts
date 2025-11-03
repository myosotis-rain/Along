export type Sender = "user" | "assistant";

export type Message = {
  id: string; 
  text: string; 
  sender: Sender; 
  ts: number;
};

export type Task = {
  id: string; 
  title: string; 
  estimateMin: number;
  category: "study"|"writing"|"chores"|"admin"|"other";
  microsteps: string[];
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

export type AppState = {
  messages: Message[];
  tasks: Task[];
  sessions: FocusSession[];
  schedule: ScheduleItem[];
  prefs: Preferences;
  useGPT: boolean;
};