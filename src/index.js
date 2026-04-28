/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ALLOWED_ORIGIN = env.LOCAL_URL || 'https://webchargedsolutions.com';

    // Handle CORS preflight for all routes
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Route to the correct handler based on path
    if (url.pathname === '/contact') {
      return handleContactForm(request, env, ALLOWED_ORIGIN);
    }

    if (url.pathname === '/get-support') {
      return handleGetSupportForm(request, env, ALLOWED_ORIGIN);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleContactForm(request, env, ALLOWED_ORIGIN) {

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, ALLOWED_ORIGIN);
  }

  const { name, email, contact_method, phone, contact_reason, message, policy_agreement, company_name } = body;

  // This field is the honeypot spam check
  if (company_name) {
    return jsonResponse({ success: true }, 200, ALLOWED_ORIGIN); // silent reject
  }

  // Basic validation
  if (!name || !email || !contact_method || (contact_method === 'phone' && !phone) || !contact_reason || !message || !policy_agreement) {
    return jsonResponse({ error: 'All fields are required.' }, 400, ALLOWED_ORIGIN);
  }

  if (typeof name !== 'string') {
    return jsonResponse({ error: 'Invalid format for the name field.' }, 400, ALLOWED_ORIGIN);
  }
  if (typeof email !== 'string') {
    return jsonResponse({ error: 'Invalid format for the email field.' }, 400, ALLOWED_ORIGIN);
  }
  if (typeof contact_method !== 'string') {
    return jsonResponse({ error: 'Invalid format for the contact method field.' }, 400, ALLOWED_ORIGIN);
  }
  if (contact_method === 'phone' && typeof phone !== 'string') {
    return jsonResponse({ error: 'Invalid format for the phone field.' }, 400, ALLOWED_ORIGIN);
  }
  if (typeof contact_reason !== 'string') {
    return jsonResponse({ error: 'Invalid format for the contact reason field.' }, 400, ALLOWED_ORIGIN);
  }
  if (typeof message !== 'string') {
    return jsonResponse({ error: 'Invalid format for the message field.' }, 400, ALLOWED_ORIGIN);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonResponse({ error: 'Invalid email address.' }, 400, ALLOWED_ORIGIN);
  }

  const contact_reason_options = {
    newwebsite: "A new website",
    redesign: "A website re-design",
    maintenance: "Website maintenance",
    general: "General question/email",
    other: "Other",
  }

  return sendBrevoEmail({
    apiKey: env.BREVO_API_KEY,
    to: env.TO_EMAIL,
    replyTo: { email: sanitize(email), name: sanitize(name) },
    subject: `New contact form message from ${sanitize(name)}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${sanitize(name)}</p>
      <p><strong>Email:</strong> ${sanitize(email)}</p>
      <p><strong>Preferred Contact Method:</strong> ${sanitize(contact_method || 'Not specified')}</p>
      <p><strong>Phone:</strong> ${sanitize(phone || 'Not provided')}</p>
      <p><strong>Reason for Contact:</strong> ${sanitize(contact_reason_options[contact_reason] || 'Not specified')}</p>
      <p><strong>Message:</strong></p>
      <p>${sanitize(message).replace(/\n/g, '<br>')}</p>
    `,
    ALLOWED_ORIGIN,
  });
}

async function handleGetSupportForm(request, env, ALLOWED_ORIGIN) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, ALLOWED_ORIGIN);
  }

  const { name, email, contact_method, phone, message, policy_agreement, company_name } = body;

  // This field is the honeypot spam check
  if (company_name) {
    return jsonResponse({ success: true }, 200, ALLOWED_ORIGIN); // silent reject
  }

  // Basic validation
  if (!name || !email || !contact_method || (contact_method === 'phone' && !phone) || !policy_agreement) {
    return jsonResponse({ error: 'All fields are required (except message).' }, 400, ALLOWED_ORIGIN);
  }

  if (typeof name !== 'string') {
    return jsonResponse({ error: 'Invalid format for the name field.' }, 400, ALLOWED_ORIGIN);
  }
  if (typeof email !== 'string') {
    return jsonResponse({ error: 'Invalid format for the email field.' }, 400, ALLOWED_ORIGIN);
  }
  if (typeof contact_method !== 'string') {
    return jsonResponse({ error: 'Invalid format for the contact method field.' }, 400, ALLOWED_ORIGIN);
  }
  if (contact_method === 'phone' && typeof phone !== 'string') {
    return jsonResponse({ error: 'Invalid format for the phone field.' }, 400, ALLOWED_ORIGIN);
  }
  if (typeof message !== 'string') {
    return jsonResponse({ error: 'Invalid format for the message field.' }, 400, ALLOWED_ORIGIN);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonResponse({ error: 'Invalid email address.' }, 400, ALLOWED_ORIGIN);
  }

  return sendBrevoEmail({
    apiKey: env.BREVO_API_KEY,
    to: env.TO_EMAIL,
    replyTo: { email: sanitize(email), name: sanitize(name) },
    subject: `New get support form message from ${sanitize(name)}`,
    html: `
      <h2>New Get Support Form Submission</h2>
      <p><strong>Name:</strong> ${sanitize(name)}</p>
      <p><strong>Email:</strong> ${sanitize(email)}</p>
      <p><strong>Preferred Contact Method:</strong> ${sanitize(contact_method || 'Not specified')}</p>
      <p><strong>Phone:</strong> ${sanitize(phone || 'Not provided')}</p>
      <p><strong>Message:</strong></p>
      <p>${sanitize(message || 'No message').replace(/\n/g, '<br>')}</p>
    `,
    ALLOWED_ORIGIN,
  });
}

async function sendBrevoEmail({ apiKey, to, replyTo, subject, html, ALLOWED_ORIGIN }) {
  const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Contact Form', email: 'noreply@webchargedsolutions.com' },
      to: [{ email: to }],
      replyTo,
      subject,
      htmlContent: html,
    }),
  });

  if (!brevoRes.ok) {
    const errBody = await brevoRes.text();
    console.error('Brevo error:', brevoRes.status, errBody);
    return jsonResponse({ error: 'Failed to send. Please try again.' }, 500, ALLOWED_ORIGIN);
  }

  return jsonResponse({ success: true }, 200, ALLOWED_ORIGIN);
}

function jsonResponse(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
    },
  });
}

function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
