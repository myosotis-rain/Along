import Link from "next/link";
import { usePathname } from "next/navigation";

// SVG Icon Components
const ChatIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.5 1.37 4.75 3.5 6.28V21l3.72-2.04c.83.15 1.69.23 2.78.23 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
  </svg>
);

const PlanIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
  </svg>
);

const ScheduleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19M7,10V12H9V10H7M15,10V12H17V10H15M11,14V16H13V14H11M15,14V16H17V14H15Z"/>
  </svg>
);

const FocusIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
  </svg>
);

const InsightsIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
  </svg>
);

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const tabs = [
    { href: "/", label: "Chat", icon: ChatIcon },
    { href: "/planner", label: "Plan", icon: PlanIcon },
    { href: "/schedule", label: "Schedule", icon: ScheduleIcon },
    { href: "/focus", label: "Focus", icon: FocusIcon },
    { href: "/insights", label: "Insights", icon: InsightsIcon },
  ];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-rose-50 via-fuchsia-50 to-orange-50">
      <header className="sticky top-0 z-20 backdrop-blur border-b bg-white/70 shadow-sm">
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
      
      <main className="max-w-xl mx-auto px-4 pb-32 pt-4">
        {children}
      </main>
      
      <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-gray-200 safe-area-bottom">
        <div className="max-w-xl mx-auto flex justify-around py-3 px-2">
          {tabs.map(t => (
            <Link 
              key={t.href} 
              href={t.href} 
              className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
                pathname === t.href 
                  ? 'text-fuchsia-700 bg-fuchsia-100/80 scale-105' 
                  : 'text-gray-600 hover:text-fuchsia-600 hover:bg-fuchsia-50/50'
              }`}
            >
              <t.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium leading-tight truncate w-full text-center">{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}