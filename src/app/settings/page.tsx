"use client";
import Shell from "@/components/Shell";
import AppWrapper from "@/components/AppWrapper";
import { useApp } from "@/lib/store";
import { useState } from "react";
import DataManager from "@/components/DataManager";

export default function SettingsPage() {
  const { prefs, updatePrefs, useGPT, updateUseGPT, userProfile, updateUserProfile } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile.name || "");
  
  const [hasLocalKey, setHasLocalKey] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return Boolean(localStorage.getItem("openai_api_key"));
  });
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const stored = localStorage.getItem("openai_api_key");
    return stored ? "sk-..." + stored.slice(-6) : "";
  });

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("openai_api_key", apiKey.trim());
      setHasLocalKey(true);
      setApiKey("sk-..." + apiKey.slice(-6)); // Mask it
    }
  };

  const removeApiKey = () => {
    localStorage.removeItem("openai_api_key");
    setHasLocalKey(false);
    setApiKey("");
  };

  const saveName = () => {
    if (nameInput.trim()) {
      updateUserProfile({ name: nameInput.trim() });
      setEditingName(false);
    }
  };

  const cancelNameEdit = () => {
    setNameInput(userProfile.name || "");
    setEditingName(false);
  };

  return (
    <AppWrapper>
      <Shell>
      <div className="space-y-6">
        <h1 className="text-lg font-semibold">Settings</h1>
        
        {/* Profile Settings */}
        <div className="card p-4">
          <h3 className="font-medium mb-3">Profile</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Your Name</label>
              <div className="flex items-center gap-3">
                {editingName ? (
                  <>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName();
                        if (e.key === 'Escape') cancelNameEdit();
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your name"
                      autoFocus
                    />
                    <button
                      onClick={saveName}
                      disabled={!nameInput.trim()}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelNameEdit}
                      className="px-3 py-2 bg-gray-400 text-white text-sm rounded-lg hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                      {userProfile.name || "No name set"}
                    </div>
                    <button
                      onClick={() => setEditingName(true)}
                      className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">This name appears in greetings throughout the app</p>
            </div>
          </div>
        </div>
        
        {/* AI Integration */}
        <div className="card p-4">
          <h3 className="font-medium mb-3">AI Integration</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Use GPT for responses</div>
                <div className="text-xs text-gray-600">
                  Enable AI-powered coaching responses
                </div>
              </div>
              <button
                onClick={() => updateUseGPT(!useGPT)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useGPT ? 'bg-fuchsia-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    useGPT ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {useGPT && (
              <div>
                <label className="text-sm font-medium block mb-2">
                  OpenAI API Key (Optional)
                </label>
                <div className="space-y-2">
                  <input
                    type={hasLocalKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    disabled={hasLocalKey}
                    className="w-full p-2 text-sm border rounded-lg bg-white/50 disabled:bg-gray-100"
                  />
                  <div className="flex gap-2">
                    {!hasLocalKey ? (
                      <button
                        onClick={saveApiKey}
                        disabled={!apiKey.trim()}
                        className="px-3 py-1 text-sm rounded-lg bg-fuchsia-600 text-white disabled:opacity-50"
                      >
                        Save Key
                      </button>
                    ) : (
                      <button
                        onClick={removeApiKey}
                        className="px-3 py-1 text-sm rounded-lg border"
                      >
                        Remove Key
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    Keys are stored locally in your browser. The server also has a backup key.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Focus Preferences */}
        <div className="card p-4">
          <h3 className="font-medium mb-3">Focus Preferences</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                Check-in interval: {prefs.checkInMin} minutes
              </label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={prefs.checkInMin}
                onChange={(e) => updatePrefs({ checkInMin: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>5min</span>
                <span>60min</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Do not nag mode</div>
                <div className="text-xs text-gray-600">
                  Gentle suggestions only, no persistent reminders
                </div>
              </div>
              <button
                onClick={() => updatePrefs({ doNotNag: !prefs.doNotNag })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  prefs.doNotNag ? 'bg-fuchsia-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    prefs.doNotNag ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="card p-4">
          <h3 className="font-medium mb-3">Privacy</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Local-only mode</div>
              <div className="text-xs text-gray-600">
                Keep all data in your browser (no server sync)
              </div>
            </div>
            <button
              onClick={() => updatePrefs({ privacyLocalOnly: !prefs.privacyLocalOnly })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.privacyLocalOnly ? 'bg-fuchsia-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  prefs.privacyLocalOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* About */}
        <div className="card p-4">
          <h3 className="font-medium mb-3">About Along</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Along is your gentle productivity companion, designed to help you break tasks into manageable steps and maintain focus.
            </p>
            <p>
              Version 2.0 • Built with Next.js, Tailwind CSS, and Framer Motion
            </p>
          </div>
        </div>

        {/* Data Management */}
        <DataManager />
      </div>
      </Shell>
    </AppWrapper>
  );
}
