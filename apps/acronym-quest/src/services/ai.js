import { GoogleGenAI } from '@google/genai';

const API_KEY = "AIzaSyDcWaopzUiC2mwycP1EmEjxDdCuar7gdak";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function askAI(acronym, breakdown, meaning, question) {
  const prompt = `You are an AI tutor for a children's educational app about acronyms.
The student is studying this acronym:
- Acronym: ${acronym}
- Breakdown: ${breakdown}
- Meaning: ${meaning}

The student asks: "${question}"

Give a short, friendly, age-appropriate answer (2-3 sentences max). Use simple language.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt
  });
  return response.text;
}

export async function analyzeResults(results) {
  const prompt = `You are an educational analytics assistant. Analyze these quiz results and give a brief summary with key insights and recommendations.

Results data:
${JSON.stringify(results, null, 2)}

Provide:
1. Overall performance summary
2. Comparison between study groups (Manual vs Gamified)
3. Key recommendations for improvement
Keep it concise and actionable.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt
  });
  return response.text;
}

export async function moderateChat(messages) {
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
- "reason": a short explanation of why it was flagged

If NO messages are inappropriate, return an empty array: []
Return ONLY the JSON array, no other text.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  let flagged;
  try {
    flagged = JSON.parse(response.text);
  } catch {
    const jsonMatch = response.text.match(/\[[\s\S]*\]/);
    flagged = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  }

  if (!Array.isArray(flagged)) flagged = [];

  // Enrich with original message data
  return flagged.map(f => {
    const original = messages[f.index];
    return {
      messageId: original?.id,
      text: original?.text || '',
      username: original?.username || '',
      fullName: original?.fullName || '',
      avatar: original?.avatar || '👤',
      reason: f.reason || 'Flagged by AI',
      timestamp: original?.timestamp || null
    };
  }).filter(f => f.messageId);
}

export async function parsePdfWithAI(fileArrayBuffer) {
  // Convert to base64 for Gemini
  const base64 = btoa(
    new Uint8Array(fileArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const prompt = `Extract all acronyms from this PDF document. For each acronym, provide:
- acronym: the abbreviation
- breakdown: what each letter stands for
- meaning: a brief explanation of what it means

Return ONLY a valid JSON array like:
[{"acronym": "CPU", "breakdown": "Central Processing Unit", "meaning": "The main processor in a computer"}]

If no acronyms found, return an empty array: []`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64
        }
      }
    ],
    config: { responseMimeType: 'application/json' }
  });

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    const jsonMatch = response.text.match(/\[[\s\S]*\]/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  }

  return Array.isArray(parsed) ? parsed : [];
}
