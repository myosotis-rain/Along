"use client";
import { useApp } from "@/lib/store";
import OnboardingFlow from "./OnboardingFlow";
import { useEffect } from "react";

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const { userProfile, updateUserProfile } = useApp();

  // Handle Google Calendar auth callback (only for non-onboarding flows)
  useEffect(() => {
    // Only handle calendar auth if user has already completed onboarding
    if (!userProfile.onboardingCompleted) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');

    if (connected === '1') {
      // Successfully connected Google Calendar
      updateUserProfile({ hasConnectedGoogleCalendar: true });
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      console.error('Calendar connection error:', error);
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [updateUserProfile, userProfile.onboardingCompleted]);

  // Show onboarding if user hasn't completed it
  if (!userProfile.onboardingCompleted) {
    return <OnboardingFlow />;
  }

  return <>{children}</>;
}