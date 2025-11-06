"use client";
import Shell from "@/components/Shell";
import { useApp } from "@/lib/store";
import { formatDuration } from "@/lib/utils";

export default function InsightsPage() {
  const { sessions, tasks } = useApp();

  // Calculate total focus time
  const totalFocusMinutes = sessions.reduce((sum, session) => sum + session.actualMin, 0);
  
  // Calculate average session length
  const avgSessionLength = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.actualMin, 0) / sessions.length)
    : 0;

  // Get task categories breakdown
  const categoryBreakdown = tasks.reduce((acc, task) => {
    acc[task.category] = (acc[task.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get most active hours (simplified - would be better with real data)
  const bestHours = "2-4pm"; // Mock data

  return (
    <Shell>
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Insights</h1>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-fuchsia-600">
              {formatDuration(totalFocusMinutes)}
            </div>
            <div className="text-xs text-gray-600">Total Focus Time</div>
          </div>
          
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-fuchsia-600">
              {sessions.length}
            </div>
            <div className="text-xs text-gray-600">Sessions Completed</div>
          </div>
          
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-fuchsia-600">
              {avgSessionLength > 0 ? formatDuration(avgSessionLength) : "—"}
            </div>
            <div className="text-xs text-gray-600">Avg Session</div>
          </div>
          
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-fuchsia-600">
              {bestHours}
            </div>
            <div className="text-xs text-gray-600">Best Window</div>
          </div>
        </div>

        {/* Category Breakdown */}
        {tasks.length > 0 && (
          <div className="card p-4">
            <h3 className="font-medium mb-3">Task Categories</h3>
            <div className="space-y-2">
              {Object.entries(categoryBreakdown).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-fuchsia-300"></div>
                    <span className="text-sm capitalize">{category}</span>
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="card p-4">
            <h3 className="font-medium mb-3">Recent Sessions</h3>
            <div className="space-y-2">
              {sessions.slice(-5).reverse().map(session => (
                <div key={session.id} className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    {new Date(session.at).toLocaleDateString()} at {new Date(session.at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </div>
                  <div className="font-medium">
                    {formatDuration(session.actualMin)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sessions.length === 0 && tasks.length === 0 && (
          <div className="card p-6 text-center">
            <div className="text-4xl mb-2">📈</div>
            <div className="font-medium mb-1">No data yet</div>
            <div className="text-sm text-gray-600">
              Complete some focus sessions to see your insights!
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}