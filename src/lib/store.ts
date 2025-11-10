import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState, Message, MessageAction, Task, FocusSession, ScheduleItem, UserProfile } from "@/types/app";

const initial: AppState = {
  messages: [{
    id: crypto.randomUUID(),
    text: "hey, I'm Along. what's going on today? we can break things down or just figure out where to start",
    sender: "assistant", 
    ts: Date.now()
  }],
  tasks: [], 
  sessions: [], 
  schedule: [],
  prefs: { checkInMin: 20, doNotNag: true, privacyLocalOnly: true },
  useGPT: true,
  userProfile: {
    id: crypto.randomUUID(),
    name: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hasConnectedGoogleCalendar: false,
    onboardingCompleted: false
  }
};

type Actions = AppState & {
  pushUser: (text: string) => void;
  pushAssistant: (text: string, id?: string, microsteps?: string[], actions?: MessageAction[]) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  addTask: (t: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addSchedule: (s: ScheduleItem) => void;
  removeSchedule: (id: string) => void;
  addSession: (s: FocusSession) => void;
  updatePrefs: (prefs: Partial<AppState['prefs']>) => void;
  updateUseGPT: (useGPT: boolean) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
};

export const useApp = create<Actions>()(
  persist(
    (set) => ({
      ...initial,
      pushUser: (text) => set(s => ({ 
        messages: [...s.messages, {
          id: crypto.randomUUID(),
          text, 
          sender: "user", 
          ts: Date.now()
        }] 
      })),
      pushAssistant: (text, id, microsteps, actions) => set(s => ({ 
        messages: [...s.messages, {
          id: id || crypto.randomUUID(),
          text, 
          sender: "assistant", 
          ts: Date.now(),
          microsteps,
          actions
        }] 
      })),
      updateMessage: (id, updates) => set(s => ({
        messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m)
      })),
      removeMessage: (id) => set(s => ({
        messages: s.messages.filter(m => m.id !== id)
      })),
      addTask: (t) => set(s => ({ tasks: [t, ...s.tasks] })),
      updateTask: (id, updates) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      removeTask: (id) => set(s => ({
        tasks: s.tasks.filter(t => t.id !== id)
      })),
      addSchedule: (e) => set(s => ({ schedule: [...s.schedule, e] })),
      removeSchedule: (id) => set(s => ({
        schedule: s.schedule.filter(e => e.id !== id)
      })),
      addSession: (s) => set(state => ({ sessions: [...state.sessions, s] })),
      updatePrefs: (prefs) => set(s => ({ prefs: { ...s.prefs, ...prefs } })),
      updateUseGPT: (useGPT) => set({ useGPT }),
      updateUserProfile: (updates) => set(s => ({ 
        userProfile: { ...s.userProfile, ...updates } 
      })),
      completeOnboarding: () => set(s => ({ 
        userProfile: { ...s.userProfile, onboardingCompleted: true } 
      })),
    }),
    {
      name: 'along-app-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data, exclude sensitive info
      partialize: (state) => ({
        messages: state.messages,
        tasks: state.tasks,
        sessions: state.sessions,
        schedule: state.schedule.filter(item => !item.id?.includes('google')), // Exclude Google events
        prefs: state.prefs,
        useGPT: state.useGPT,
        userProfile: state.userProfile,
      }),
    }
  )
);

export function getCurrentUserId(): string {
  return useApp.getState().userProfile.id;
}

export function createAuthHeaders(): Headers {
  const headers = new Headers();
  headers.set("x-user-id", getCurrentUserId());
  return headers;
}

export function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = createAuthHeaders();
  
  // Merge with existing headers if any
  if (options.headers) {
    if (options.headers instanceof Headers) {
      authHeaders.forEach((value, key) => {
        (options.headers as Headers).set(key, value);
      });
    } else {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          authHeaders.set(key, value);
        }
      });
    }
  }
  
  return fetch(url, {
    ...options,
    headers: authHeaders,
  });
}