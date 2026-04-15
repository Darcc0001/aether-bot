require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const axios = require('axios');

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

const config = {
  port: Number(process.env.PORT || 3000),
  publicBaseUrl: trimTrailingSlash(requireEnv('PUBLIC_BASE_URL')),
  redirectUri: requireEnv('OAUTH_REDIRECT_URI'),
  clientId: requireEnv('DISCORD_CLIENT_ID'),
  clientSecret: requireEnv('DISCORD_CLIENT_SECRET'),
  botToken: requireEnv('BOT_TOKEN'),
  guildId: requireEnv('DISCORD_GUILD_ID'),
  unverifiedRoleId: requireEnv('UNVERIFIED_ROLE_ID'),
  verifiedRoleId: requireEnv('VERIFIED_ROLE_ID'),
  stateSecret: requireEnv('OAUTH_STATE_SECRET'),
  brandLogoUrl: process.env.BRAND_LOGO_URL || '',
};

const STATE_TTL_MS = 10 * 60 * 1000;
const DISCORD_API_BASE = 'https://discord.com/api/v10';

const app = express();

function createState() {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', config.stateSecret)
    .update(timestamp)
    .digest('hex');

  return `${timestamp}.${signature}`;
}

function isValidState(state) {
  if (!state || typeof state !== 'string') {
    return false;
  }

  const [timestamp, providedSignature] = state.split('.');

  if (!timestamp || !providedSignature) {
    return false;
  }

  const issuedAt = Number(timestamp);

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > STATE_TTL_MS) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.stateSecret)
    .update(timestamp)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (_error) {
    return false;
  }
}

function getAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: 'identify guilds.join',
    prompt: 'consent',
    state: createState(),
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function getLoginAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPage(options) {
  const title = escapeHtml(options.title);
  const badge = escapeHtml(options.badge);
  const heading = escapeHtml(options.heading);
  const message = escapeHtml(options.message);
  const tone = options.tone === 'success' ? 'success' : 'error';
  const buttonLabel = escapeHtml(options.buttonLabel || 'Return to Discord');
  const buttonHref = escapeHtml(options.buttonHref || 'discord://-/channels/@me');
  const supportLine = options.supportLine
    ? `<p class="note">${escapeHtml(options.supportLine)}</p>`
    : '';
  const brandMarkup = config.brandLogoUrl
    ? [
        '<div class="brand brand-image-wrap">',
        `  <img class="brand-image" src="${escapeHtml(config.brandLogoUrl)}" alt="Aether logo" />`,
        '</div>',
      ].join('\n')
    : '<div class="brand brand-letter">A</div>';

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `  <title>${title}</title>`,
    '  <style>',
    '    :root {',
    '      color-scheme: dark;',
    '      --bg: #050403;',
    '      --panel: rgba(14, 12, 10, 0.94);',
    '      --border: rgba(206, 159, 76, 0.18);',
    '      --text: #f5efe4;',
    '      --muted: #b8ab97;',
    '      --gold: #d5a449;',
    '      --gold-bright: #f0cf8b;',
    '      --green: #8fd0a7;',
    '      --red: #eca3a3;',
    '      --green-soft: rgba(103, 158, 122, 0.18);',
    '      --red-soft: rgba(180, 82, 82, 0.16);',
    '    }',
    '    * { box-sizing: border-box; }',
    '    body {',
    '      margin: 0;',
    '      min-height: 100vh;',
    '      padding: 24px;',
    '      display: grid;',
    '      place-items: center;',
    '      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;',
    '      color: var(--text);',
    '      background:',
    tone === 'success'
      ? '        radial-gradient(circle at top, rgba(143, 208, 167, 0.08), transparent 32%),'
      : '        radial-gradient(circle at top, rgba(236, 163, 163, 0.09), transparent 32%),',
    '        radial-gradient(circle at 50% 100%, rgba(213, 164, 73, 0.11), transparent 34%),',
    '        linear-gradient(180deg, #020202 0%, #050403 100%);',
    '    }',
    '    .shell {',
    '      width: min(100%, 620px);',
      '      position: relative;',
      '      border-radius: 28px;',
      '      padding: 1px;',
    '      background: linear-gradient(180deg, rgba(213, 164, 73, 0.38), rgba(255,255,255,0.04));',
      '      box-shadow: 0 28px 90px rgba(0, 0, 0, 0.45);',
    '    }',
    '    .card {',
      '      border-radius: 27px;',
      '      padding: 40px 32px;',
      '      background: var(--panel);',
      '      border: 1px solid var(--border);',
      '      backdrop-filter: blur(14px);',
      '      text-align: center;',
    '    }',
    '    .brand {',
    '      width: 88px;',
    '      height: 88px;',
      '      margin: 0 auto 18px;',
      '      border-radius: 24px;',
      '      display: grid;',
      '      place-items: center;',
      '      border: 1px solid rgba(213, 164, 73, 0.28);',
      '      background: linear-gradient(180deg, rgba(213, 164, 73, 0.16), rgba(213, 164, 73, 0.05));',
      '      color: var(--gold);',
      '      font-size: 30px;',
      '      font-weight: 700;',
      '      letter-spacing: 0.08em;',
    '      box-shadow: inset 0 1px 0 rgba(240, 207, 139, 0.08);',
    '    }',
    '    .brand-letter {',
    '      color: var(--gold-bright);',
    '    }',
    '    .brand-image-wrap {',
    '      overflow: hidden;',
    '      padding: 10px;',
    '    }',
    '    .brand-image {',
    '      display: block;',
    '      width: 100%;',
    '      height: 100%;',
    '      object-fit: contain;',
    '      filter: drop-shadow(0 0 12px rgba(213, 164, 73, 0.14));',
    '    }',
    '    .badge {',
    '      display: inline-flex;',
    '      align-items: center;',
    '      justify-content: center;',
    '      margin-bottom: 14px;',
    '      padding: 8px 14px;',
    '      border-radius: 999px;',
    tone === 'success'
      ? '      background: var(--green-soft);'
      : '      background: var(--red-soft);',
    tone === 'success'
      ? '      border: 1px solid rgba(120, 192, 143, 0.22);'
      : '      border: 1px solid rgba(229, 136, 136, 0.22);',
    '      font-size: 13px;',
    '      font-weight: 600;',
    '      letter-spacing: 0.04em;',
    tone === 'success' ? '      color: var(--green);' : '      color: var(--red);',
    '    }',
    '    h1 {',
    '      margin: 0 0 12px;',
    '      font-size: clamp(30px, 5vw, 40px);',
    '      line-height: 1.04;',
    '      font-weight: 700;',
    '    }',
    '    p {',
    '      margin: 0 auto;',
    '      max-width: 470px;',
    '      color: var(--muted);',
    '      font-size: 16px;',
    '      line-height: 1.65;',
    '    }',
    '    .actions {',
    '      margin-top: 28px;',
    '      display: flex;',
    '      justify-content: center;',
    '      gap: 12px;',
    '      flex-wrap: wrap;',
    '    }',
    '    .button {',
    '      display: inline-flex;',
    '      align-items: center;',
    '      justify-content: center;',
    '      min-width: 188px;',
    '      padding: 13px 18px;',
    '      border-radius: 14px;',
    '      text-decoration: none;',
    '      border: 1px solid rgba(240, 207, 139, 0.18);',
    '      background: linear-gradient(180deg, #e0b45e, #c9963d);',
    '      color: #120f0a;',
      '      font-size: 14px;',
      '      font-weight: 700;',
      '      transition: transform 0.15s ease, filter 0.15s ease;',
    '    }',
    '    .button:hover {',
    '      transform: translateY(-1px);',
    '      filter: brightness(1.04);',
    '    }',
    '    .note {',
    '      margin-top: 18px;',
    '      font-size: 13px;',
    '      color: #8691a0;',
    '    }',
    '    @media (max-width: 540px) {',
    '      .card { padding: 32px 22px; }',
    '      .button { width: 100%; }',
    '    }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main class="shell">',
    '    <section class="card">',
    `      ${brandMarkup}`,
    `      <div class="badge">${badge}</div>`,
    `      <h1>${heading}</h1>`,
    `      <p>${message}</p>`,
    '      <div class="actions">',
    `        <a class="button" href="${buttonHref}">${buttonLabel}</a>`,
    '      </div>',
    `      ${supportLine}`,
    '    </section>',
    '  </main>',
    '</body>',
    '</html>',
  ].join('\n');
}

