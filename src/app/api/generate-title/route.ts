import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: "Title generation unavailable",
        title: description.slice(0, 50) + (description.length > 50 ? "..." : "")
      });
    }

    const prompt = `Extract a concise, actionable task title from this description. The title should be 2-6 words and capture the main action/goal:

"${description}"

Examples:
- "I need to write a research paper on climate change for my environmental science class" → "Write climate change paper"
- "Tomorrow I have to call the dentist office to schedule an appointment for a cleaning" → "Schedule dentist appointment"
- "I should organize all the files in my Downloads folder because it's getting messy" → "Organize Downloads folder"

Return ONLY the title, nothing else.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 50,
        messages: [
          { 
            role: "system", 
            content: "You are an expert at extracting concise, actionable task titles. Focus on the main action and key noun."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    const title = data?.choices?.[0]?.message?.content?.trim();
    
    if (!title) {
      throw new Error("No response from OpenAI");
    }

    // Fallback cleaning - remove quotes and ensure reasonable length
    const cleanTitle = title.replace(/['"]/g, '').slice(0, 60);

    return NextResponse.json({ title: cleanTitle });
  } catch (error) {
    console.error("Title generation error:", error);
    
    // Fallback: create title from first few words
    const { description } = await req.json();
    const fallbackTitle = description
      .split(' ')
      .slice(0, 4)
      .join(' ')
      .replace(/[^\w\s]/g, '')
      .slice(0, 50) + (description.split(' ').length > 4 ? "..." : "");
    
    return NextResponse.json({ 
      title: fallbackTitle,
      error: "Generated fallback title"
    });
  }
}