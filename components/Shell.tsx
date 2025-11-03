import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const tabs = [
    { href: "/", label: "Chat", icon: "💬" },
    { href: "/planner", label: "Plan", icon: "🗂️" },
    { href: "/schedule", label: "Schedule", icon: "🗓️" },
    { href: "/focus", label: "Focus", icon: "⏱️" },
    { href: "/insights", label: "Insights", icon: "📈" },
  ];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-rose-50 via-fuchsia-50 to-orange-50">
      <header className="sticky top-0 z-20 backdrop-blur border-b bg-white/60">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand grid place-items-center">
              🌸
            </div>
            <div className="font-semibold">Along</div>
          </div>
          <Link 
            className="text-sm text-fuchsia-700 hover:text-fuchsia-800 transition-colors" 
            href="/settings"
          >
            Settings
          </Link>
        </div>
      </header>
      
      <main className="max-w-xl mx-auto px-4 pb-24 pt-4">
        {children}
      </main>
      
      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur border-t">
        <div className="max-w-xl mx-auto flex justify-around py-2">
          {tabs.map(t => (
            <Link 
              key={t.href} 
              href={t.href} 
              className={`text-xs flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                pathname === t.href 
                  ? 'text-fuchsia-700 bg-fuchsia-50' 
                  : 'text-gray-600 hover:text-fuchsia-600'
              }`}
            >
              <span className="text-base mb-1">{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}