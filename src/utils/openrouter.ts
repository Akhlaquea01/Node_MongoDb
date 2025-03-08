import OpenAI from "openai";
// import { parseResponse } from './ollamaUtility'

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API, // Ensure API key is loaded properly
});

/**
 * Function to get a chat completion from OpenAI
 * @param {string} model - The AI model to use (e.g., "deepseek/deepseek-r1:free").
 * @param {Array} messages - Array of message objects [{role: "user", content: "Hello"}].
 * @returns {Promise<string>} - The response from OpenAI API.
 */
export async function getChatResponse(model, messages) {
    try {
        const completion = await openai.chat.completions.create({
            model: model || process.env.OPENROUTER_AI_MODEL,
            messages,
            max_tokens: 10000,
        });

        // return parseResponse(completion.choices[0].message.content);
        return completion.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI API Error:", error);
        throw error;
    }
}


/**
 * import {getChatResponse} from './utils/openrouter'
 * async function runChat() {
    try {
        const response = await getChatResponse("deepseek/deepseek-r1:free", [
            { role: "user", content: "What is the meaning of life?" },
        ]);

        console.log("AI Response:", response);
    } catch (error) {
        console.error("Error getting response:", error);
    }
}
 */