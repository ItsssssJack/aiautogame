import { GoogleGenAI, Type } from "@google/genai";

// Safe initialization check
const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface CommentaryResult {
  rankTitle: string;
  comment: string;
}

export const getScoreCommentary = async (score: number, durationSeconds: number): Promise<CommentaryResult> => {
  if (!ai) {
    return {
      rankTitle: "Local Hero",
      comment: "API Key missing - but great effort regardless!"
    };
  }

  try {
    const prompt = `
      The player just finished a game of 'Neon Lane Runner'.
      Score: ${score}.
      Duration: ${durationSeconds.toFixed(1)} seconds.
      
      Generate a very brief, witty, arcade-style rank title (max 3 words) and a short, snarky or praising comment (max 10 words) based on their performance.
      High scores (>5000) deserve praise, low scores deserve a friendly roast.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rankTitle: { type: Type.STRING },
            comment: { type: Type.STRING },
          },
          required: ["rankTitle", "comment"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text response");
    
    return JSON.parse(text) as CommentaryResult;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback responses
    if (score < 500) return { rankTitle: "Lane Learner", comment: "Keep your eyes on the road!" };
    if (score < 2000) return { rankTitle: "Traffic Dodger", comment: "Not bad, but you can go faster." };
    return { rankTitle: "Neon God", comment: "Absolute perfection. The machine bows to you." };
  }
};
