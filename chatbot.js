require('dotenv').config();
const OpenAI = require('openai');
const readline = require('readline');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Create readline interface for console input/output
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get chat completion from OpenAI
async function getChatResponse(userInput) {
    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: userInput }],
            model: "gpt-3.5-turbo",
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error:', error.message);
        return 'Sorry, I encountered an error. Please try again.';
    }
}

// Main chat loop
async function chat() {
    console.log('Chatbot: Hello! I\'m your AI assistant. Type "exit" to end the conversation.');

    const askQuestion = () => {
        rl.question('You: ', async (input) => {
            if (input.toLowerCase() === 'exit') {
                console.log('Chatbot: Goodbye!');
                rl.close();
                return;
            }

            const response = await getChatResponse(input);
            console.log('Chatbot:', response);
            askQuestion();
        });
    };

    askQuestion();
}

// Start the chat
chat();
