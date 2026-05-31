/**
 * LEO Gemini Proxy — Cloudflare Worker
 * Deploy this worker and bind GEMINI_API_KEY
 */

const ALLOWED_ORIGIN = "https://dineshthalapathy01.github.io";

const BLOCKED_REPLY =
  "I can only answer questions related to S Dinesh Kumar's portfolio, projects, skills, experience, and professional background.";

const MISSING_INFO_REPLY =
  "That information is not available in S Dinesh Kumar's portfolio. You can ask about his projects, skills, experience, education, technologies, company history, or contact details.";

const SYSTEM_PROMPT = `
You are LEO, the portfolio assistant for S Dinesh Kumar.

Rules:

- Answer ONLY from the provided Context.
- Never invent information.
- Never use outside knowledge.
- Never answer general questions.
- Never answer math, coding, politics, sports, movies, religion, weather, news, or unrelated topics.
- If information is not available in Context, reply exactly:

That information is not available in S Dinesh Kumar's portfolio.

- Keep answers professional.
- Use plain text only.
- No markdown.
- No emojis.
- No code blocks.

Response Length:

- Greetings: 20-50 words
- Skills, company, education: 50-150 words
- Projects and experience: 100-250 words
- Never exceed 300 words
`;

const NON_PORTFOLIO_PATTERN =
  /\b(weather|movie|movies|sports|cricket|football|news|politics|religion|math|1\+1|algebra|geometry|calculus|coding|programming|algorithm|leetcode|chatgpt|openai|gemini|gpt|jailbreak|developer mode|prompt injection|ignore previous|forget previous)\b/i;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(ALLOWED_ORIGIN),
      });
    }

    if (request.method !== "POST") {
      return json(
        { error: "Method not allowed" },
        405,
        corsHeaders(ALLOWED_ORIGIN)
      );
    }

    const origin = request.headers.get("origin");

    if (origin !== ALLOWED_ORIGIN) {
      return json(
        { error: "Unauthorized origin" },
        403,
        corsHeaders(ALLOWED_ORIGIN)
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        { error: "Invalid JSON" },
        400,
        corsHeaders(ALLOWED_ORIGIN)
      );
    }

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const providedContext =
      typeof body.context === "string"
        ? body.context.trim()
        : "";

    const queryType =
      typeof body.query_type === "string"
        ? body.query_type.trim()
        : "general";

    if (!message) {
      return json(
        { error: "No message provided" },
        400,
        corsHeaders(ALLOWED_ORIGIN)
      );
    }

    if (NON_PORTFOLIO_PATTERN.test(message)) {
      return json(
        { reply: BLOCKED_REPLY },
        200,
        corsHeaders(ALLOWED_ORIGIN)
      );
    }

    const effectivePrompt = `
${SYSTEM_PROMPT}

Query Type:
${queryType}

Portfolio Context:
${providedContext}

Important:
Answer ONLY using the Portfolio Context.
If the answer is not found inside Portfolio Context reply exactly:

${MISSING_INFO_REPLY}
`;

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: effectivePrompt,
                },
              ],
            },

            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: message,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.2,
              topP: 0.9,
              maxOutputTokens: 250,
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();

        return json(
          {
            error: "Gemini request failed",
            detail: errorText,
          },
          502,
          corsHeaders(ALLOWED_ORIGIN)
        );
      }

      const data = await geminiResponse.json();

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        MISSING_INFO_REPLY;

      return json(
        {
          reply: sanitizeReply(reply),
        },
        200,
        corsHeaders(ALLOWED_ORIGIN)
      );
    } catch (err) {
      return json(
        {
          error: "Worker Error",
          detail: err.toString(),
        },
        500,
        corsHeaders(ALLOWED_ORIGIN)
      );
    }
  },
};

function sanitizeReply(text) {
  if (!text) return MISSING_INFO_REPLY;

  let cleaned = text.trim();

  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`/g, "");

  if (
    /\b(chatgpt|openai|gemini|google ai|developer mode|jailbreak|prompt injection)\b/i.test(
      cleaned
    )
  ) {
    return BLOCKED_REPLY;
  }

  return cleaned;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}