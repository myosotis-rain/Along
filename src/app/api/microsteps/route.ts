import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { taskTitle, category, estimateMin } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Fallback microsteps when no API key
      const fallbackSteps = [
        "Open the necessary application or document",
        "Set up workspace with all needed materials",
        "Break the task into 2-3 smaller parts",
        "Start with the easiest or most important part",
        "Set a timer for focused work (15-25 minutes)"
      ];
      return NextResponse.json({ 
        microsteps: fallbackSteps.slice(0, 3 + Math.floor(Math.random() * 2))
      });
    }

    const prompt = `As a productivity coach, break down this task into 3-5 concrete, actionable microsteps. Make them specific, gentle, and easy to start:

Task: "${taskTitle}"
Category: ${category}
Estimated time: ${estimateMin} minutes

Focus on:
- Very specific first steps (no vague "plan" or "research")
- Physical actions someone can take immediately  
- Breaking down overwhelming parts
- Focus-friendly approach (timers, breaks, environment setup)

Return only the microsteps as a simple list, one per line. Each should be a complete sentence starting with an action verb.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 300,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the response into individual steps
    const microsteps = content
      .split('\n')
      .map((step: string) => step.trim())
      .filter((step: string) => step.length > 0)
      .map((step: string) => step.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, ''))
      .slice(0, 6); // Limit to 6 steps max

    return NextResponse.json({ microsteps });
  } catch (error) {
    console.error("Microsteps generation error:", error);
    
    // Enhanced fallback based on task details
    const { category = "other" } = await req.json().catch(() => ({}));
    
    const categorySteps = {
      study: [
        "Find a quiet space and gather study materials",
        "Set a 25-minute timer for focused study",
        "Review the main topic or chapter overview",
        "Take notes on key concepts in your own words",
        "Take a 5-minute break when timer goes off"
      ],
      writing: [
        "Open your writing app and create a new document",
        "Write down 3 main points you want to cover", 
        "Set a timer for 15 minutes of free writing",
        "Don't worry about perfect grammar, just get ideas down",
        "Read through and pick the best parts to develop"
      ],
      chores: [
        "Set upbeat music or a podcast to play",
        "Gather all supplies needed in one place",
        "Set a timer for 15-20 minutes",
        "Start with the easiest or most visible part",
        "Reward yourself with a break after the timer"
      ],
      admin: [
        "Gather all relevant documents or information",
        "Open the necessary website or application", 
        "Set a timer for 20 minutes of focused work",
        "Complete one small section at a time",
        "Take breaks every 20 minutes to avoid overwhelm"
      ]
    };

    const fallback = categorySteps[category as keyof typeof categorySteps] || [
      "Break this down into the smallest first step",
      "Set up your workspace with everything you need",
      "Set a timer for 15-25 minutes",
      "Focus on just starting, not finishing perfectly",
      "Plan a small reward for when you complete it"
    ];

    return NextResponse.json({ 
      microsteps: fallback.slice(0, 4),
      fallback: true 
    });
  }
}