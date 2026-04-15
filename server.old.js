require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();

const CLIENT_ID = '1493836596213186712';
const CLIENT_SECRET = 'uFxB6Dtmh2V2Y1OMswEk3WpKECWoD8eR';
const REDIRECT_URI = 'http://localhost:3000/callback';
const GUILD_ID = '1493815257750048900';

const BOT_TOKEN = process.env.BOT_TOKEN;
const UNVERIFIED_ROLE_ID = '1493852376187273317';
const VERIFIED_ROLE_ID = '1493852551211389061';

app.get('/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Missing OAuth code.');
  }

  try {
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const access_token = tokenResponse.data.access_token;

    const userResponse = await axios.get(
      'https://discord.com/api/users/@me',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const userId = userResponse.data.id;

    // Add user to guild if not already in it
    await axios.put(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`,
      { access_token },
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Remove Unverified role
    await axios.delete(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}/roles/${UNVERIFIED_ROLE_ID}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    ).catch(() => null);

    // Add Verified role
    await axios.put(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}/roles/${VERIFIED_ROLE_ID}`,
      {},
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aether Verification</title>
  <style>
    :root {
      --bg: #0b0f14;
      --panel: #11161d;
      --border: #1c2630;
      --text: #e8edf2;
      --muted: #98a3ad;
      --accent: #d4a84f;
      --accent-soft: rgba(212, 168, 79, 0.12);
      --success: #4fa36d;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top, rgba(212, 168, 79, 0.08), transparent 35%),
        linear-gradient(180deg, #0a0e13 0%, #0b0f14 100%);
      color: var(--text);
      font-family: Inter, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      width: 100%;
      max-width: 560px;
      background: rgba(17, 22, 29, 0.96);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 36px 32px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      text-align: center;
      backdrop-filter: blur(10px);
    }

    .mark {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, rgba(212,168,79,0.14), rgba(212,168,79,0.05));
      border: 1px solid rgba(212, 168, 79, 0.22);
      color: var(--accent);
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .status {
      display: inline-block;
      margin-bottom: 14px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(79, 163, 109, 0.12);
      border: 1px solid rgba(79, 163, 109, 0.24);
      color: #87d4a0;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1.1;
      font-weight: 700;
    }

    p {
      margin: 0 auto;
      max-width: 440px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.6;
    }

    .actions {
      margin-top: 28px;
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      appearance: none;
      border: 0;
      border-radius: 12px;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
    }

    .btn:hover {
      transform: translateY(-1px);
    }

    .btn-primary {
      background: linear-gradient(180deg, #d4a84f, #b78e40);
      color: #11161d;
    }

    .btn-secondary {
      background: #161d25;
      color: var(--text);
      border: 1px solid var(--border);
    }

    .note {
      margin-top: 18px;
      font-size: 13px;
      color: #7f8993;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="mark">A</div>
    <div class="status">Verification Complete</div>
    <h1>Access Updated</h1>
    <p>Your Discord account has been authenticated successfully. You may now return to the server and continue.</p>

    <div class="actions">
      <a class="btn btn-primary" href="discord://-/channels/@me">Return to Discord</a>
      <button class="btn btn-secondary" onclick="window.close()">Close Window</button>
    </div>

    <div class="note">You can close this page at any time.</div>
  </div>
</body>
</html>
`);

    res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aether Verification</title>
  <style>
    :root {
      --bg: #0b0f14;
      --panel: #11161d;
      --border: #1c2630;
      --text: #e8edf2;
      --muted: #98a3ad;
      --danger: #dc6f6f;
      --danger-soft: rgba(220, 111, 111, 0.12);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top, rgba(220, 111, 111, 0.08), transparent 35%),
        linear-gradient(180deg, #0a0e13 0%, #0b0f14 100%);
      color: var(--text);
      font-family: Inter, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      width: 100%;
      max-width: 560px;
      background: rgba(17, 22, 29, 0.96);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 36px 32px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      text-align: center;
    }

    .mark {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--danger-soft);
      border: 1px solid rgba(220, 111, 111, 0.24);
      color: var(--danger);
      font-size: 36px;
      font-weight: 700;
    }

    .status {
      display: inline-block;
      margin-bottom: 14px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--danger-soft);
      border: 1px solid rgba(220, 111, 111, 0.24);
      color: #f2a2a2;
      font-size: 13px;
      font-weight: 600;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1.1;
      font-weight: 700;
    }

    p {
      margin: 0 auto;
      max-width: 440px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.6;
    }

    .actions {
      margin-top: 28px;
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      appearance: none;
      border: 0;
      border-radius: 12px;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }

    .btn-secondary {
      background: #161d25;
      color: var(--text);
      border: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="mark">×</div>
    <div class="status">Verification Failed</div>
    <h1>Request Could Not Be Completed</h1>
    <p>The authentication finished, but your access could not be updated. Please return to the server and contact staff if this continues.</p>

    <div class="actions">
      <a class="btn btn-secondary" href="discord://-/channels/@me">Return to Discord</a>
    </div>
  </div>
</body>
</html>
`);