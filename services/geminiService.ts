import { GoogleGenAI, Type } from "@google/genai";
import { MASTERS } from "../constants";
import { Master, Message } from "../types";

const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// Analyze problem and recommend masters
export const recommendMasters = async (problem: string): Promise<string[]> => {
  try {
    const ai = getAIClient();
    
    const mastersList = MASTERS.map(m => `${m.id}: ${m.name} (${m.description})`).join('\n');
    const prompt = `
      分析以下用户问题: "${problem}".
      从下方的大师列表中，识别出最适合提供建议的 3 位大师。
      大师列表:
      ${mastersList}
      
      仅返回一个包含 3 个大师 ID 的有效 JSON 字符串数组。不要使用 markdown 代码块，仅返回原始 JSON 字符串。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error recommending masters:", error);
    // Fallback to first 3 if error
    return [MASTERS[0].id, MASTERS[1].id, MASTERS[2].id];
  }
};

// Get advice from a specific master
export const getMasterAdvice = async (
  master: Master, 
  problem: string, 
  history: Message[]
): Promise<string> => {
  try {
    const ai = getAIClient();

    // Construct history for context
    // Filter messages relevant to this master or general user messages
    // However, for the initial generation, we mainly need the system instruction + problem.
    // For follow ups, we need the history.
    
    const chatHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    // If it's the first message, ensuring the problem is clear
    if (chatHistory.length === 0) {
        chatHistory.push({
            role: 'user',
            parts: [{ text: problem }]
        });
    }

    // We use generateContent, but we act as if it's a chat by providing the persona in systemInstruction
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: chatHistory,
      config: {
        systemInstruction: master.systemInstruction + "\n\nContext: 用户正在寻求关于特定生活/职业问题的建议。必须完全使用中文回答。请深刻、直接，并严格保持人设。",
      }
    });

    return response.text || "大师正在沉思...";
  } catch (error) {
    console.error(`Error getting advice from ${master.name}:`, error);
    return "我暂时无法思考您的问题，请重试。";
  }
};
