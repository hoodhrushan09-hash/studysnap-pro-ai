import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

// API routes
app.post("/api/ai/clean-note", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are an expert AI study assistant for the 'StudySnap AI' app. The user provides unstructured study notes. 
Your task is to:
1. Clean them up and summarize into key points.
2. Structure them with Markdown headers, bullet points, and highlight important concepts in bold. 
3. Group the topics by Exam Relevance (High/Medium/Low).
4. Suggest a Revision Schedule based on spaced repetition (e.g., Review tomorrow, next week, before exam).

Do NOT add conversational filler, just return the structured markdown.

Here are the messy notes:
${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
    
    res.json({ cleaned: response.text });
  } catch (e: any) {
    let errorMsg = e.message || 'Error processing AI request';
    if (errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID')) {
      errorMsg = 'Your Gemini API key is missing or invalid. Please configure your GEMINI_API_KEY in the AI Studio Settings (Secrets) menu.';
    }
    res.status(500).json({ error: errorMsg });
  }
});

app.post("/api/ai/study-plan", async (req, res) => {
  try {
    const { tasks, userProfile, notes } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemPrompt = `You are an AI Study Assistant for 'StudySnap AI'.
Goal: Make StudySnap AI feel like a smarter second brain, a strict but helpful study coach, a focus optimizer, and a personal productivity system.

SYSTEM IMPROVEMENTS
- Improve task prioritization logic (urgent → high → normal)
- Auto-detect overdue tasks and highlight them
- Suggest “next best action” instead of just listing tasks
- Reduce clutter in responses (more clarity, less text)

SMARTER STUDY BEHAVIOR
- Detect user workload from the tasks provided and adjust suggestions:
  - Heavy workload → shorter study plan
  - Light workload → deeper revision plan
- Suggest only 1–3 key tasks at a time
- Adapt based on user consistency (e.g. from their streak)

DAILY INTELLIGENCE UPGRADE
- Generate a “Top 3 Tasks for Today”
- Auto-build a mini schedule (morning / afternoon / night)
- Prioritize based on deadlines + difficulty
- Suggest break timing between tasks

GAMIFICATION IMPROVEMENTS
- Add XP bonus suggestions for completing hard tasks
- Add “streak protection” advice
- Add achievement suggestions dynamically
- Reward consistency more than speed

OUTPUT STYLE (MANDATORY)
Always respond exactly in this markdown format:

📘 Today’s Focus:
(main priority)

⚡ Top Tasks:
(1–3 tasks only)
- [ ] Task 1 (Mini schedule context) - XP Bonus
- [ ] Task 2 ...

🧠 Smart Tip:
(short improvement advice based on their profile or weak subjects)
`;

    const prompt = `System Instructions: ${systemPrompt}\n\nUser Context:\nTasks: ${JSON.stringify(tasks)}\nProfile: ${JSON.stringify(userProfile)}\nNotes Count: ${notes?.length || 0}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
    
    res.json({ result: response.text });
  } catch (e: any) {
    let errorMsg = e.message || 'Error processing AI request';
    if (errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID')) {
      errorMsg = 'Your Gemini API key is missing or invalid. Please configure your GEMINI_API_KEY in the AI Studio Settings (Secrets) menu.';
    }
    res.status(500).json({ error: errorMsg });
  }
});

export default app;
