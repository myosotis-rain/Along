"use client";
import { useApp } from "@/lib/store";

export default function DataManager() {
  const { messages, tasks, sessions, schedule, prefs, useGPT } = useApp();

  const exportData = () => {
    const data = {
      messages,
      tasks,
      sessions,
      schedule: schedule.filter(item => !item.id?.includes('google')), // Exclude Google events
      prefs,
      useGPT,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `along-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.removeItem('along-app-storage');
      window.location.reload();
    }
  };

  const stats = {
    messages: messages.length,
    tasks: tasks.length,
    sessions: sessions.length,
    localSchedule: schedule.filter(item => !item.id?.includes('google')).length
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Local Data Storage</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-lg text-purple-600">{stats.messages}</div>
            <div className="text-xs text-gray-600">Chat messages</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-lg text-purple-600">{stats.tasks}</div>
            <div className="text-xs text-gray-600">Tasks</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-lg text-purple-600">{stats.sessions}</div>
            <div className="text-xs text-gray-600">Focus sessions</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-lg text-purple-600">{stats.localSchedule}</div>
            <div className="text-xs text-gray-600">Local events</div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-green-800">Private & Local</span>
          </div>
          <div className="text-green-700">All your data is stored locally in your browser. Nothing is sent to external servers unless you explicitly enable Google Calendar sync.</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
          >
            Export Backup
          </button>
          <button
            onClick={clearAllData}
            className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Clear All Data
          </button>
        </div>
      </div>

    </div>
  );
}
