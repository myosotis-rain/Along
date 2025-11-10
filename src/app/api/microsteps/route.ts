import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { taskTitle, category, estimateMin, description, existingSteps = [], refine = false } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: "Step generation unavailable. Break this down yourself for now.",
        microsteps: []
      });
    }

    const taskContext = description || taskTitle;
    const basePrompt = `I'm procrastinating on this task: "${taskContext}" (${estimateMin} min, ${category})

Break it into a complete sequence of tiny microsteps that covers the entire task from start to finish. Each step should be:
- The literal next physical action I can take
- So small I can't say no to it
- Specific enough that I know exactly what to do
- 3-6 words max, starting with an action verb

Generate ALL steps needed to complete the entire task, not just the first few. Include beginning, middle, and end steps.

Think like this:
- NOT: "Research the topic" → TOO VAGUE
- YES: "Open Google and search '[specific term]'"
- NOT: "Write essay" → TOO BIG  
- YES: "Write one sentence about main point"
- NOT: "Study chapter" → TOO VAGUE
- YES: "Read first page of chapter 3"

Examples of COMPLETE task breakdowns:
For "Write history essay":
- Open Google Docs
- Type essay title  
- Write thesis sentence
- Find three sources online
- Draft first paragraph
- Write second paragraph
- Write third paragraph
- Draft conclusion
- Read entire essay
- Fix grammar errors
- Check citation format
- Submit final essay

For "Study for math exam":
- Open textbook to chapter 5
- Read first example problem
- Copy problem in notebook  
- Solve step by step
- Check answer in back
- Try second problem
- Solve third problem
- Review chapter summary
- Take practice quiz
- Check quiz answers
- Review wrong answers
- Create formula cheat sheet

Return ONLY the complete microsteps sequence, one per line.`;
    const refinePrompt = existingSteps.length
      ? `\n\nCurrent microsteps: ${existingSteps.join(" | ")}\nRewrite these by making each step more concrete (3-6 words, action-first).`
      : "";
    const prompt = refine ? `${basePrompt}${refinePrompt}` : basePrompt;

    const model = process.env.OPENAI_MODEL_MICROSTEPS || process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 800,
        messages: [
          { 
            role: "system", 
            content: "You are an expert at breaking down tasks into complete sequences of tiny, actionable steps that eliminate procrastination. Focus on providing ALL steps needed from start to finish."
          },
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

    return NextResponse.json({ microsteps });
  } catch (error) {
    console.error("Microsteps generation error:", error);
    
    return NextResponse.json({ 
      error: "Couldn't generate steps right now. Try again later.",
      microsteps: []
    });
  }
}
