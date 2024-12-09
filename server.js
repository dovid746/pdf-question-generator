const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const OpenAI = require('openai');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// In-memory storage for notes
let notes = [];

// Store PDF content in memory
let pdfContent = '';

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
});

// API endpoints
app.get('/api/notes', (req, res) => {
    console.log('Sending notes:', notes);
    res.json(notes);
});

app.post('/api/notes', (req, res) => {
    try {
        console.log('Creating new note with body:', req.body);
        
        // Create new note with default values if none provided
        const newNote = {
            id: uuidv4(),
            title: req.body?.title || 'Untitled',
            content: req.body?.content || '',
            timestamp: new Date().toISOString()
        };
        
        console.log('New note created:', newNote);
        notes.push(newNote);
        res.status(201).json(newNote);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note', details: error.message });
    }
});

app.put('/api/notes/:id', (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Updating note ${id} with:`, req.body);
        
        const noteIndex = notes.findIndex(note => note.id === id);
        if (noteIndex === -1) {
            console.log('Note not found:', id);
            return res.status(404).json({ error: 'Note not found' });
        }

        const updatedNote = {
            ...notes[noteIndex],
            title: req.body?.title || notes[noteIndex].title,
            content: req.body?.content || notes[noteIndex].content,
            timestamp: new Date().toISOString()
        };

        notes[noteIndex] = updatedNote;
        console.log('Note updated:', updatedNote);
        res.json(updatedNote);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note', details: error.message });
    }
});

app.delete('/api/notes/:id', (req, res) => {
    try {
        const { id } = req.params;
        console.log('Deleting note:', id);
        
        const noteIndex = notes.findIndex(note => note.id === id);
        if (noteIndex === -1) {
            console.log('Note not found for deletion:', id);
            return res.status(404).json({ error: 'Note not found' });
        }

        notes = notes.filter(note => note.id !== id);
        console.log('Note deleted successfully');
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note', details: error.message });
    }
});

// PDF upload endpoint
app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        pdfContent = data.text;

        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);

        res.json({ 
            message: 'PDF uploaded and processed successfully',
            pageCount: data.numpages,
            characters: pdfContent.length
        });
    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ error: 'Error processing PDF file' });
    }
});

// Chat endpoint
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        let systemMessage = "You are a helpful assistant.";
        
        if (pdfContent) {
            systemMessage = `You are a helpful assistant. You have access to the following document content: \n\n${pdfContent}\n\nPlease use this content to help answer questions when relevant.`;
        }
        
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            model: "gpt-3.5-turbo",
        });

        res.json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Modified chat endpoint to generate questions based on audience
app.post('/generate-questions', async (req, res) => {
    try {
        const { audience } = req.body;
        
        if (!pdfContent) {
            return res.status(400).json({ error: 'No PDF content available. Please upload a PDF first.' });
        }

        if (!audience) {
            return res.status(400).json({ error: 'Please provide an audience description.' });
        }

        const prompt = `You are an expert at understanding different audiences and their needs. 
        Given the following document content and target audience, generate 5-7 important questions that this audience would likely have about the content.
        Make the questions specific to both the content and the audience's perspective.

        Target Audience: ${audience}

        Document Content:
        ${pdfContent}

        Generate specific, relevant questions that this audience would ask about this document.`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert at analyzing documents and generating relevant questions from different audience perspectives." },
                { role: "user", content: prompt }
            ],
            model: "gpt-3.5-turbo",
        });

        // Parse the response into an array of questions
        const response = completion.choices[0].message.content;
        const questions = response
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^\d+[\)\.]\s*/, '').trim())
            .filter(line => line.endsWith('?'));

        res.json({ questions });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error generating questions' });
    }
});

// Serve chat interface
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error', 
        details: err.message,
        path: req.path,
        method: req.method
    });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Debug logging enabled');
});
