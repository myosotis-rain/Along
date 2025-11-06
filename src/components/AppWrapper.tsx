"use client";
import { useApp } from "@/lib/store";
import OnboardingFlow from "./OnboardingFlow";
import { useEffect } from "react";

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const { userProfile, updateUserProfile } = useApp();

  // Handle Google Calendar auth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onboarding = urlParams.get('onboarding');
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');

    if (onboarding === 'calendar') {
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
    }
  }, [updateUserProfile]);

  // Show onboarding if user hasn't completed it
  if (!userProfile.onboardingCompleted) {
    return <OnboardingFlow />;
  }

  return <>{children}</>;
}