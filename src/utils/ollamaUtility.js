// utils/ollamaUtility.js

import axios from 'axios';

const config = {
    apiUrl: process.env.API_URL || 'http://localhost:11434/api/chat', // Default Ollama URL
    model: 'deepseek-r1', // Default model for Ollama
};

// Function to set the API endpoint and model dynamically
export const setApiConfig = (apiUrl, model) => {
    config.apiUrl = apiUrl;
    config.model = model;
};

// Function to parse the response string and extract the final message
export const parseResponse = (responseStr) => {
    // Split the response string by newline character to separate the JSON objects
    const responseChunks = responseStr.split('\n');

    // Parse each JSON chunk and extract the message content
    const messages = responseChunks.map((chunk) => {
        try {
            const parsedChunk = JSON.parse(chunk);
            return parsedChunk?.message?.content || '';
        } catch (error) {
            console.error('Error parsing chunk:', chunk);
            return '';
        }
    });

    // Join all the message parts to form the complete message
    return messages.join('');
};

// Function to call the API with a message and get the response
export const getChatResponse = async (message) => {
    try {
        const response = await axios.post(config.apiUrl, {
            model: config.model,
            messages: [
                {
                    role: 'user',
                    content: message,
                },
            ],
        });

        // Parse the raw response string
        const fullResponse = parseResponse(response.data);

        // Return the full concatenated response message
        return fullResponse;
    } catch (error) {
        console.error('Error fetching chat response:', error.message);
        return null;
    }
};

/**
 * import { setApiConfig, getChatResponse } from './utils/ollamaUtility.js'
 
getChatResponse('Tell me a joke')
    .then((response) => console.log('Ollama response:', response));
 */