// netlify/functions/get-gpt-response.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST' ) {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Get the prompt from the frontend's request
        const { prompt } = JSON.parse(event.body);

        // Get the secret API key from the environment variables
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error("OpenAI API key is not configured.");
        }

        // Call the OpenAI API from the backend
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8
            } )
        });

        const data = await response.json();

        // Send the response from OpenAI back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error('Error querying GPT via serverless function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to get response from AI.', error: error.message }),
        };
    }
};
