/**
 * LEO Gemini Proxy — Cloudflare Worker
 * Deploy this worker and bind GEMINI_API_KEY to your Gemini API key.
 * The worker validates requests, guards portfolio-only responses, and prevents prompt injection.
 */

const ALLOWED_ORIGIN = 'https://dineshthalapathy01.github.io';
const BLOCKED_REPLY = "I can only answer questions related to S Dinesh Kumar's portfolio, projects, skills, experience, and professional background.";
const MISSING_INFO_REPLY = "That information is not available in S Dinesh Kumar's portfolio. You can ask about his projects, skills, experience, education, technologies, company history, or contact details.";

const SYSTEM_PROMPT = `You are LEO, the portfolio assistant for S Dinesh Kumar.

Rules:

* Answer only from the provided Context.

* Never invent information.

* Never use outside knowledge.

* If information is missing from Context, reply exactly:
  'That information is not available in S Dinesh Kumar's portfolio.'

* Keep answers natural and conversational.

* Summarize information instead of repeating it.

* Focus on the most relevant details.

* Do not list unnecessary information.

* Avoid repeating technologies multiple times.

* Use plain text only.

* No markdown.

* No emojis.

* No code blocks.

Response Length:

* Greeting questions: 20-50 words.
* Skills, education, company, contact questions: 50-150 words.
* Project and experience questions: 100-250 words.
* Never exceed 300 words.`;

const NON_PORTFOLIO_PATTERN = /\b(?:weather|movie|movies|politics|religion|cricket|news|sports|score|scores|math|mathematics|algebra|geometry|calculus|1\+1|solve|code|program|programming|algorithm|algorithms|data structure|dsa|interview|leetcode|hackerrank|general knowledge|gk|chatgpt|gemini|openai|gpt|jailbreak|developer mode|forget previous|ignore previous|ignore instructions|prompt injection|dan)\b/i;
const NON_PORTFOLIO_QUERIES = /\b(?:who are you|act as|developer mode|system prompt|chatgpt|gemini|openai|d a n|dan|jailbreak|prompt injection|ignore previous|forget instructions)\b/i;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(ALLOWED_ORIGIN) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const origin = request.headers.get('origin');
    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: 'Unauthorized origin' }, 403, corsHeaders(ALLOWED_ORIGIN));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, corsHeaders(ALLOWED_ORIGIN));
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const providedContext = typeof body.context === 'string' ? body.context.trim() : '';
    const queryType = typeof body.query_type === 'string' && body.query_type.trim() ? body.query_type.trim() : 'general';
    if (!message) {
      return json({ error: 'No message provided' }, 400, corsHeaders(ALLOWED_ORIGIN));
    }

    if (NON_PORTFOLIO_PATTERN.test(message) || NON_PORTFOLIO_QUERIES.test(message)) {
      return json({ reply: BLOCKED_REPLY }, 200, corsHeaders(ALLOWED_ORIGIN));
    }

    // If the client provided matched KB context, include it in the system instructions
    const effectiveSystemPrompt = providedContext
      ? SYSTEM_PROMPT + `\n\nContext (from portfolio KB):\n${providedContext}\n\nQueryType: ${queryType}.\nInstruction: Answer ONLY using the information in the Context above. If the information required to answer is not contained in the Context, reply exactly: "${MISSING_INFO_REPLY}"` 
      : SYSTEM_PROMPT + `\n\nQueryType: ${queryType}.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'system', parts: [{ text: effectiveSystemPrompt }] },
            { role: 'user', parts: [{ text: message }] }
          ],
          generationConfig: {
            maxOutputTokens: 220,
            temperature: 0.2,
            topP: 0.95,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return json({ error: 'Gemini request failed', detail: errorText }, 502, corsHeaders(ALLOWED_ORIGIN));
    }

    const jsonData = await geminiRes.json();
    const reply = extractReply(jsonData);
    const safeReply = sanitizeReply(reply);
    if (!safeReply) {
      return json({ reply: MISSING_INFO_REPLY }, 200, corsHeaders(ALLOWED_ORIGIN));
    }
    return json({ reply: safeReply }, 200, corsHeaders(ALLOWED_ORIGIN));
  },
};

function extractReply(data) {
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof raw === 'string' ? raw : '';
}

function sanitizeReply(reply) {
  let text = reply.trim();
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/^[\s\n]+|[\s\n]+$/g, '');
  if (/\b(?:chatgpt|gemini|openai|google|system prompt|developer mode|jailbreak|dan|prompt injection)\b/i.test(text)) {
    return '';
  }
  if (/\b(?:weather|movie|movies|politics|religion|cricket|news|sports|score|scores|math|mathematics|algebra|geometry|calculus|1\+1|solve|code|program|programming|algorithm|algorithms|data structure|dsa|interview|leetcode|hackerrank|general knowledge|gk)\b/i.test(text)) {
    return '';
  }
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n\s*\n/g, '\n\n');
  return text;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
