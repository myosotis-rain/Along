"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

type OnboardingStep = "welcome" | "profile" | "calendar" | "complete";

export default function OnboardingFlow() {
  const router = useRouter();
  const { userProfile, updateUserProfile, completeOnboarding } = useApp();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [name, setName] = useState(userProfile.name || "");
  const [email, setEmail] = useState(userProfile.email || "");

  // Initialize onboarding state and handle calendar connection
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const onboarding = urlParams.get("onboarding");
    const connected = urlParams.get("connected");

    if (onboarding === "calendar" && connected === "1") {
      updateUserProfile({ hasConnectedGoogleCalendar: true });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    let frame = 0;
    let nextStep: OnboardingStep | null = null;

    if (userProfile.name && !userProfile.hasConnectedGoogleCalendar) {
      if (currentStep === "welcome") {
        nextStep = "profile";
      } else if (currentStep === "profile") {
        nextStep = "calendar";
      }
    }

    if (userProfile.hasConnectedGoogleCalendar && currentStep === "calendar") {
      nextStep = "complete";
    }

    if (userProfile.name && userProfile.hasConnectedGoogleCalendar && currentStep !== "complete") {
      nextStep = "complete";
    }

    if (nextStep && nextStep !== currentStep) {
      frame = window.requestAnimationFrame(() => setCurrentStep(nextStep as OnboardingStep));
    }

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [currentStep, updateUserProfile, userProfile.hasConnectedGoogleCalendar, userProfile.name]);

  const handleNameSubmit = () => {
    if (name.trim()) {
      updateUserProfile({ name: name.trim(), email: email.trim() || undefined });
      setCurrentStep("calendar");
    }
  };

  const handleCalendarConnect = async () => {
    try {
      // Redirect to Google Calendar auth for onboarding
      window.location.href = '/api/gcal/auth/onboarding-start';
    } catch (error) {
      console.error('Failed to start calendar auth:', error);
      // Allow skipping for now
      setCurrentStep("complete");
    }
  };

  const handleSkipCalendar = () => {
    setCurrentStep("complete");
  };

  const handleComplete = () => {
    completeOnboarding();
    router.push("/"); // Redirect to the main planning page
  };

  const handleBack = () => {
    if (currentStep === "profile") {
      setCurrentStep("welcome");
    } else if (currentStep === "calendar") {
      setCurrentStep("profile");
    } else if (currentStep === "complete") {
      setCurrentStep(userProfile.hasConnectedGoogleCalendar ? "calendar" : "profile");
    }
  };

  const stepConfig = {
    welcome: {
      title: "Welcome to Along",
      subtitle: "Your planning companion for academic success",
      content: (
        <div className="space-y-8 text-center">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-brand rounded-3xl flex items-center justify-center shadow-sm">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                {/* Larger connected round petals */}
                <circle cx="12" cy="7" r="3"/>
                <circle cx="12" cy="7" r="3" transform="rotate(72 12 12)"/>
                <circle cx="12" cy="7" r="3" transform="rotate(144 12 12)"/>
                <circle cx="12" cy="7" r="3" transform="rotate(216 12 12)"/>
                <circle cx="12" cy="7" r="3" transform="rotate(288 12 12)"/>
                
                {/* Large hollow center */}
                <circle cx="12" cy="12" r="2.5" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
          <div className="space-y-5">
            <p className="text-gray-700 text-lg leading-relaxed">
              Along helps you break down tasks, externalize time, and make better decisions about what to work on.
            </p>
            <p className="text-sm text-gray-500 font-medium">
              Let&rsquo;s get you set up in just a few steps.
            </p>
          </div>
          <button 
            onClick={() => setCurrentStep("profile")}
            className="w-full py-3.5 bg-cta text-white rounded-2xl font-medium hover:opacity-90 transition-all shadow-sm"
          >
            Get started
          </button>
        </div>
      )
    },
    profile: {
      title: "What's your name?",
      subtitle: "This helps personalize your experience",
      content: (
        <div className="space-y-7">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your first name"
              className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none text-gray-900 placeholder-gray-400 bg-white/80"
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none text-gray-900 placeholder-gray-400 bg-white/80"
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            />
          </div>
          <button 
            onClick={handleNameSubmit}
            disabled={!name.trim()}
            className="w-full py-3.5 bg-cta text-white rounded-2xl font-medium hover:opacity-90 transition-all shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Continue
          </button>
        </div>
      )
    },
    calendar: {
      title: "Connect your calendar",
      subtitle: "Get better suggestions that fit your actual schedule",
      content: (
        <div className="space-y-7">
          <div className="bg-blue-50/80 border border-blue-100 p-6 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-3">This enables Along to:</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Find free time between classes for studying</li>
                  <li>• Suggest realistic blocks for assignments</li>
                  <li>• Avoid conflicts with exams and deadlines</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={handleCalendarConnect}
              className="w-full py-3.5 bg-cta text-white rounded-2xl font-medium hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Calendar
            </button>
            <button 
              onClick={handleSkipCalendar}
              className="w-full py-3.5 border border-gray-200 text-gray-600 rounded-2xl font-medium hover:bg-gray-50 transition-all"
            >
              Skip for now
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center font-medium">
            You can always connect your calendar later in settings
          </p>
        </div>
      )
    },
    complete: {
      title: `All set, ${userProfile.name || name || 'there'}!`,
      subtitle: "Ready to tackle your coursework",
      content: (
        <div className="space-y-8 text-center">
          <div className="w-20 h-20 mx-auto bg-green-50 border border-green-100 rounded-3xl flex items-center justify-center shadow-sm">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-5">
            <p className="text-gray-700 text-lg leading-relaxed">
              Tell Along what assignment or project you are working on, and it will help break it down into manageable pieces.
            </p>
            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-5">
              <p className="text-sm text-gray-600">
                Try: &ldquo;I need to write my essay&rdquo; or &ldquo;I have a lab report due&rdquo;
              </p>
            </div>
          </div>
          <button 
            onClick={handleComplete}
            className="w-full py-3.5 bg-cta text-white rounded-2xl font-medium hover:opacity-90 transition-all shadow-sm"
          >
            Start planning
          </button>
        </div>
      )
    }
  };

  const currentStepConfig = stepConfig[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-fuchsia-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="card p-8 space-y-7">
          {currentStep !== "welcome" && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          {/* Progress indicator */}
          <div className="flex justify-center space-x-3 mb-8">
            {(["welcome", "profile", "calendar", "complete"] as OnboardingStep[]).map((step, index) => (
              <div
                key={step}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? "bg-purple-400 scale-125"
                    : index < (["welcome", "profile", "calendar", "complete"] as OnboardingStep[]).indexOf(currentStep)
                    ? "bg-purple-200"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="text-center space-y-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {currentStepConfig.title}
            </h1>
            <p className="text-gray-600 text-base">
              {currentStepConfig.subtitle}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStepConfig.content}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Your data stays local unless you enable GPT features
          </p>
        </div>
      </motion.div>
    </div>
  );
}
