"use client";
import Shell from "@/components/Shell";
import AppWrapper from "@/components/AppWrapper";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { formatDuration } from "@/lib/utils";

export default function PlannerPage() {
  const { tasks, addTask, updateTask } = useApp();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<"study"|"writing"|"chores"|"admin"|"other">("other");
  const [loadingSteps, setLoadingSteps] = useState<string | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

  function toggleMicrostep(taskId: string, stepIndex: number) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const completedSteps = task.completedSteps || new Array(task.microsteps.length).fill(false);
    completedSteps[stepIndex] = !completedSteps[stepIndex];
    
    updateTask(taskId, { completedSteps });
  }

  function toggleTaskCollapse(taskId: string) {
    setCollapsedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }

  function getTaskProgress(task: any) {
    if (!task.microsteps.length) return 0;
    const completed = task.completedSteps?.filter(Boolean).length || 0;
    return (completed / task.microsteps.length) * 100;
  }

  function isTaskCompleted(task: any) {
    if (!task.microsteps.length) return false;
    const completedSteps = task.completedSteps || [];
    return completedSteps.length === task.microsteps.length && completedSteps.every(Boolean);
  }

  function isTaskOverdue(task: any) {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && !isTaskCompleted(task);
  }

  function getPriorityColor(priority?: string) {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-orange-600 bg-orange-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  }

  function sortTasksByPriority(taskList: any[]) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return taskList.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // If same priority, sort by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      // If no due dates, sort by creation date (newest first)
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
  }

  function addNewTask() {
    const t = title.trim(); 
    if (!t) return;
    
    addTask({ 
      id: crypto.randomUUID(), 
      title: t, 
      estimateMin: 20, 
      category, 
      microsteps: [],
      priority,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString()
    });
    setTitle("");
    setDueDate("");
    setPriority("medium");
    setCategory("other");
    setShowAdvancedForm(false);
  }

  // Filter tasks based on current filter and search query
  const filteredTasks = sortTasksByPriority(
    tasks.filter(task => {
      // Search filter
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      switch (filter) {
        case "completed":
          return isTaskCompleted(task);
        case "active":
          return !isTaskCompleted(task);
        case "overdue":
          return isTaskOverdue(task);
        default:
          return true;
      }
    })
  );

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
    <AppWrapper>
      <Shell>
      <div className="mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Planner</h1>
          <div className="text-sm text-gray-500">
            {tasks.length} tasks • {tasks.filter(isTaskCompleted).length} completed
            {tasks.filter(isTaskOverdue).length > 0 && (
              <span className="text-red-500 ml-2">
                • {tasks.filter(isTaskOverdue).length} overdue
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="card p-3">
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
              placeholder="Search tasks..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="card p-3">
          <div className="flex gap-2 mb-3">
            <input 
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="What do you need to get done?" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !showAdvancedForm && addNewTask()}
            />
            <button 
              onClick={() => setShowAdvancedForm(!showAdvancedForm)}
              className="px-3 py-2 rounded-full border text-sm hover:bg-gray-50 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>
            <button 
              onClick={addNewTask} 
              disabled={!title.trim()}
              className="px-4 py-2 rounded-full bg-cta text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {showAdvancedForm && (
            <div className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Category</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="study">Study</option>
                    <option value="writing">Writing</option>
                    <option value="chores">Chores</option>
                    <option value="admin">Admin</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Priority</label>
                  <select 
                    value={priority} 
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Due Date (Optional)</label>
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "completed", "overdue"] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === filterType
                  ? 'bg-cta text-white'
                  : 'card hover:bg-gray-50'
              } ${filterType === 'overdue' && tasks.filter(isTaskOverdue).length > 0 ? 'relative' : ''}`}
            >
              {filterType === "all" && "All tasks"}
              {filterType === "active" && "Active"}
              {filterType === "completed" && "Completed"}
              {filterType === "overdue" && "Overdue"}
              {filterType === 'overdue' && tasks.filter(isTaskOverdue).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tasks.filter(isTaskOverdue).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="card p-4 text-sm text-gray-600 text-center">
            Add your first task above to get started!
          </div>
        )}
        {filteredTasks.length === 0 && tasks.length > 0 && (
          <div className="card p-4 text-sm text-gray-600 text-center">
            No {filter} tasks found.
          </div>
        )}
        {filteredTasks.map(t => {
          const isCollapsed = collapsedTasks.has(t.id);
          const progress = getTaskProgress(t);
          const completed = isTaskCompleted(t);
          
          return (
          <div key={t.id} className={`card p-4 transition-all ${completed ? 'opacity-75 bg-green-50/50' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                {completed && (
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="flex-1">
                  <div className={`font-medium ${completed ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                    {t.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Priority Badge */}
                    {t.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    )}
                    {/* Category Badge */}
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                      {t.category}
                    </span>
                    {/* Due Date */}
                    {t.dueDate && (
                      <div className={`text-xs flex items-center gap-1 ${
                        isTaskOverdue(t) ? 'text-red-600 font-medium' : 
                        new Date(t.dueDate).toDateString() === new Date().toDateString() ? 'text-orange-600 font-medium' :
                        'text-gray-500'
                      }`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(t.dueDate).toLocaleDateString('en', { 
                          month: 'short', 
                          day: 'numeric',
                          ...(new Date(t.dueDate).getFullYear() !== new Date().getFullYear() && { year: 'numeric' })
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-xs text-gray-500">{formatDuration(t.estimateMin)}</div>
                {t.microsteps.length > 0 && (
                  <button
                    onClick={() => toggleTaskCollapse(t.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    <svg 
                      className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {t.microsteps.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {t.microsteps.length > 0 && !isCollapsed && (
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
          );
        })}
      </div>
      </Shell>
    </AppWrapper>
  );
}