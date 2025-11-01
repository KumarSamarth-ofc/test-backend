/*
  Direct socket debug runner
  - Fetches a dev JWT for senderId
  - Connects to Socket.IO, authenticates, joins room:<conversationId>
  - Sends a text message and logs chat:ack and chat:new

  Usage (defaults provided via env):
    CONVERSATION_ID=... SENDER_ID=... BASE_URL=http://localhost:3000 MESSAGE="hello" node scripts/direct-socket-debug.js

  Requires: socket.io-client (install if missing: npm i socket.io-client)
*/

const { io } = require('socket.io-client');
let jwt;
try { jwt = require('jsonwebtoken'); } catch (_) {}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONVERSATION_ID = process.env.CONVERSATION_ID || '';
const SENDER_ID = process.env.SENDER_ID || '';
const MESSAGE = process.env.MESSAGE || 'hello from direct-socket-debug';

if (!CONVERSATION_ID || !SENDER_ID) {
  console.error('Missing CONVERSATION_ID or SENDER_ID env.');
  process.exit(1);
}

async function getToken(baseUrl, userId) {
  // Priority 1: explicit TOKEN env
  if (process.env.TOKEN) {
    return process.env.TOKEN;
  }

  // Priority 2: generate locally if allowed and secret available
  if ((process.env.GEN_TOKEN || 'false').toLowerCase() === 'true' && jwt && process.env.JWT_SECRET) {
    const payload = {
      id: userId,
      phone: process.env.DEBUG_PHONE || '+910000000000',
      role: process.env.DEBUG_ROLE || 'brand_owner'
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  }

  // Fallback: call debug token endpoint
  const url = `${baseUrl}/api/debug/token/${userId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (!json.success || !json.token) throw new Error('No token in response');
  return json.token;
}

function waitForEvent(socket, event, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  console.log(`BASE_URL=${BASE_URL}`);
  console.log(`CONVERSATION_ID=${CONVERSATION_ID}`);
  console.log(`SENDER_ID=${SENDER_ID}`);

  const token = await getToken(BASE_URL, SENDER_ID);
  console.log('Obtained JWT. Length:', token.length);

  const socket = io(BASE_URL, {
    transports: ['websocket', 'polling'],
    reconnection: false,
    timeout: 10000,
  });

  socket.on('connect_error', (err) => {
    console.error('connect_error:', err.message);
  });
  socket.on('error', (err) => {
    console.error('socket error:', err);
  });
  socket.on('chat:error', (err) => {
    console.error('chat:error:', err);
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timeout connecting')), 10000);
    socket.once('connect', () => { clearTimeout(t); resolve(); });
  });
  console.log('Socket connected:', socket.id);

  socket.emit('authenticate', { token });
  await waitForEvent(socket, 'authenticated');
  console.log('Authenticated');

  socket.emit('chat:join', { conversationId: CONVERSATION_ID });
  await waitForEvent(socket, 'chat:joined');
  console.log('Joined room');

  const tempId = `temp_${Date.now()}`;
  socket.emit('chat:send', {
    tempId,
    conversationId: CONVERSATION_ID,
    text: MESSAGE,
  });
  console.log('chat:send emitted with tempId:', tempId);

  const ack = await waitForEvent(socket, 'chat:ack');
  console.log('chat:ack received:', { tempId: ack.tempId, id: ack.message?.id });

  // Either we’ll see our own chat:new (multi-socket) or only ack; wait briefly
  try {
    const incoming = await waitForEvent(socket, 'chat:new', 3000);
    console.log('chat:new received:', { id: incoming.message?.id });
  } catch (_) {
    console.log('No chat:new within 3s (ok if single-socket).');
  }

  socket.disconnect();
  console.log('Done');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});


