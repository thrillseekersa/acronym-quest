const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Key from environment variable
const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDcWaopzUiC2mwycP1EmEjxDdCuar7gdak";
const genAI = new GoogleGenerativeAI(API_KEY);

// ---- PDF Parse + AI Format Endpoint ----
app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📄 Parsing PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    // Step 1: Extract raw text from PDF
    const data = await pdfParse(req.file.buffer);
    const rawText = data.text;
    console.log(`📝 Extracted ${rawText.length} characters of text`);

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'PDF appears to be empty or image-based' });
    }

    // Step 2: Split text into chunks and process each with Gemini
    const CHUNK_SIZE = 12000;
    const chunks = [];
    for (let i = 0; i < rawText.length; i += CHUNK_SIZE) {
      chunks.push(rawText.substring(i, i + CHUNK_SIZE));
    }
    console.log(`🤖 Processing ${chunks.length} chunk(s) with Gemini...`);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192
      }
    });

    let allAcronyms = [];

    for (let c = 0; c < chunks.length; c++) {
      console.log(`  📦 Chunk ${c + 1}/${chunks.length} (${chunks[c].length} chars)...`);

      const prompt = `Extract all acronyms from this text. Return a JSON array where each item has: "acronym" (the abbreviation), "breakdown" (what it stands for), "meaning" (a short definition).

Text:
${chunks[c]}

Return ONLY a JSON array of objects.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        // Fallback: repair truncated JSON
        const lastBrace = responseText.lastIndexOf('}');
        if (lastBrace > 0) {
          let repaired = responseText.substring(0, lastBrace + 1);
          const firstBracket = repaired.indexOf('[');
          if (firstBracket >= 0) repaired = repaired.substring(firstBracket);
          repaired += ']';
          try { parsed = JSON.parse(repaired); } catch (e2) { parsed = []; }
        } else {
          parsed = [];
        }
      }

      if (Array.isArray(parsed)) {
        allAcronyms.push(...parsed);
      }
    }

    // Deduplicate by acronym name (case-insensitive)
    const seen = new Set();
    allAcronyms = allAcronyms.filter(a => {
      if (!a || !a.acronym || !a.breakdown) return false;
      const key = a.acronym.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`✅ AI extracted ${allAcronyms.length} unique acronyms from full PDF`);

    res.json({ 
      text: rawText,
      acronyms: allAcronyms,
      count: allAcronyms.length 
    });
  } catch (err) {
    console.error('PDF parse error:', err);
    res.status(500).json({ error: err.message || 'Failed to parse PDF' });
  }
});

// ---- Quiz Generation Endpoint ----
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { text, topic, difficulty, fileUrl } = req.body;

    if (!text && !fileUrl) {
      return res.status(400).json({ error: 'Missing required field: text or fileUrl' });
    }
    if (!topic || !difficulty) {
      return res.status(400).json({ error: 'Missing topic or difficulty' });
    }

    let contextText = text;
    if (!contextText && fileUrl) {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(fileUrl);
      const buffer = await response.buffer();
      const pdfData = await pdfParse(buffer);
      contextText = pdfData.text;
    }

    contextText = contextText.substring(0, 20000);
    const count = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 5;

    const prompt = `You are an expert teacher creating a quiz based *strictly* on the provided text.
Topic: ${topic}
Difficulty: ${difficulty}
Text:
---
${contextText}
---
Create a multiple choice quiz with exactly ${count} questions.
Respond ONLY with a valid JSON array. No markdown blocks.
Schema: { "question": "...", "options": ["A", "B", "C", "D"], "answer": 0 }`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI did not return valid JSON' });
    }

    const quizData = JSON.parse(jsonMatch[0]);
    res.json(quizData);
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: err.message || 'Quiz generation failed' });
  }
});

// ---- AI Research Analysis Endpoint ----
app.post('/api/analyze-results', async (req, res) => {
  try {
    const { results } = req.body;
    if (!results || results.length === 0) {
      return res.status(400).json({ error: 'No results provided' });
    }

    const manualResults = results.filter(r => r.studyGroup === 'Manual');
    const gamifiedResults = results.filter(r => r.studyGroup === 'Gamified');

    const prompt = `You are a research analyst for a pedagogical study comparing two learning methods.

STUDY DESIGN:
- "Manual" group: Students study with a simple text list of acronyms (no gamification)
- "Gamified" group: Students study with leaderboards, badges, live peer achievements, and point systems

DATA (anonymized):
Manual Group (${manualResults.length} results):
${JSON.stringify(manualResults, null, 2)}

Gamified Group (${gamifiedResults.length} results):
${JSON.stringify(gamifiedResults, null, 2)}

Please provide:
1. Average score comparison between groups
2. Which group is performing better and by how much
3. Observations about time-on-task differences
4. Statistical significance assessment (if enough data)
5. Recommendations for the researcher
6. Any notable patterns or outliers

Keep your analysis concise, professional, and data-driven.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({ summary });
  } catch (err) {
    console.error('AI analysis error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// ---- Student AI Chat Endpoint ----
app.post('/api/ask-ai', async (req, res) => {
  try {
    const { question, acronyms, chatHistory } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'No question provided' });
    }

    // Build context from the acronyms the student is studying
    let acronymContext = '';
    if (acronyms && acronyms.length > 0) {
      acronymContext = acronyms.map(a => `${a.acronym}: ${a.breakdown} — ${a.meaning}`).join('\n');
    }

    // Build conversation history for multi-turn
    let historyContext = '';
    if (chatHistory && chatHistory.length > 0) {
      historyContext = chatHistory.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n');
    }

    const prompt = `You are a friendly, encouraging AI tutor helping a student learn IT acronyms. 
You should explain concepts simply and clearly, using analogies when helpful.
Keep responses concise (2-4 sentences max) and educational.
Use emojis sparingly to keep the tone fun.

${acronymContext ? `Here are the acronyms the student is currently studying:\n${acronymContext}\n` : ''}
${historyContext ? `Previous conversation:\n${historyContext}\n` : ''}
Student's question: ${question}

Respond naturally as a helpful tutor. If the question is about a specific acronym from the list, reference it directly. If it's off-topic, gently redirect to the study material.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    res.json({ answer });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message || 'AI chat failed' });
  }
});

// ---- Chat Moderation Endpoint ----
app.post('/api/moderate-chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || messages.length === 0) {
      return res.json({ flagged: [] });
    }

    // Format messages for the AI
    const messageList = messages.map((m, i) => 
      `[${i}] ${m.fullName || m.username} (ID: ${m.id}): "${m.text}"`
    ).join('\n');

    const prompt = `You are a content moderator for a children's educational app. Review these chat messages and flag any that contain:
- Profanity or vulgar language
- Bullying, harassment, or mean behavior
- Inappropriate or sexual content
- Hate speech or discrimination
- Sharing of personal information (phone numbers, addresses)
- Spam or nonsensical repeated messages

Messages to review:
${messageList}

Respond ONLY with a valid JSON array of flagged messages. For each flagged message include:
- "index": the message index number from the list above
- "id": the message ID shown in parentheses
- "reason": a short explanation of why it was flagged (e.g. "Profanity", "Bullying language", "Inappropriate content")

If NO messages are inappropriate, return an empty array: []
Return ONLY the JSON array, no other text.`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let flagged;
    try {
      flagged = JSON.parse(responseText);
    } catch (parseErr) {
      // Try to extract JSON array
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      flagged = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    if (!Array.isArray(flagged)) flagged = [];

    // Enrich with original message data
    const enriched = flagged.map(f => {
      const original = messages[f.index] || messages.find(m => m.id === f.id);
      return {
        messageId: f.id || original?.id,
        text: original?.text || '',
        username: original?.username || '',
        fullName: original?.fullName || '',
        avatar: original?.avatar || '👤',
        reason: f.reason || 'Flagged by AI',
        timestamp: original?.timestamp || null
      };
    }).filter(f => f.messageId);

    console.log(`🛡️ Chat moderation: ${messages.length} messages scanned, ${enriched.length} flagged`);
    res.json({ flagged: enriched });
  } catch (err) {
    console.error('Chat moderation error:', err);
    res.status(500).json({ error: err.message || 'Moderation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Acronym Quest backend running on http://localhost:${PORT}`);
});