function renderSuccessPage() {
  return renderPage({
    title: 'Aether Verification',
    badge: 'Verification Complete',
    heading: 'Access updated successfully',
    message:
      'Your Discord account has been authorized and your server access has been updated. You can return to Discord now.',
    tone: 'success',
    supportLine: 'If the server does not refresh immediately, reopen Discord once.',
  });
}

function renderErrorPage(message) {
  return renderPage({
    title: 'Aether Verification',
    badge: 'Verification Failed',
    heading: 'Verification could not be completed',
    message,
    tone: 'error',
    supportLine:
      'If this continues, confirm the bot role is above both verification roles and try again.',
  });
}

function logDiscordError(prefix, error) {
  if (error.response) {
    console.error(prefix, {
      status: error.response.status,
      data: error.response.data,
    });
    return;
  }

  console.error(prefix, error);
}

async function exchangeCodeForToken(code) {
  const payload = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await axios.post(
    `${DISCORD_API_BASE}/oauth2/token`,
    payload.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
}

async function getDiscordUser(accessToken) {
  const response = await axios.get(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

async function addUserToGuild(userId, accessToken) {
  await axios.put(
    `${DISCORD_API_BASE}/guilds/${config.guildId}/members/${userId}`,
    { access_token: accessToken },
    {
      headers: {
        Authorization: `Bot ${config.botToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

async function removeRole(userId, roleId) {
  try {
    await axios.delete(
      `${DISCORD_API_BASE}/guilds/${config.guildId}/members/${userId}/roles/${roleId}`,
      {
        headers: {
          Authorization: `Bot ${config.botToken}`,
        },
      }
    );
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return;
    }

    throw error;
  }
}

async function addRole(userId, roleId) {
  await axios.put(
    `${DISCORD_API_BASE}/guilds/${config.guildId}/members/${userId}/roles/${roleId}`,
    null,
    {
      headers: {
        Authorization: `Bot ${config.botToken}`,
      },
    }
  );
}

app.get('/', (_req, res) => {
  res.type('text/plain').send('Aether verification service is running.');
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/verify', (_req, res) => {
  res.redirect(getAuthorizeUrl());
});

app.get('/login', (_req, res) => {
  res.redirect(getLoginAuthorizeUrl());
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const oauthError = req.query.error;

  if (oauthError) {
    return res
      .status(400)
      .send(
        renderErrorPage(
          'Discord authorization was declined or cancelled before verification could finish.'
        )
      );
  }

  if (!code) {
    return res
      .status(400)
      .send('No code provided');
  }

  try {
    const tokenData = await exchangeCodeForToken(code);

    if (!state) {
      return res.send(`OAuth success: ${JSON.stringify(tokenData)}`);
    }

    if (!isValidState(state)) {
      return res
        .status(400)
        .send(renderErrorPage('The verification session expired. Start again from the Verify button.'));
    }

    const user = await getDiscordUser(tokenData.access_token);

    await addUserToGuild(user.id, tokenData.access_token);
    await removeRole(user.id, config.unverifiedRoleId);
    await addRole(user.id, config.verifiedRoleId);

    console.log(`Verified Discord user ${user.username} (${user.id})`);
    return res.status(200).send(renderSuccessPage());
  } catch (error) {
    logDiscordError('Verification callback failed:', error);

    if (!state) {
      return res.send('OAuth failed');
    }

    return res
      .status(500)
      .send(
        renderErrorPage(
          'The account was authorized, but the server roles could not be updated. Please try again in a moment.'
        )
      );
  }
});

app.listen(config.port, () => {
  console.log(`OAuth server listening on port ${config.port}`);
  console.log(`Verification URL: ${config.publicBaseUrl}/verify`);
});
