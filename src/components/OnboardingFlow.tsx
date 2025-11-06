"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/store";

type OnboardingStep = "welcome" | "profile" | "calendar" | "complete";

export default function OnboardingFlow() {
  const { userProfile, updateUserProfile, completeOnboarding } = useApp();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [name, setName] = useState(userProfile.name || "");
  const [email, setEmail] = useState(userProfile.email || "");

  // Initialize onboarding state and handle calendar connection
  useEffect(() => {
    // If user has a name but hasn't connected calendar yet, start at calendar step
    if (userProfile.name && !userProfile.hasConnectedGoogleCalendar && currentStep === "welcome") {
      setCurrentStep("calendar");
    }
    
    // If user just connected calendar, go to complete step
    if (userProfile.hasConnectedGoogleCalendar && currentStep === "calendar") {
      setCurrentStep("complete");
    }

    // If user has both name and calendar connected, show complete step
    if (userProfile.name && userProfile.hasConnectedGoogleCalendar && currentStep !== "complete") {
      setCurrentStep("complete");
    }
  }, [userProfile.hasConnectedGoogleCalendar, userProfile.name, currentStep]);

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
  };

  const stepConfig = {
    welcome: {
      title: "Welcome to Along",
      subtitle: "Your calm, pragmatic planning companion",
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-3">
            <p className="text-gray-600">
              Along helps you break down tasks, externalize time, and make better decisions about what to work on.
            </p>
            <p className="text-gray-600">
              Let's get you set up in just a few steps.
            </p>
          </div>
          <button 
            onClick={() => setCurrentStep("profile")}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Get Started
          </button>
        </div>
      )
    },
    profile: {
      title: "Tell me about yourself",
      subtitle: "This helps Along personalize your experience",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What should I call you? *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            />
          </div>
          <button 
            onClick={handleNameSubmit}
            disabled={!name.trim()}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )
    },
    calendar: {
      title: "Connect your calendar",
      subtitle: "Along works best when it knows your schedule",
      content: (
        <div className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-xl">
            <h3 className="font-medium text-purple-900 mb-2">Why connect Google Calendar?</h3>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Find free time slots for focus sessions</li>
              <li>• Avoid scheduling conflicts</li>
              <li>• Get realistic time estimates</li>
              <li>• Smart suggestions based on your actual schedule</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={handleCalendarConnect}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
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
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Skip for now
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            You can always connect your calendar later in Settings
          </p>
        </div>
      )
    },
    complete: {
      title: `Welcome, ${userProfile.name || name || 'there'}! 🎉`,
      subtitle: "You're all set up and ready to get things done",
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-3">
            <p className="text-gray-600">
              I'm here to help you break things down, externalize time, and make thoughtful decisions about what to work on.
            </p>
            <p className="text-gray-600">
              Ready to get started?
            </p>
          </div>
          <button 
            onClick={handleComplete}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all"
          >
            Start Using Along
          </button>
        </div>
      )
    }
  };

  const currentStepConfig = stepConfig[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="card p-8 space-y-6">
          {/* Progress indicator */}
          <div className="flex justify-center space-x-2 mb-8">
            {(["welcome", "profile", "calendar", "complete"] as OnboardingStep[]).map((step, index) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step === currentStep
                    ? "bg-purple-500"
                    : index < (["welcome", "profile", "calendar", "complete"] as OnboardingStep[]).indexOf(currentStep)
                    ? "bg-purple-300"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentStepConfig.title}
            </h1>
            <p className="text-gray-600">
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