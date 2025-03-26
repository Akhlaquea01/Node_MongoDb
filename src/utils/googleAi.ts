import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API }); // Ensure API key is loaded properly

/**
 * Function to get a chat response from Google GenAI
 * @param {string} model - The AI model to use (e.g., "gemini-2.0-flash").
 * @param {Array} messages - Array of message objects [{role: "user", content: "Hello"}].
 * @returns {Promise<string>} - The response from Google GenAI API.
 */
export async function getChatResponse(model, messages) {
    try {
        const response = await ai.models.generateContent({
            model: model || process.env.GOOGLE_GENAI_MODEL,
            contents: messages.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
        });

        return response.candidates[0]?.content?.parts[0]?.text || "";
    } catch (error) {
        console.error("Google GenAI API Error:", error);
        throw error;
    }
}

/**
 * Example usage
 * import { getChatResponse } from "./utils/googleAi.js";
 * async function runChat() {
    try {
        const response = await getChatResponse("gemini-2.0-flash", [
            { role: "user", content: "What is the meaning of life?" },
        ]);
        console.log("AI Response:", response);
    } catch (error) {
        console.error("Error getting response:", error);
    }
} 
*/
