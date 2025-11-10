"use client";

import Link from "next/link";
import { useMemo } from "react";
import Shell from "@/components/Shell";
import AppWrapper from "@/components/AppWrapper";
import { useApp } from "@/lib/store";
import { formatDuration } from "@/lib/utils";
import type { Task } from "@/types/app";

function isTaskCompleted(task: Task) {
  if (!task.microsteps.length) return false;
  const completedSteps = task.completedSteps || [];
  return completedSteps.length === task.microsteps.length && completedSteps.every(Boolean);
}

function getChatStreakDays(userMessageTimestamps: number[]) {
  if (userMessageTimestamps.length === 0) return 0;
  const dayKeys = new Set(userMessageTimestamps.map(ts => new Date(ts).toDateString()));
  const today = new Date();
  let streak = 0;
  while (true) {
    const key = new Date(today.getFullYear(), today.getMonth(), today.getDate() - streak).toDateString();
    if (dayKeys.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function averageResponseMinutes(messages: { sender: string; ts?: number }[]) {
  const diffs: number[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    const current = messages[i];
    if (current.sender !== "user" || typeof current.ts !== "number") continue;
    const nextAssistant = messages.slice(i + 1).find(m => m.sender === "assistant" && typeof m.ts === "number");
    if (nextAssistant?.ts) {
      const deltaMinutes = (nextAssistant.ts - current.ts) / 60000;
      if (deltaMinutes >= 0) {
        diffs.push(deltaMinutes);
      }
    }
  }
  if (!diffs.length) return null;
  return diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
}

export default function InsightsPage() {
  const { sessions, tasks, messages } = useApp();

  const totalFocusMinutes = sessions.reduce((sum, session) => sum + session.actualMin, 0);
  const avgSessionLength = sessions.length ? Math.round(totalFocusMinutes / sessions.length) : 0;

  const {
    completedTasks,
    activeTasks,
    completionRate,
    overdueTasks,
    estimateAccuracy,
    avgEstimateDelta,
    timeDebt,
    timeSurplus,
    onTrackCount,
    categories,
    estimatedRemainingMinutes,
    averageStepsPerTask,
  } = useMemo(() => {
    const completed = tasks.filter(isTaskCompleted);
    const active = tasks.length - completed.length;
    const overdue = tasks.filter(task => task.dueDate && new Date(task.dueDate) < new Date() && !isTaskCompleted(task));
    const estRemaining = tasks
      .filter(task => !isTaskCompleted(task))
      .reduce((sum, task) => sum + (task.estimateMin || 0), 0);
    const stepsAvg = tasks.length
      ? Math.round(
          tasks.reduce((sum, task) => sum + (task.microsteps?.length || 0), 0) / tasks.length
        )
      : 0;

    const categoryBreakdown = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sessionMinutesByTask = sessions.reduce<Record<string, number>>((acc, session) => {
      if (!session.taskId) return acc;
      acc[session.taskId] = (acc[session.taskId] || 0) + session.actualMin;
      return acc;
    }, {});

    const accuracy = tasks
      .map(task => {
        const actual = sessionMinutesByTask[task.id] || 0;
        return {
          task,
          actual,
          estimate: task.estimateMin,
          delta: actual - task.estimateMin,
        };
      })
      .filter(item => item.actual > 0);

    const avgDelta = accuracy.length
      ? accuracy.reduce((sum, item) => sum + item.delta, 0) / accuracy.length
      : 0;
    const debt = accuracy.filter(item => item.delta > 5).reduce((sum, item) => sum + item.delta, 0);
    const surplus = accuracy.filter(item => item.delta < -5).reduce((sum, item) => sum + Math.abs(item.delta), 0);
    const onTrack = accuracy.filter(item => Math.abs(item.delta) <= 5).length;

    return {
      completedTasks: completed,
      activeTasks: Math.max(active, 0),
      completionRate: tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0,
      overdueTasks: overdue,
      estimateAccuracy: accuracy,
      avgEstimateDelta: avgDelta,
      timeDebt: debt,
      timeSurplus: surplus,
      onTrackCount: onTrack,
      categories: categoryBreakdown,
      estimatedRemainingMinutes: estRemaining,
      averageStepsPerTask: stepsAvg,
    };
  }, [sessions, tasks]);

  const {
    chatDaysActive,
    chatStreak,
    avgDailyUserMsgs,
    avgResponseMinutesValue,
  } = useMemo(() => {
    const userMessages = messages.filter(m => m.sender === "user" && typeof m.ts === "number") as { ts: number }[];
    const daySet = new Set(userMessages.map(m => new Date(m.ts).toDateString()));
    const streak = getChatStreakDays(userMessages.map(m => m.ts));
    const avgDaily = daySet.size ? (userMessages.length / daySet.size).toFixed(1) : "0.0";
    const avgResponse = averageResponseMinutes(messages);
    return {
      chatDaysActive: daySet.size,
      chatStreak: streak,
      avgDailyUserMsgs: avgDaily,
      avgResponseMinutesValue: avgResponse,
    };
  }, [messages]);

  const estimateSummary =
    estimateAccuracy.length > 0
      ? `${avgEstimateDelta > 0 ? "+" : ""}${Math.round(avgEstimateDelta)}m typically ${
          avgEstimateDelta > 0 ? "over" : avgEstimateDelta < 0 ? "under" : "on"
        } estimate`
      : "Track a focus session to compare estimates";

  return (
    <AppWrapper>
      <Shell>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Energy pulse</p>
              <h1 className="text-lg font-semibold text-gray-900">Insights</h1>
            </div>
            <span className="text-xs text-gray-500">Reflect • Adjust • Iterate</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Focus time</div>
              <div className="text-2xl font-semibold text-fuchsia-600">{formatDuration(totalFocusMinutes)}</div>
              <p className="text-xs text-gray-500 mt-1">{sessions.length} sessions logged</p>
            </div>
            <div className="card p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Planner progress</div>
              <div className="text-2xl font-semibold text-fuchsia-600">
                {completionRate}
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {completedTasks.length} of {tasks.length || 0} tasks complete
              </p>
            </div>
            <div className="card p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Estimate accuracy</div>
              <div className="text-xl font-semibold text-fuchsia-600">{estimateAccuracy.length ? estimateSummary : "—"}</div>
              <p className="text-xs text-gray-500 mt-1">
                {timeDebt > 0 || timeSurplus > 0
                  ? `${Math.round(timeDebt)}m over · ${Math.round(timeSurplus)}m under`
                  : "Log focus time to see trends"}
              </p>
            </div>
            <div className="card p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Chat pulse</div>
              <div className="text-2xl font-semibold text-fuchsia-600">{chatStreak || 0}d</div>
              <p className="text-xs text-gray-500 mt-1">
                {chatDaysActive ? `${avgDailyUserMsgs} msgs/day · ${chatDaysActive} active days` : "Say hi in chat to start tracking"}
              </p>
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Time estimates vs reality</h3>
                <p className="text-xs text-gray-500">Compare what you planned in the planner with what actually happened in focus sessions.</p>
              </div>
              <Link href="/" className="text-xs text-fuchsia-600 hover:text-fuchsia-700">
                Go to planner →
              </Link>
            </div>
            {estimateAccuracy.length === 0 ? (
              <div className="text-sm text-gray-500">Track a focus session tied to a task to see this insight.</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xl font-semibold text-rose-500">{Math.max(timeDebt, 0).toFixed(0)}m</div>
                    <p className="text-xs text-gray-500">Over estimate</p>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-emerald-600">{Math.max(timeSurplus, 0).toFixed(0)}m</div>
                    <p className="text-xs text-gray-500">Under estimate</p>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-gray-800">{onTrackCount}</div>
                    <p className="text-xs text-gray-500">On target (±5m)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {estimateAccuracy.slice(0, 4).map(item => (
                    <div key={item.task.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{item.task.title}</p>
                        <p className="text-xs text-gray-500">
                          Planned {item.estimate}m · Actual {item.actual}m
                        </p>
                      </div>
                      <span className={`text-xs font-semibold ${item.delta > 0 ? "text-rose-500" : item.delta < 0 ? "text-emerald-600" : "text-gray-500"}`}>
                        {item.delta > 0 ? "+" : ""}
                        {Math.round(item.delta)}m
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Planning snapshot</h3>
                <p className="text-xs text-gray-500">What still needs care inside the planner.</p>
              </div>
              <Link href="/" className="text-xs text-fuchsia-600 hover:text-fuchsia-700">
                Open planner →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-3">
                <p className="text-xs uppercase tracking-wide text-fuchsia-600">Active tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{activeTasks}</p>
                <p className="text-xs text-gray-500 mt-1">{estimatedRemainingMinutes}m still on the board</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-600">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">{overdueTasks.length}</p>
                <p className="text-xs text-gray-500 mt-1">Due dates slipped past today</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Structure</p>
              <p className="text-sm text-gray-600">
                {averageStepsPerTask || 0} microsteps per task on average · {Object.keys(categories).length || 0} category mix
              </p>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Chat check-ins</h3>
                <p className="text-xs text-gray-500">How often you lean on Along.</p>
              </div>
              <Link href="/chat" className="text-xs text-fuchsia-600 hover:text-fuchsia-700">
                Open chat →
              </Link>
            </div>
            {chatDaysActive === 0 ? (
              <p className="text-sm text-gray-500">Send a message and this panel will light up with trends.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Daily streak</span>
                  <span className="font-semibold">{chatStreak} day{chatStreak === 1 ? "" : "s"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Average check-ins</span>
                  <span className="font-semibold">{avgDailyUserMsgs} msgs/day</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Typical response time</span>
                  <span className="font-semibold">
                    {avgResponseMinutesValue !== null ? `${Math.round(avgResponseMinutesValue)} min` : "Instant"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Task mix</h3>
                <span className="text-xs text-gray-500">{tasks.length} total</span>
              </div>
              <div className="space-y-2">
                {Object.entries(categories).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-300" />
                      <span className="capitalize text-gray-700">{category}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Recent focus blocks</h3>
                <span className="text-xs text-gray-500">Avg {avgSessionLength ? formatDuration(avgSessionLength) : "—"}</span>
              </div>
              <div className="space-y-2">
                {sessions
                  .slice(-5)
                  .reverse()
                  .map(session => (
                    <div key={session.id} className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        {new Date(session.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                        {new Date(session.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="font-medium">{formatDuration(session.actualMin)}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && tasks.length === 0 && (
            <div className="card p-6 text-center space-y-2">
              <div className="text-4xl">📈</div>
              <p className="font-medium text-gray-900">No signals yet</p>
              <p className="text-sm text-gray-600">Plan something, run a focus block, or chat with Along to light this page up.</p>
            </div>
          )}
        </div>
      </Shell>
    </AppWrapper>
  );
}
