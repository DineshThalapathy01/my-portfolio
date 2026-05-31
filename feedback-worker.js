export default {
  async fetch(request, env, ctx) {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(JSON.stringify({ success: true, message: 'CORS preflight ok' }), {
        status: 204,
        headers,
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/feedback' || request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers,
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers,
      });
    }

    const { name, email, subject, message } = payload;
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers,
      });
    }

    console.info('Feedback received', {
      name,
      email,
      subject,
      message,
    });

    // Optional: persist feedback to KV or send an email if you bind a storage/external service.
    // if (env.FEEDBACK_KV) {
    //   await env.FEEDBACK_KV.put(`feedback:${Date.now()}`, JSON.stringify(payload));
    // }

    return new Response(JSON.stringify({ success: true, message: 'Feedback submitted successfully.' }), {
      status: 200,
      headers,
    });
  },
};
