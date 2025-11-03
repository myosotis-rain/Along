"use client";
import Shell from "@/components/Shell";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { formatDuration } from "@/lib/utils";

export default function PlannerPage() {
  const { tasks, addTask, updateTask } = useApp();
  const [title, setTitle] = useState("");
  const [loadingSteps, setLoadingSteps] = useState<string | null>(null);

  function toggleMicrostep(taskId: string, stepIndex: number) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const completedSteps = task.completedSteps || new Array(task.microsteps.length).fill(false);
    completedSteps[stepIndex] = !completedSteps[stepIndex];
    
    updateTask(taskId, { completedSteps });
  }

  function addNewTask() {
    const t = title.trim(); 
    if (!t) return;
    
    addTask({ 
      id: crypto.randomUUID(), 
      title: t, 
      estimateMin: 20, 
      category: "other", 
      microsteps: [] 
    });
    setTitle("");
  }

  async function generateMicrosteps(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task || loadingSteps === id) return;
    
    setLoadingSteps(id);
    
    try {
      const response = await fetch("/api/microsteps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          category: task.category,
          estimateMin: task.estimateMin
        })
      });
      
      const data = await response.json();
      updateTask(id, { microsteps: data.microsteps || [] });
    } catch (error) {
      console.error("Failed to generate microsteps:", error);
      
      // Fallback to simple local generation
      const fallback = [
        "Break this task into smaller, manageable parts",
        "Set up your workspace with needed materials",
        "Set a timer for focused work (15-25 minutes)",
        "Start with the easiest or most urgent part"
      ];
      updateTask(id, { microsteps: fallback });
    } finally {
      setLoadingSteps(null);
    }
  }

  return (
    <Shell>
      <div className="mb-4">
        <h1 className="text-lg font-semibold mb-3">Planner</h1>
        <div className="card p-3 flex gap-2">
          <input 
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="What do you need to get done?" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addNewTask()}
          />
          <button 
            onClick={addNewTask} 
            className="px-4 py-2 rounded-full bg-cta text-white text-sm font-medium"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="card p-4 text-sm text-gray-600 text-center">
            Add your first task above to get started!
          </div>
        )}
        {tasks.map(t => (
          <div key={t.id} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="font-medium text-gray-900">{t.title}</div>
              <div className="text-xs text-gray-500">{formatDuration(t.estimateMin)}</div>
            </div>
            
            {t.microsteps.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700 mb-2">Microsteps:</div>
                <div className="space-y-2">
                  {t.microsteps.map((step, idx) => {
                    const isCompleted = t.completedSteps?.[idx] || false;
                    return (
                      <div key={idx} className="flex items-start gap-3 cursor-pointer group" onClick={() => toggleMicrostep(t.id, idx)}>
                        <div className="mt-0.5 w-4 h-4 flex-shrink-0">
                          {isCompleted ? (
                            <svg className="w-4 h-4 text-fuchsia-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                              <circle cx="10" cy="10" r="8" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm transition-all ${
                          isCompleted 
                            ? 'text-gray-500 line-through' 
                            : 'text-gray-700 group-hover:text-gray-900'
                        }`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => generateMicrosteps(t.id)} 
                disabled={loadingSteps === t.id}
                className="px-3 py-1 rounded-full border text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center"
              >
                {loadingSteps === t.id ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : t.microsteps.length > 0 ? (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
                    </svg>
                    Generate steps
                  </>
                )}
              </button>
              <a 
                href="/schedule" 
                className="px-3 py-1 rounded-full bg-white/70 border text-sm hover:bg-gray-50"
              >
                Add to schedule
              </a>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}