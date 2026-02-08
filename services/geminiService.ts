import { GoogleGenAI } from "@google/genai";
import { AI_SYSTEM_PROMPT } from "../constants";

export const generateScript = async (userPrompt: string, errorContext?: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let finalPrompt = userPrompt;
  if (errorContext) {
      finalPrompt = `FIX THIS CODE:\n${userPrompt}\n\nERRORS:\n${errorContext}\n\nRETURN THE FIXED CODE ONLY.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: finalPrompt,
      config: {
        systemInstruction: AI_SYSTEM_PROMPT,
        temperature: errorContext ? 0.2 : 0.4, // Lower temp for fixes
        maxOutputTokens: 8192, 
      }
    });

    const text = response.text;
    if (!text) return "# Error: No code generated";
    
    return text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "# Error connecting to AI Assistant";
  }
};