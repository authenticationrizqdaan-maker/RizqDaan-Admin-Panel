
import { GoogleGenAI } from "@google/genai";

/**
 * Generates a compelling business description using the Gemini API.
 */
export const generateDescription = async (keywords: string): Promise<string> => {
  const prompt = `Create a compelling and brief business listing description for a local Pakistani audience. Keywords: "${keywords}". Single paragraph only.`;

  try {
    // 1. Initialization: Always create a new instance inside the function with process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // 2. Model Selection: gemini-3-flash-preview is perfect for simple text generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // 3. Extraction: Correct way to access text output
    return response.text?.trim() || "Description could not be generated.";
  } catch (error: any) {
    console.error("Gemini Generation Error:", error?.message || "Unknown error");
    return "We couldn't generate a description at this time. Please try writing one manually.";
  }
};
