"use client";
import Shell from "@/components/Shell";
import AppWrapper from "@/components/AppWrapper";
import { useApp } from "@/lib/store";
import { Fragment, useEffect, useState, useRef, type DragEvent, type KeyboardEvent, type TouchEvent as ReactTouchEvent } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/utils";
import type { Task } from "@/types/app";

export default function PlanPage() {
  const { tasks, addTask, updateTask, removeTask, userProfile } = useApp();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low" | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [estimateMin, setEstimateMin] = useState(25);
  const [editingTime, setEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const [editingTaskTitle, setEditingTaskTitle] = useState<string | null>(null);
  const [taskTitleInput, setTaskTitleInput] = useState("");
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null);
  const [dueDateInput, setDueDateInput] = useState("");
  const [editingTaskEstimate, setEditingTaskEstimate] = useState<{ taskId: string | null; value: string }>({
    taskId: null,
    value: "",
  });
  const [editingActualTime, setEditingActualTime] = useState<{ taskId: string | null; value: string }>({
    taskId: null,
    value: "",
  });
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [microstepUndo, setMicrostepUndo] = useState<{ taskId: string; index: number; step: string; completed: boolean } | null>(null);

  // Handle clicking on time display to edit
  function startTimeEdit() {
    setTimeInput(estimateMin ? formatDuration(estimateMin) : "");
    setEditingTime(true);
  }

  // Handle saving edited time
  function saveTimeEdit() {
    const parsed = parseTimeInput(timeInput);
    if (parsed !== null) {
      setEstimateMin(Math.max(10, Math.min(360, parsed))); // Clamp between 10min and 6hrs
    } else if (!timeInput.trim()) {
      setEstimateMin(0);
    }
    setEditingTime(false);
  }

  // Handle canceling time edit
  function cancelTimeEdit() {
    setEditingTime(false);
    setTimeInput("");
  }

  // Parse time input like "1h 30m", "90m", "1.5h", etc.
  function parseTimeInput(input: string): number | null {
    const trimmed = input.trim().toLowerCase();
    
    // Match patterns like "1h 30m", "1h30m", "90m", "1.5h", etc.
    const patterns = [
      /^(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(\d+)\s*m(?:inutes?)?$/,  // "1h 30m", "1.5h30m"
      /^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/,                          // "1h", "1.5h"
      /^(\d+)\s*m(?:inutes?)?$/,                                  // "90m"
      /^(\d+(?:\.\d+)?)$/                                         // "90" (assume minutes)
    ];

    // Try "1h 30m" format
    let match = trimmed.match(patterns[0]);
    if (match) {
      const hours = parseFloat(match[1]);
      const minutes = parseInt(match[2]);
      return hours * 60 + minutes;
    }

    // Try "1h" format
    match = trimmed.match(patterns[1]);
    if (match) {
      const hours = parseFloat(match[1]);
      return hours * 60;
    }

    // Try "90m" format
    match = trimmed.match(patterns[2]);
    if (match) {
      return parseInt(match[1]);
    }

    // Try plain number (assume minutes)
    match = trimmed.match(patterns[3]);
    if (match) {
      return parseFloat(match[1]);
    }

    return null;
  }

  // Handle task title editing
  function startEditTaskTitle(taskId: string, currentTitle: string) {
    setEditingTaskTitle(taskId);
    setTaskTitleInput(currentTitle);
  }

  function saveTaskTitle(taskId: string) {
    if (taskTitleInput.trim()) {
      updateTask(taskId, { title: taskTitleInput.trim() });
    }
    setEditingTaskTitle(null);
    setTaskTitleInput("");
  }

  function cancelEditTaskTitle() {
    setEditingTaskTitle(null);
    setTaskTitleInput("");
  }

  // Handle priority editing
  function startEditPriority(taskId: string) {
    setEditingPriority(taskId);
  }

  function savePriority(taskId: string, newPriority: Task["priority"]) {
    updateTask(taskId, { priority: newPriority });
    setEditingPriority(null);
  }

  // Handle due date editing
  function startEditDueDate(taskId: string, currentDueDate?: string) {
    setEditingDueDate(taskId);
    setDueDateInput(currentDueDate || "");
  }

  function saveDueDate(taskId: string) {
    updateTask(taskId, { dueDate: dueDateInput || undefined });
    setEditingDueDate(null);
    setDueDateInput("");
  }

  function cancelEditDueDate() {
    setEditingDueDate(null);
    setDueDateInput("");
  }

  function startEditTaskEstimate(taskId: string, currentEstimate?: number) {
    setEditingTaskEstimate({
      taskId,
      value: currentEstimate && currentEstimate > 0 ? formatDuration(currentEstimate) : "",
    });
  }

  function saveTaskEstimate(taskId: string) {
    if (editingTaskEstimate.taskId !== taskId) return;
    const trimmed = editingTaskEstimate.value.trim();
    if (!trimmed) {
      updateTask(taskId, { estimateMin: 0 });
      setEditingTaskEstimate({ taskId: null, value: "" });
      return;
    }
    const parsed = parseTimeInput(trimmed);
    if (parsed !== null) {
      const clamped = Math.max(10, Math.min(360, parsed));
      updateTask(taskId, { estimateMin: clamped });
      setEditingTaskEstimate({ taskId: null, value: "" });
    }
  }

  function cancelTaskEstimate() {
    setEditingTaskEstimate({ taskId: null, value: "" });
  }

  function startEditActualTime(taskId: string, currentActual?: number) {
    setEditingActualTime({
      taskId,
      value: currentActual && currentActual > 0 ? formatDuration(currentActual) : "",
    });
  }

  function saveActualTime(taskId: string) {
    if (editingActualTime.taskId !== taskId) return;
    const trimmed = editingActualTime.value.trim();
    if (!trimmed) {
      updateTask(taskId, { actualMin: undefined });
      setEditingActualTime({ taskId: null, value: "" });
      return;
    }
    const parsed = parseTimeInput(trimmed);
    if (parsed !== null) {
      const clamped = Math.max(1, Math.min(720, parsed));
      updateTask(taskId, { actualMin: clamped });
      setEditingActualTime({ taskId: null, value: "" });
    }
  }

  function cancelActualTimeEdit() {
    setEditingActualTime({ taskId: null, value: "" });
  }

  function handleQuickEstimateEdit() {
    setShowMobileDetails(true);
    startTimeEdit();
  }

  const category: Task["category"] = "other";
  const [loadingSteps, setLoadingSteps] = useState<Record<string, "base" | "refine">>({});
  const [hasGeneratedSteps, setHasGeneratedSteps] = useState<Record<string, boolean>>({});
  const [stepErrors, setStepErrors] = useState<{ [key: string]: string }>({});
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingStep, setDraggingStep] = useState<{ taskId: string | null; fromIndex: number | null }>({ taskId: null, fromIndex: null });
  const [dropTarget, setDropTarget] = useState<{ taskId: string | null; index: number | null }>({ taskId: null, index: null });
  const touchHoldTimeout = useRef<number | null>(null);
  const [touchDrag, setTouchDrag] = useState<{ taskId: string; fromIndex: number } | null>(null);
  const microstepRefs = useRef<Record<string, Array<HTMLElement | null>>>({});
  const [editingStep, setEditingStep] = useState<{ taskId: string | null; index: number | null; value: string }>({
    taskId: null,
    index: null,
    value: "",
  });
  
  function setAllMicrosteps(taskId: string, completed: boolean) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.microsteps.length === 0) return;
    const completedSteps = new Array(task.microsteps.length).fill(completed);
    updateTask(taskId, { completedSteps });
  }
  const VISIBLE_TASK_COUNT = 4;
  type TimerState = {
    elapsedMs: number;
    isRunning: boolean;
    startedAt: number | null;
  };
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setHasGeneratedSteps(prev => {
      let changed = false;
      const next = { ...prev };
      tasks.forEach(task => {
        if (task.microsteps.length > 0 && !next[task.id]) {
          next[task.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [tasks]);

  useEffect(() => {
    setTimers(prev => {
      let changed = false;
      const next = { ...prev };
      tasks.forEach(task => {
        const completed = isTaskCompleted(task);
        const timer = next[task.id];
        if (completed && timer?.isRunning) {
          const startedAt = timer.startedAt ?? Date.now();
          next[task.id] = {
            elapsedMs: timer.elapsedMs + (Date.now() - startedAt),
            isRunning: false,
            startedAt: null,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [tasks]);

  useEffect(() => {
    tasks.forEach(task => {
      if (!isTaskCompleted(task)) return;
      if (editingActualTime.taskId === task.id) return;
      const timer = timers[task.id];
      if (!timer) return;
      const elapsedMs =
        timer.elapsedMs +
        (timer.isRunning && timer.startedAt ? Date.now() - timer.startedAt : 0);
      if (elapsedMs <= 0) return;
      const minutes = Math.max(1, Math.round(elapsedMs / 60000));
      if (!task.actualMin || Math.abs(task.actualMin - minutes) >= 1) {
        updateTask(task.id, { actualMin: minutes });
      }
    });
  }, [tasks, timers, editingActualTime.taskId, updateTask]);

  useEffect(() => {
    if (!microstepUndo) return;
    const timer = setTimeout(() => setMicrostepUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [microstepUndo]);
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

  function getTaskProgress(task: Task) {
    if (!task.microsteps.length) return 0;
    const completed = task.completedSteps?.filter(Boolean).length || 0;
    return (completed / task.microsteps.length) * 100;
  }

  function isTaskCompleted(task: Task) {
    if (!task.microsteps.length) return false;
    const completedSteps = task.completedSteps || [];
    return completedSteps.length === task.microsteps.length && completedSteps.every(Boolean);
  }

  function isTaskOverdue(task: Task) {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && !isTaskCompleted(task);
  }

  function getPriorityColor(priority?: Task["priority"]) {
    switch (priority) {
      case "high": return "text-gray-800 bg-red-100";
      case "medium": return "text-gray-800 bg-blue-100";
      case "low": return "text-gray-700 bg-gray-200";
      default: return "text-gray-600 bg-gray-100";
    }
  }

  function sortTasksByPriority(taskList: Task[]) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return [...taskList].sort((a, b) => {
      // First, separate completed from non-completed tasks
      const aCompleted = isTaskCompleted(a);
      const bCompleted = isTaskCompleted(b);
      
      // Completed tasks go to bottom
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;
      
      // For tasks in same completion state, sort by priority
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // If same priority, sort by due date (earliest first)
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

  async function addNewTask() {
    const t = title.trim(); 
    if (!t) return;
    
    let taskTitle = t;
    
    // If input is long (>50 chars) or contains multiple sentences, generate a concise title
    if (t.length > 50 || t.includes('.') || t.includes('?') || t.includes('!')) {
      try {
        const response = await fetch('/api/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: t })
        });
        
        const data = await response.json();
        if (data.title) {
          taskTitle = data.title;
        }
      } catch (error) {
        console.error("Failed to generate title:", error);
        // Keep original title as fallback
      }
    }
    
    addTask({ 
      id: crypto.randomUUID(), 
      title: taskTitle, 
      description: t, // Save original description
      estimateMin, 
      actualMin: undefined,
      category, 
      microsteps: [],
      priority: priority || undefined,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString()
    });
    setTitle("");
    setDueDate("");
    setEstimateMin(25);
    setPriority(null);
    setShowMobileDetails(false);
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

  function handleAddToSchedule(task: Task) {
    // Create a prompt for the chat page about scheduling this task
    const prompt = [
      `Help me schedule "${task.title}" as a calendar block.`,
      task.description ? `Context: ${task.description}.` : "",
      task.estimateMin ? `It should take about ${formatDuration(task.estimateMin)}.` : "",
      task.dueDate ? `It's due on ${new Date(task.dueDate).toLocaleDateString()}.` : "",
      `Please suggest a time slot, confirm it with me, and then create an event using a short Title Case name based on "${task.title}" (not this entire message).`,
      `When you create the event, reuse the exact slot we agree on—don't change the start/end time.`
    ].filter(Boolean).join(" ");
    
    // Navigate to chat page with the prompt
    const params = new URLSearchParams({ prompt: prompt });
    router.push(`/chat?${params.toString()}`);
  }

  async function generateMicrosteps(id: string, options?: { refine?: boolean }) {
    const task = tasks.find(t => t.id === id);
    if (!task || loadingSteps[id]) return;
    
    const mode: "base" | "refine" = options?.refine ? "refine" : "base";
    setLoadingSteps(prev => ({ ...prev, [id]: mode }));
    setStepErrors(prev => ({ ...prev, [id]: '' }));
    
    try {
      const response = await fetch("/api/microsteps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          description: task.description,
          category: task.category,
          estimateMin: task.estimateMin,
          existingSteps: task.microsteps,
          refine: options?.refine ?? false,
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setStepErrors(prev => ({ ...prev, [id]: data.error }));
      } else {
        const incomingSteps: string[] = data.microsteps || [];
        updateTask(id, { microsteps: incomingSteps });
        setHasGeneratedSteps(prev => (prev[id] ? prev : { ...prev, [id]: true }));
        setStepErrors(prev => ({ ...prev, [id]: '' }));
      }
    } catch (error) {
      console.error("Failed to generate microsteps:", error);
      setStepErrors(prev => ({ ...prev, [id]: "Network error. Please try again." }));
    } finally {
      setLoadingSteps(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function startEditingStep(taskId: string, stepIndex: number, currentValue: string) {
    setEditingStep({ taskId, index: stepIndex, value: currentValue });
  }

  function updateEditingDraft(value: string) {
    setEditingStep(prev => ({ ...prev, value }));
  }

  function cancelEditingStep() {
    setEditingStep({ taskId: null, index: null, value: "" });
  }

  function saveEditingStep() {
    if (!editingStep.taskId || editingStep.index === null) return;
    const task = tasks.find(t => t.id === editingStep.taskId);
    if (!task) return;
    const trimmed = editingStep.value.trim();
    if (!trimmed) {
      cancelEditingStep();
      return;
    }
    const microsteps = [...task.microsteps];
    microsteps[editingStep.index] = trimmed;
    updateTask(editingStep.taskId, { microsteps });
    cancelEditingStep();
  }

  function handleDragStart(event: DragEvent, taskId: string, stepIndex: number) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${stepIndex}`);
    setDraggingStep({ taskId, fromIndex: stepIndex });
  }

  function handleDragEnd() {
    setDraggingStep({ taskId: null, fromIndex: null });
    setDropTarget({ taskId: null, index: null });
  }

  function handleDragOver(event: DragEvent, taskId: string, targetIndex: number) {
    if (draggingStep.taskId !== taskId) return;
    event.preventDefault();
    if (dropTarget.taskId !== taskId || dropTarget.index !== targetIndex) {
      setDropTarget({ taskId, index: targetIndex });
    }
  }

  function reorderMicrosteps(taskId: string, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const microsteps = [...task.microsteps];
    const completedSteps = task.completedSteps ? [...task.completedSteps] : [];
    const [moved] = microsteps.splice(fromIndex, 1);
    const [movedStatus] = completedSteps.splice(fromIndex, 1);
    microsteps.splice(toIndex, 0, moved);
    if (completedSteps.length || typeof movedStatus === "boolean") {
      const status = typeof movedStatus === "boolean" ? movedStatus : false;
      completedSteps.splice(toIndex, 0, status);
    }
    updateTask(taskId, { microsteps, completedSteps });
  }

  function handleDrop(event: DragEvent, taskId: string, targetIndex: number) {
    if (draggingStep.taskId !== taskId || draggingStep.fromIndex === null) return;
    event.preventDefault();
    reorderMicrosteps(taskId, draggingStep.fromIndex, targetIndex);
    handleDragEnd();
  }

  function removeMicrostep(taskId: string, index: number) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const microsteps = [...task.microsteps];
    const [removedStep] = microsteps.splice(index, 1);
    const completedSteps = task.completedSteps ? [...task.completedSteps] : [];
    let removedCompleted = false;
    if (completedSteps.length) {
      removedCompleted = completedSteps.splice(index, 1)[0] ?? false;
    }
    updateTask(taskId, { microsteps, completedSteps });
    setMicrostepUndo({
      taskId,
      index,
      step: removedStep,
      completed: removedCompleted,
    });
    if (editingStep.taskId === taskId && editingStep.index === index) {
      setEditingStep({ taskId: null, index: null, value: "" });
    }
  }

  function undoRemoveMicrostep() {
    if (!microstepUndo) return;
    const { taskId, index, step, completed } = microstepUndo;
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      setMicrostepUndo(null);
      return;
    }
    const microsteps = [...task.microsteps];
    microsteps.splice(Math.min(index, microsteps.length), 0, step);
    let completedSteps: boolean[];
    if (task.completedSteps) {
      completedSteps = [...task.completedSteps];
      completedSteps.splice(Math.min(index, completedSteps.length), 0, completed);
    } else {
      completedSteps = Array(microsteps.length).fill(false);
      completedSteps[Math.min(index, completedSteps.length - 1)] = completed;
    }
    updateTask(taskId, { microsteps, completedSteps });
    setMicrostepUndo(null);
  }

  function registerMicrostepRef(taskId: string, index: number, el: HTMLElement | null) {
    if (!microstepRefs.current[taskId]) {
      microstepRefs.current[taskId] = [];
    }
    microstepRefs.current[taskId][index] = el;
  }

  function clearTouchHold() {
    if (touchHoldTimeout.current) {
      window.clearTimeout(touchHoldTimeout.current);
      touchHoldTimeout.current = null;
    }
  }

  function handleTouchStart(taskId: string, idx: number) {
    clearTouchHold();
    touchHoldTimeout.current = window.setTimeout(() => {
      setTouchDrag({ taskId, fromIndex: idx });
      setDropTarget({ taskId, index: idx });
    }, 180);
  }

  function handleTouchMove(event: ReactTouchEvent, taskId: string) {
    if (!touchDrag) {
      clearTouchHold();
      return;
    }
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    const refs = microstepRefs.current[taskId] || [];
    let targetIndex = refs.length;
    for (let i = 0; i < refs.length; i += 1) {
      const el = refs[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (touch.clientY < rect.top + rect.height / 2) {
        targetIndex = i;
        break;
      }
    }
    if (dropTarget.taskId !== taskId || dropTarget.index !== targetIndex) {
      setDropTarget({ taskId, index: targetIndex });
    }
  }

  function handleTouchEnd(taskId: string) {
    clearTouchHold();
    if (!touchDrag || touchDrag.taskId !== taskId) {
      setTouchDrag(null);
      return;
    }
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      setTouchDrag(null);
      return;
    }
    const refs = microstepRefs.current[taskId] || [];
    let targetIndex = dropTarget.taskId === taskId && dropTarget.index !== null ? dropTarget.index : touchDrag.fromIndex;
    targetIndex = Math.max(0, Math.min(targetIndex, refs.length));
    reorderMicrosteps(taskId, touchDrag.fromIndex, targetIndex);
    setTouchDrag(null);
    setDropTarget({ taskId: null, index: null });
  }

  function handleEditingKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveEditingStep();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditingStep();
    }
  }

  function toggleTimer(taskId: string) {
    setTimers(prev => {
      const timer = prev[taskId] || { elapsedMs: 0, isRunning: false, startedAt: null };
      if (timer.isRunning) {
        const startedAt = timer.startedAt ?? Date.now();
        const elapsed = timer.elapsedMs + (Date.now() - startedAt);
        return {
          ...prev,
          [taskId]: { elapsedMs: elapsed, isRunning: false, startedAt: null },
        };
      }
      return {
        ...prev,
        [taskId]: { ...timer, isRunning: true, startedAt: Date.now() },
      };
    });
  }

  function formatElapsed(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  function getElapsedMs(taskId: string): number {
    const timer = timers[taskId];
    if (!timer) return 0;
    const runningIncrement =
      timer.isRunning && timer.startedAt ? Date.now() - timer.startedAt : 0;
    return timer.elapsedMs + runningIncrement;
  }


  return (
    <AppWrapper>
      <Shell>
      <div className="mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-lg font-semibold">Hi, {userProfile.name || "there"}!</h1>
            <p className="text-sm text-gray-600">Ready to plan your day?</p>
          </div>
          <div className="text-sm text-gray-500 text-right">
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

        <div className="bg-gradient-to-br from-white to-gray-50/30 rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-gray-900">What&rsquo;s on your mind?</h3>
            <button
              type="button"
              onClick={() => setShowMobileDetails(prev => !prev)}
              className="sm:hidden inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-600 border border-fuchsia-100 px-3 py-1 rounded-full bg-fuchsia-50/40"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showMobileDetails ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
              Details
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <textarea 
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm bg-white/90 focus:outline-none focus:border-fuchsia-300 focus:bg-white transition-all duration-200 resize-none min-h-[50px] placeholder:text-gray-400"
                placeholder="Be as specific or general as you&rsquo;d like - e.g. Write 5-page paper on personality..."
                value={title} 
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && addNewTask()}
                rows={2}
              />
              {title.length > 50 && (
                <div className="mt-1 flex items-center space-x-1 text-xs text-gray-500">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Along will create a clean title for you</span>
                </div>
              )}
            </div>

            <div className="sm:hidden flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowMobileDetails(true)}
                className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-600 bg-white/80"
              >
                {priority ? `Priority: ${priority}` : "+ Priority"}
              </button>
              <button
                type="button"
                onClick={() => setShowMobileDetails(true)}
                className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-600 bg-white/80"
              >
                {dueDate ? `Due ${new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "+ Due date"}
              </button>
              <button
                type="button"
                onClick={handleQuickEstimateEdit}
                className="px-3 py-1 text-xs rounded-full border border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50/60 font-medium"
              >
                {estimateMin ? `Estimate: ${formatDuration(estimateMin)}` : "Add estimate"}
              </button>
            </div>
          </div>

          {/* Details Section */}
          <div className={`border-t border-gray-100 pt-4 space-y-4 ${showMobileDetails ? "block" : "hidden"} sm:block`}>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Priority and Due Date Row */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">How urgent is this?</label>
                  <div className="flex space-x-2">
                    {[
                      { value: 'low' as const, label: 'Low', selected: 'bg-gray-200 text-gray-800 border-gray-300', unselected: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' },
                      { value: 'medium' as const, label: 'Medium', selected: 'bg-blue-100 text-gray-800 border-blue-200', unselected: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' },
                      { value: 'high' as const, label: 'High', selected: 'bg-red-100 text-gray-800 border-red-200', unselected: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' }
                    ].map(({ value, label, selected, unselected }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPriority(value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all duration-200 ${
                          priority === value ? selected : unselected
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Due date (optional)</label>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-fuchsia-300 transition-colors"
                  />
                </div>
              </div>

              {/* Time Estimate */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">How long might this take? <span className="text-gray-400">(optional)</span></label>
                <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Time estimate</span>
                    {editingTime ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={timeInput}
                          onChange={(e) => setTimeInput(e.target.value)}
                          onBlur={saveTimeEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTimeEdit();
                            if (e.key === 'Escape') cancelTimeEdit();
                          }}
                          className="text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 w-20 text-center"
                          placeholder="1h 30m"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button 
                        type="button"
                        className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-fuchsia-600 transition-colors"
                        onClick={startTimeEdit}
                      >
                        {estimateMin ? formatDuration(estimateMin) : "Add estimate"}
                      </button>
                    )}
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="360"
                    step="5"
                    value={estimateMin || 10}
                    onChange={e => setEstimateMin(parseInt(e.target.value))}
                    disabled={estimateMin === 0}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb:appearance-none slider-thumb:w-4 slider-thumb:h-4 slider-thumb:rounded-full slider-thumb:bg-fuchsia-500 slider-thumb:cursor-pointer accent-fuchsia-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>10 min</span>
                    <span>6 hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
            <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500 hidden sm:block">
              Press Enter to add, or Shift+Enter for new line
            </div>
            <button 
              onClick={addNewTask} 
              disabled={!title.trim()}
              className="group relative overflow-hidden bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white px-6 py-2.5 rounded-full font-medium text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add to plan</span>
              <div className="pointer-events-none absolute inset-0 bg-white/20 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2 overflow-x-auto sm:overflow-visible pb-1">
          {(["all", "active", "completed", "overdue"] as const).map((filterType) => {
            const label =
              filterType === "all"
                ? "All tasks"
                : filterType === "active"
                  ? "Active"
                  : filterType === "completed"
                    ? "Completed"
                    : "Overdue";
            return (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === filterType ? 'bg-cta text-white' : 'card hover:bg-gray-50'
                } ${filterType === 'overdue' && tasks.filter(isTaskOverdue).length > 0 ? 'relative' : ''}`}
              >
                {label}
                {filterType === 'overdue' && tasks.filter(isTaskOverdue).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {tasks.filter(isTaskOverdue).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="space-y-3"
        aria-label={`Showing up to ${VISIBLE_TASK_COUNT} tasks on screen for focus`}
      >
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
          const timerMs = getElapsedMs(t.id);
          const timerRunning = timers[t.id]?.isRunning ?? false;
          const taskLoadingMode = loadingSteps[t.id];
          const isGeneratingSteps = taskLoadingMode === "base";
          const isRefiningSteps = taskLoadingMode === "refine";
          const stepsBusy = Boolean(taskLoadingMode);
          const showRegenerateLabel = hasGeneratedSteps[t.id] || t.microsteps.length > 0;
          
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
                  {editingTaskTitle === t.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={taskTitleInput}
                        onChange={(e) => setTaskTitleInput(e.target.value)}
                        onBlur={() => saveTaskTitle(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTaskTitle(t.id);
                          if (e.key === 'Escape') cancelEditTaskTitle();
                        }}
                        className="flex-1 font-medium bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span 
                        className={`font-medium cursor-pointer hover:text-purple-600 transition-colors ${completed ? 'text-green-700 line-through' : 'text-gray-900'}`}
                        onClick={() => !completed && startEditTaskTitle(t.id, t.title)}
                        title={completed ? undefined : "Click to edit title"}
                      >
                        {t.title}
                      </span>
                      {!completed && (
                        <button
                          onClick={() => startEditTaskTitle(t.id, t.title)}
                          className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all"
                          title="Edit title"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3l4 4L7 19H3v-4L15 3z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {/* Priority Badge */}
                    {editingPriority === t.id ? (
                      <div className="flex gap-1">
                        {["low", "medium", "high"].map((priority) => (
                          <button
                            key={priority}
                            onClick={() => savePriority(t.id, priority as Task["priority"])}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                              t.priority === priority 
                                ? getPriorityColor(priority as Task["priority"]) + " ring-1 ring-purple-300"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {priority}
                          </button>
                        ))}
                      </div>
                    ) : t.priority ? (
                      <div className="flex items-center gap-1">
                            <span 
                              className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${getPriorityColor(t.priority)}`}
                              onClick={() => !completed && startEditPriority(t.id)}
                              title={completed ? undefined : "Click to edit priority"}
                            >
                              {t.priority}
                            </span>
                      </div>
                    ) : (
                      !completed && (
                        <button
                          onClick={() => startEditPriority(t.id)}
                          className="px-2 py-0.5 rounded-full text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 hover:border-gray-400 transition-all"
                          title="Add priority"
                        >
                          + Priority
                        </button>
                      )
                    )}
                    {/* Due Date */}
                    {editingDueDate === t.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={dueDateInput}
                          onChange={(e) => setDueDateInput(e.target.value)}
                          onBlur={() => saveDueDate(t.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveDueDate(t.id);
                            if (e.key === 'Escape') cancelEditDueDate();
                          }}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    ) : t.dueDate ? (
                      <div className="flex items-center gap-1 group">
                        <div 
                          className={`text-xs flex items-center gap-1 cursor-pointer hover:opacity-80 ${
                            isTaskOverdue(t) ? 'text-red-600 font-medium' : 
                            new Date(t.dueDate).toDateString() === new Date().toDateString() ? 'text-orange-600 font-medium' :
                            'text-gray-500'
                          }`}
                          onClick={() => !completed && startEditDueDate(t.id, t.dueDate)}
                          title={completed ? undefined : "Click to edit due date"}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14V7H5v14z" />
                          </svg>
                          {new Date(t.dueDate).toLocaleDateString('en', { 
                            month: 'short', 
                            day: 'numeric',
                            ...(new Date(t.dueDate).getFullYear() !== new Date().getFullYear() && { year: 'numeric' })
                          })}
                        </div>
                        {!completed && (
                          <button
                            onClick={() => startEditDueDate(t.id, t.dueDate)}
                            className="opacity-0 group-hover:opacity-50 hover:opacity-100 p-0.5 text-gray-400 hover:text-purple-600 rounded transition-all"
                            title="Edit due date"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3l4 4L7 19H3v-4L15 3z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : (
                      !completed && (
                        <button
                          onClick={() => startEditDueDate(t.id, "")}
                          className="text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 hover:border-gray-400 rounded px-2 py-1 transition-all"
                          title="Add due date"
                        >
                          + Due date
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div>
                  {editingTaskEstimate.taskId === t.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingTaskEstimate.value}
                        onChange={(e) => setEditingTaskEstimate(prev => ({ ...prev, value: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTaskEstimate(t.id);
                          if (e.key === 'Escape') cancelTaskEstimate();
                        }}
                        className="w-20 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                        placeholder="30m"
                        autoFocus
                      />
                      <button
                        onClick={() => saveTaskEstimate(t.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save estimate"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={cancelTaskEstimate}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                        title="Cancel"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !completed && startEditTaskEstimate(t.id, t.estimateMin)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border ${
                        t.estimateMin ? "border-gray-200 text-gray-600 hover:border-fuchsia-200 hover:text-fuchsia-600" : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400"
                      } transition-colors`}
                      title={completed ? undefined : "Click to edit estimate"}
                      disabled={completed}
                    >
                      {t.estimateMin ? `~ ${formatDuration(t.estimateMin)}` : "+ Add estimate"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleTimer(t.id)}
                    disabled={completed}
                    className={`px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      completed
                        ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                        : timerRunning
                          ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                          : "border-gray-200 text-gray-600 hover:border-fuchsia-200"
                    } ${completed ? "cursor-default" : ""}`}
                  >
                    {completed ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z" />
                      </svg>
                    ) : timerRunning ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 4h2v12H6V4zm6 0h2v12h-2V4z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 4l10 6-10 6V4z" />
                      </svg>
                    )}
                    <span>
                      {completed
                        ? "Finished"
                        : timerRunning
                          ? "Pause"
                          : timerMs > 0
                            ? "Resume"
                            : "Start"}
                    </span>
                    <span className="font-semibold">{formatElapsed(timerMs)}</span>
                  </button>

                  {(completed || t.actualMin) && (
                    editingActualTime.taskId === t.id ? (
                      <div className="flex items-center gap-1 text-xs">
                        <input
                          type="text"
                          value={editingActualTime.value}
                          onChange={(e) => setEditingActualTime(prev => ({ ...prev, value: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveActualTime(t.id);
                            if (e.key === "Escape") cancelActualTimeEdit();
                          }}
                          onBlur={() => saveActualTime(t.id)}
                          className="w-28 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="e.g. 25m"
                          autoFocus
                        />
                        <button
                          onClick={() => saveActualTime(t.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Save actual time"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={cancelActualTimeEdit}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                          title="Cancel"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          startEditActualTime(
                            t.id,
                            t.actualMin ?? (timerMs > 0 ? Math.max(1, Math.round(timerMs / 60000)) : undefined)
                          )
                        }
                        className="text-xs font-medium px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-fuchsia-200 hover:text-fuchsia-600 transition-colors"
                        title="Edit actual time used"
                      >
                        {t.actualMin ? `Actual: ${formatDuration(t.actualMin)}` : "Add actual time"}
                      </button>
                    )
                  )}
                </div>
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
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {microstepUndo?.taskId === t.id && (
                  <div className="mt-2 flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
                    <span>Microstep removed</span>
                    <button
                      type="button"
                      onClick={undoRemoveMicrostep}
                      className="font-semibold text-amber-900 hover:underline"
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Original Description */}
            {t.description && t.description !== t.title && !isCollapsed && (
              <div className="mb-2.5">
                <div className="text-xs font-medium text-gray-700 mb-1.5">Original description:</div>
                <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 italic border">
                  {t.description}
                </div>
              </div>
            )}
            
            {t.microsteps.length > 0 && !isCollapsed && (
              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700">Microsteps:</span>
                  <button
                    type="button"
                    onClick={() => setAllMicrosteps(t.id, !completed)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      completed
                        ? "border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100"
                        : "border-gray-200 text-gray-600 hover:border-fuchsia-200 hover:text-fuchsia-600"
                    }`}
                  >
                    {completed ? "Reset steps" : "Complete all"}
                  </button>
                </div>
                {(() => {
                  const isTaskBeingReordered =
                    (draggingStep.taskId === t.id && draggingStep.fromIndex !== null) ||
                    touchDrag?.taskId === t.id;
                  return (
                    <div
                      className="space-y-1.5 overflow-y-auto max-h-64 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
                      aria-label="Microsteps list"
                    >
                      {t.microsteps.map((step: string, idx: number) => {
                        const isCompleted = t.completedSteps?.[idx] || false;
                        const isEditing = editingStep.taskId === t.id && editingStep.index === idx;
                        const draftValue = isEditing ? editingStep.value : step;
                        const isActiveDropZone = dropTarget.taskId === t.id && dropTarget.index === idx;
                        const rowClasses = [
                          "flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-all duration-200 cursor-pointer",
                          isEditing
                            ? "bg-white shadow-[0_12px_35px_rgba(216,180,254,0.45)] border-fuchsia-200"
                            : isCompleted
                              ? "bg-fuchsia-50 border-fuchsia-100 text-fuchsia-900/80"
                              : "bg-white border-gray-100 hover:border-fuchsia-200 hover:shadow-sm",
                          isActiveDropZone ? "ring-1 ring-fuchsia-300" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <Fragment key={`${t.id}-step-${idx}`}>
                            <div
                              className={`h-2 rounded transition-all duration-150 ${
                                dropTarget.taskId === t.id && dropTarget.index === idx ? "bg-fuchsia-400" : "bg-transparent"
                              } ${isTaskBeingReordered ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                              onDragOver={(e) => handleDragOver(e, t.id, idx)}
                              onDrop={(e) => handleDrop(e, t.id, idx)}
                            />
                            <div
                              ref={(el) => registerMicrostepRef(t.id, idx, el)}
                              className={rowClasses}
                              draggable
                              onDragStart={(event) => handleDragStart(event, t.id, idx)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(event) => handleDragOver(event, t.id, idx + 1)}
                              onDrop={(event) => handleDrop(event, t.id, idx + 1)}
                              onTouchStart={() => handleTouchStart(t.id, idx)}
                              onTouchMove={(event) => handleTouchMove(event, t.id)}
                              onTouchEnd={() => handleTouchEnd(t.id)}
                              onTouchCancel={() => handleTouchEnd(t.id)}
                              onClick={() => {
                                if (isEditing || touchDrag) return;
                                toggleMicrostep(t.id, idx);
                              }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                startEditingStep(t.id, idx, step);
                              }}
                            >
                          <div className="flex flex-col items-center text-gray-400">
                            <div className="rounded-full p-1 text-gray-300">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 9h14M5 15h14" />
                              </svg>
                            </div>
                            <span className="mt-1 h-4 w-px rounded-full bg-gray-200" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMicrostep(t.id, idx);
                            }}
                            aria-pressed={isCompleted}
                            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                              isCompleted
                                ? "border-fuchsia-200 bg-gradient-to-br from-fuchsia-400 to-violet-500 text-white"
                                : "border-gray-200 bg-white text-gray-400 hover:border-fuchsia-200"
                            }`}
                          >
                            {isCompleted ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="7" strokeWidth="2" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-1">
                                <input
                                  value={draftValue}
                                  onChange={(e) => updateEditingDraft(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => handleEditingKeyDown(e)}
                                  autoFocus
                                  className="w-full rounded-lg border border-fuchsia-200/80 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
                                />
                                <p className="text-[11px] text-gray-400">Press Enter to save • Esc to cancel</p>
                              </div>
                            ) : (
                              <span
                                className={`text-sm font-medium leading-snug ${
                                  isCompleted ? "text-gray-400 line-through" : "text-gray-800"
                                }`}
                              >
                                {step}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  className="rounded-full bg-fuchsia-600 text-white p-1.5 hover:bg-fuchsia-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveEditingStep();
                                  }}
                                  aria-label="Save microstep"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 hover:border-rose-200 hover:text-rose-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEditingStep();
                                  }}
                                  aria-label="Cancel editing microstep"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 hover:border-fuchsia-200 hover:text-fuchsia-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingStep(t.id, idx, step);
                                  }}
                                  aria-label="Edit microstep"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3l4 4L7 19H3v-4L15 3z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-400 hover:border-rose-200 hover:text-rose-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeMicrostep(t.id, idx);
                                  }}
                                  aria-label="Delete microstep"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0h10l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7z" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                  <div
                    className="h-2 rounded transition-all duration-150"
                    onDragOver={(e) => handleDragOver(e, t.id, t.microsteps.length)}
                    onDrop={(e) => handleDrop(e, t.id, t.microsteps.length)}
                  />
                </div>
                  );
                })()}
              </div>
            )}
            
            {/* Error message for microsteps */}
            {stepErrors[t.id] && (
              <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">{stepErrors[t.id]}</p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => generateMicrosteps(t.id)} 
                disabled={stepsBusy}
                className="px-3 py-1 rounded-full border text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center"
              >
                {isGeneratingSteps ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
                    </svg>
                    {showRegenerateLabel ? "Regenerate" : "Generate microsteps"}
                  </>
                )}
              </button>
              {t.microsteps.length > 0 && (
                <button 
                  onClick={() => generateMicrosteps(t.id, { refine: true })} 
                  disabled={stepsBusy}
                  className="px-3 py-1 rounded-full border text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center"
                >
                  {isRefiningSteps ? (
                    <>
                      <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refining...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h16m-9 4h9m-9 4h9m-9 4h9" />
                      </svg>
                      More specific steps
                    </>
                  )}
                </button>
              )}
              <button 
                onClick={() => handleAddToSchedule(t)}
                className="px-3 py-1 rounded-full bg-white/70 border text-sm hover:bg-gray-50"
              >
                Add to schedule
              </button>
              <button 
                onClick={() => removeTask(t.id)}
                className="px-3 py-1 rounded-full border border-red-200 text-red-600 text-sm hover:bg-red-50 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-2 12H7L5 7m5 4v6m4-6v6m1-10V4H9v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
          );
        })}
      </div>
      </Shell>
    </AppWrapper>
  );
}
