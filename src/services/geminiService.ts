import { GoogleGenAI, Type } from "@google/genai";
import { Question, ExamDomain } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateQuestions = async (setNumber: number, startIndex: number, count: number): Promise<Question[]> => {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `Generate ${count} CompTIA Project+ (PK0-005) exam questions for Exam Set #${setNumber}, starting from question index ${startIndex + 1}.
  Each question must be bilingual (English and Chinese).
  Cover these domains: Project Basics, Project Constraints, Communication and Change Management, Project Tools and Documentation.
  Ensure the questions are professional, realistic, and match the difficulty of the actual exam.
  
  For the explanationEn and explanationZh fields, provide a VERY DETAILED analysis:
  1. Explain why the correct answer is right.
  2. Explain why each of the other options is incorrect.
  3. Provide a brief summary of the key concept being tested.
  Use Markdown formatting (bolding, lists) for clarity.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            domain: { type: Type.STRING, enum: Object.values(ExamDomain) },
            questionEn: { type: Type.STRING },
            questionZh: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  textEn: { type: Type.STRING },
                  textZh: { type: Type.STRING }
                },
                required: ["key", "textEn", "textZh"]
              }
            },
            correctAnswer: { type: Type.STRING },
            explanationEn: { type: Type.STRING },
            explanationZh: { type: Type.STRING }
          },
          required: ["id", "domain", "questionEn", "questionZh", "options", "correctAnswer", "explanationEn", "explanationZh"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const generateFinalAnalysis = async (results: any): Promise<string> => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Analyze these CompTIA Project+ exam results and provide a detailed study recommendation in both English and Chinese.
  Results: ${JSON.stringify(results)}
  Focus on identifying weak domains and suggesting specific topics to review.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || "Analysis unavailable.";
};
