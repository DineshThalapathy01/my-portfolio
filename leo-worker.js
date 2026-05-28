/**
 * LEO Proxy — Cloudflare Worker
 * Deploy this at: https://workers.cloudflare.com
 * Set env variable: GEMINI_API_KEY = your Google Gemini API key
 * 
 * Your portfolio calls this worker URL. The Gemini key NEVER goes in your public repo.
 */

const ALLOWED_ORIGIN = 'https://dineshthalapathy01.github.io'; // your GitHub Pages domain

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(ALLOWED_ORIGIN) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const { system, message } = body;
    if (!message) return json({ error: 'No message' }, 400);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${system}\n\nUser: ${message}` }] }
          ],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return json({ error: err }, 502);
    }

    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return json({ reply }, 200, corsHeaders(ALLOWED_ORIGIN));
  },
};

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
