// ═══════════════════════════════════════════════════════════
//  KRISHI AI ENGINE  ·  Powered by Google Gemini 2.0 Flash
//  MittiSeva · Agriculture Assistant for AP & Telangana
// ═══════════════════════════════════════════════════════════

// ── Gemini API Configuration ──
const GEMINI_API_KEY = ''; // Key is stored securely on the backend server — never expose here
const useBackendProxy = true; // Always proxy via backend to prevent leaking API keys on the frontend

// Primary + fallback models (fallback has separate, higher quota)
const GEMINI_PRIMARY  = 'gemini-2.0-flash';
const GEMINI_FALLBACK = 'gemini-2.0-flash-lite'; // 30 RPM free tier, separate quota

function geminiUrl(model) {
  if (useBackendProxy) {
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : '';
    return `${host}/api/chat/stream?model=${model}`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
}

// ── Rate-limit state ──
let rateLimitedUntil = 0;   // epoch ms when we can retry
let lastRequestTime  = 0;   // for debounce
const MIN_GAP_MS     = 1500; // minimum ms between sends

// ── In-memory conversation history (multi-turn) ──
const chatHistory = { mobile: [], full: [] };

// ── System Prompt ──
function buildSystemPrompt() {
  const profile    = window.currentProfile;
  const history    = window.HISTORY || [];
  const soilValues = window.soilValues || {};

  const farmerName    = profile?.full_name || 'Farmer';
  const farmerVillage = profile?.village   || 'your village';
  const lastTest      = history.length > 0 ? history[history.length - 1] : null;

  const soilContext = lastTest
    ? `\nFarmer's Latest Soil Test:\n- pH: ${lastTest.ph}\n- N: ${lastTest.n} kg/ha  P: ${lastTest.p} kg/ha  K: ${lastTest.k} kg/ha\n- Health Score: ${lastTest.score}/100  (${lastTest.date})\n`
    : soilValues.ph
    ? `\nCurrent Input Values (not saved yet):\n- pH: ${soilValues.ph}, N: ${soilValues.n}, P: ${soilValues.p}, K: ${soilValues.k}, Moisture: ${soilValues.moisture}%, OC: ${soilValues.oc}%\n`
    : '\nNo soil test data yet for this farmer.\n';

  const histContext = history.length > 1
    ? `\nHistory (${history.length} tests):\n` + history.map(h => `  • ${h.date}: pH ${h.ph}, Score ${h.score}/100`).join('\n') + '\n'
    : '';

  return `You are Krishi AI, a friendly expert agricultural assistant inside MittiSeva — a free soil health app for farmers in Andhra Pradesh and Telangana, India.

Helping: ${farmerName} from ${farmerVillage}.
${soilContext}${histContext}
Personality:
- Warm, respectful, village-level language — like a knowledgeable friend
- Respond in Telugu if the farmer writes in Telugu; English otherwise
- Always use the farmer's actual soil numbers when relevant
- Never give generic copy-paste answers

Expertise:
- Soil Science: pH, NPK, organic carbon, micronutrients, texture
- Crops for AP & Telangana: Paddy, Cotton, Groundnut, Maize, Chilli, Redgram, Bengalgram, Sunflower, Turmeric, Sugarcane
- Fertilizers: Urea, DAP, MOP, SSP, NPK complexes, biofertilizers (Azospirillum, PSB, Trichoderma)
- Schemes: PM-KISAN, Rythu Bandhu, RBK, Soil Health Card, RKVY
- Irrigation: drip, sprinkler, flood, rain-fed
- Pest & Disease: IPM, organic solutions, safe chemicals, Zero Budget Farming
- Seasons: Kharif (Jun–Oct), Rabi (Oct–Mar), Zaid/Summer
- Markets: MSP, mandal markets, e-NAM

Rules:
1. 3–5 lines for simple questions; bullet points for complex advice
2. End every reply with one actionable step or encouragement
3. Use emojis sparingly: 🌾 🌿 💧 🧪 🌱 👨‍🌾
4. Use actual soil numbers from data above, not made-up values
5. Say "I'll need to verify" for government scheme amounts
6. NO "I am an AI" disclaimers — just answer naturally

MittiSeva features to mention when relevant:
- "Analyse Soil" → enter values and get full report
- "History" → view all past tests
- Download soil report PDF → show to agriculture officer at RBK`;
}

// ── Retry fetch with exponential backoff ──
async function fetchWithRetry(model, body, maxRetries = 3) {
  const delays = [8000, 20000, 40000]; // 8s → 20s → 40s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(geminiUrl(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.ok) return response;

    const status  = response.status;
    const errText = await response.text();

    // On 429: throw a proper Error with metadata attached
    if (status === 429) {
      // Check for hard quota limit to avoid useless retries
      let isHardQuota = false;
      try {
        const errObj = JSON.parse(errText);
        const errMsg = errObj?.error?.message || '';
        if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit: 0') || errMsg.toLowerCase().includes('exhausted')) {
          isHardQuota = true;
        }
      } catch (_) {}

      if (isHardQuota) {
        throw new Error('QUOTA_EXHAUSTED');
      }

      const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10);
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : (delays[attempt] || 40000);

      if (attempt < maxRetries) {
        rateLimitedUntil = Date.now() + waitMs;
        const rateErr = new Error('RATE_LIMIT_429');
        rateErr.isRateLimit = true;
        rateErr.waitMs = waitMs;
        throw rateErr;
      }
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil((delays[2]||40000)/1000)}s and try again.`);
    }


    // On 503 / 500: retry silently
    if ((status === 503 || status === 500) && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, delays[attempt] || 10000));
      continue;
    }

    throw new Error(`Gemini API error ${status}: ${errText.substring(0, 200)}`);
  }
}

// ── Show live countdown bubble ──
function showCountdownBubble(containerId, waitMs, onRetry) {
  const msgs = document.getElementById(containerId);
  if (!msgs) return;

  const div = document.createElement('div');
  div.className = 'msg-ai countdown-bubble';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;

  let remaining = Math.ceil(waitMs / 1000);

  function tick() {
    div.textContent = `⏳ Gemini rate limit hit. Retrying in ${remaining}s…`;
    if (remaining <= 0) {
      div.textContent = '🔄 Retrying now…';
      clearInterval(timer);
      if (onRetry) onRetry(div);
    }
    remaining--;
  }

  tick();
  const timer = setInterval(tick, 1000);
  return { div, timer };
}

// ── Build Gemini request body ──
function buildRequestBody(chatId) {
  return {
    system_instruction: { parts: [{ text: buildSystemPrompt() }] },
    contents: chatHistory[chatId].map(h => ({ role: h.role, parts: h.parts })),
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 800
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };
}

// ── Send to Gemini with auto-retry ──
async function sendToGemini(userMessage, chatId, msgsContainerId) {
  chatHistory[chatId].push({ role: 'user', parts: [{ text: userMessage }] });
  const body = buildRequestBody(chatId);

  // Try primary model first
  try {
    return await fetchWithRetry(GEMINI_PRIMARY, body);
  } catch (err) {
    if (err?.isRateLimit) {
      // Show countdown and retry after wait
      return new Promise((resolve, reject) => {
        showCountdownBubble(msgsContainerId, err.waitMs, async (countdownDiv) => {
          try {
            const resp = await fetchWithRetry(GEMINI_PRIMARY, body, 1);
            countdownDiv?.remove();
            resolve(resp);
          } catch (e2) {
            // Try fallback model with separate quota
            try {
              console.log('[KrishiAI] Trying fallback model:', GEMINI_FALLBACK);
              const resp2 = await fetchWithRetry(GEMINI_FALLBACK, body, 1);
              countdownDiv?.remove();
              resolve(resp2);
            } catch (e3) {
              countdownDiv?.remove();
              reject(e3 instanceof Error ? e3 : new Error(String(e3)));
            }
          }
        });
      });
    }
    throw err;
  }
}

// ── Parse SSE stream ──
async function readGeminiStream(response, onChunk, onDone) {
  const reader  = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer    = '';
  let fullText  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          fullText += text;
          onChunk(text, fullText);
        }
      } catch (_) { /* incomplete chunk */ }
    }
  }

  onDone(fullText);
}

// ── Typing indicator ──
function showTypingIndicator(containerId) {
  const msgs = document.getElementById(containerId);
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'msg-ai typing-indicator';
  div.id = `typing-${containerId}`;
  div.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTypingIndicator(containerId) {
  const el = document.getElementById(`typing-${containerId}`);
  if (el) el.remove();
}

// ── Streaming bubble ──
function createStreamingBubble(containerId) {
  const msgs = document.getElementById(containerId);
  if (!msgs) return null;
  const div = document.createElement('div');
  div.className = 'msg-ai msg-streaming';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

// ── Core send function ──
async function krishiSend(inputId, msgsContainerId, chatId) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return;

  const userMessage = inputEl.value.trim();
  if (!userMessage) return;

  // Debounce: prevent rapid fire
  const now = Date.now();
  if (now - lastRequestTime < MIN_GAP_MS) return;

  // If still rate-limited, show how long to wait
  if (now < rateLimitedUntil) {
    const remaining = Math.ceil((rateLimitedUntil - now) / 1000);
    appendMsgUI('ai', `⏳ Please wait ${remaining}s before sending another message.`, msgsContainerId);
    return;
  }

  inputEl.value = '';
  lastRequestTime = now;

  // Check API key (only warn if we aren't using either the frontend key or the backend proxy)
  if (!useBackendProxy && (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE')) {
    appendMsgUI('user', userMessage, msgsContainerId);
    appendMsgUI('ai',
      '⚠️ Gemini API key is missing. Get a free key at https://aistudio.google.com/apikey and add it to config.js or set GEMINI_API_KEY in the backend .env file 🙏',
      msgsContainerId);
    return;
  }

  // Show user message
  appendMsgUI('user', userMessage, msgsContainerId);
  if (typeof saveChatMessage === 'function') saveChatMessage('user', userMessage);

  // Show typing indicator
  showTypingIndicator(msgsContainerId);

  // Disable send button
  const isFull  = chatId === 'full';
  const sendBtn = document.getElementById(isFull ? 'send-btn-full' : 'send-btn-mobile');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const response = await sendToGemini(userMessage, chatId, msgsContainerId);

    removeTypingIndicator(msgsContainerId);
    const bubble = createStreamingBubble(msgsContainerId);
    let finalText = '';

    await readGeminiStream(
      response,
      (chunk, full) => {
        if (bubble) {
          bubble.textContent = full;
          const msgs = document.getElementById(msgsContainerId);
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
        finalText = full;
      },
      (complete) => {
        if (bubble) bubble.classList.remove('msg-streaming');
        finalText = complete;
      }
    );

    chatHistory[chatId].push({ role: 'model', parts: [{ text: finalText }] });
    if (typeof saveChatMessage === 'function' && finalText) saveChatMessage('ai', finalText);

  } catch (err) {
    removeTypingIndicator(msgsContainerId);

    // Safely extract a readable message from any error type
    let msg;
    if (err instanceof Error) {
      msg = err.message || 'Unknown error';
    } else if (typeof err === 'string') {
      msg = err;
    } else {
      try { msg = JSON.stringify(err); } catch (_) { msg = 'Unknown error'; }
    }

    // Map to user-friendly messages
    let errorMsg;
    const isTe = window.currentLang === 'te';
    if (msg.includes('API_KEY_INVALID') || msg.includes('400')) {
      errorMsg = isTe ? '❌ చెల్లని జెమినీ API కీ.' : '❌ Invalid Gemini API key. Please check config.js.';
    } else if (msg.includes('403')) {
      errorMsg = isTe ? '❌ కీ ప్రామాణీకరించబడలేదు.' : '❌ API key not authorized. Check Google AI Studio settings.';
    } else if (msg.includes('QUOTA_EXHAUSTED')) {
      errorMsg = isTe ? '⏳ కృషి AI తాత్కాలికంగా బిజీగా ఉంది. దయచేసి ఒక నిమిషం తర్వాత మళ్లీ ప్రయత్నించండి.' : '⏳ Krishi AI is temporarily busy. Please try again in a minute.';
    } else if (msg.includes('RATE_LIMIT') || msg.includes('429') || msg.includes('Rate limit')) {
      errorMsg = isTe ? '⏳ అభ్యర్థనల పరిమితి దాటింది. దయచేసి 1-2 నిమిషాలు వేచి ఉండండి.' : '⏳ Rate limit reached. Please wait 1–2 minutes. (Free Gemini = 15 requests/min)';
    } else if (msg.includes('404')) {
      errorMsg = isTe ? '❌ మోడల్ కనుగొనబడలేదు.' : '❌ AI model not found. Please hard-reload the page (Ctrl+Shift+R).';
    } else if (!navigator.onLine) {
      errorMsg = isTe ? '📡 ఇంటర్నెట్ కనెక్షన్ లేదు.' : '📡 No internet connection. Please check your network.';
    } else {
      errorMsg = isTe ? `⚠️ లోపం సంభవించింది: ${msg.substring(0, 100)}` : `⚠️ Krishi AI error: ${msg.substring(0, 150)}`;
    }


    appendMsgUI('ai', errorMsg, msgsContainerId);
    console.error('[KrishiAI]', err);

    // Roll back last user message from history on failure
    if (chatHistory[chatId]?.at(-1)?.role === 'user') {
      chatHistory[chatId].pop();
    }
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (inputEl) inputEl.focus();
  }
}

// ── Public API ──
function sendChat()     { krishiSend('chatInput',     'chatMsgs',     'mobile'); }
function sendChatFull() { krishiSend('chatInputFull', 'chatMsgsFull', 'full');   }

function resetChatHistory(chatId) {
  if (chatId) chatHistory[chatId] = [];
  else { chatHistory.mobile = []; chatHistory.full = []; }
}

// ── Quick suggestion chips ──
const QUICK_SUGGESTIONS = {
  en: ['How is my soil health?', 'Best crops for my soil?', 'How to improve pH?', 'Fertilizer schedule for paddy', 'Organic farming tips'],
  te: ['నా మట్టి ఆరోగ్యం ఎలా ఉంది?', 'నా మట్టికి మంచి పంటలు?', 'pH మెరుగు పరచాలి?', 'వరి కోసం ఎరువుల షెడ్యూల్', 'సేంద్రీయ వ్యవసాయం చిట్కాలు']
};

function injectQuickSuggestions(containerId, inputId) {
  const msgs = document.getElementById(containerId);
  if (!msgs) return;
  if (document.getElementById(`suggestions-${containerId}`)) return; // already injected

  const lang  = window.currentLang || 'en';
  const chips = QUICK_SUGGESTIONS[lang] || QUICK_SUGGESTIONS.en;
  const row   = document.createElement('div');
  row.className = 'suggestion-chips';
  row.id = `suggestions-${containerId}`;

  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-chip';
    btn.textContent = chip;
    btn.onclick = () => {
      const input = document.getElementById(inputId);
      if (input) { input.value = chip; }
      if (inputId === 'chatInputFull') sendChatFull(); else sendChat();
      row.remove();
    };
    row.appendChild(btn);
  });

  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function initChatUI() {
  setTimeout(() => {
    injectQuickSuggestions('chatMsgsFull', 'chatInputFull');
    injectQuickSuggestions('chatMsgs', 'chatInput');
  }, 600);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatUI);
} else {
  setTimeout(initChatUI, 800);
}

console.log('[KrishiAI] Gemini AI engine v3 loaded ✓');
