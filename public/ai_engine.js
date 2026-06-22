// ═══════════════════════════════════════════════════════════
//  KRISHI AI ENGINE  ·  Powered by OpenRouter AI
//  MittiSeva · Agriculture Assistant for AP & Telangana
// ═══════════════════════════════════════════════════════════

// ── Rate-limit state ──
let rateLimitedUntil = 0;   // epoch ms when we can retry
let lastRequestTime  = 0;   // for debounce
const MIN_GAP_MS     = 1500; // minimum ms between sends

// ── In-memory conversation history (multi-turn) ──
const chatHistory = { mobile: [], full: [] };

// ── Reset all in-memory chat history ──
function resetChatHistory() {
  chatHistory.mobile.length = 0;
  chatHistory.full.length   = 0;
}

// ── Context Injection ──
function getSoilContext() {
  const profile    = window.currentProfile;
  const history    = window.HISTORY || [];
  const soilValues = window.soilValues || {};
  const farmerName = profile?.full_name || 'Farmer';
  const farmerVillage = profile?.village || 'your village';

  let soilData = null;

  // Use historical test data if available, otherwise check active form values
  if (history && history.length > 0) {
    const lastTest = history[history.length - 1];
    soilData = {
      score: lastTest.score,
      ph: lastTest.ph,
      n: lastTest.n,
      p: lastTest.p,
      k: lastTest.k,
      moisture: lastTest.moisture || soilValues.moisture,
      oc: lastTest.oc || soilValues.oc
    };
  } else if (soilValues && typeof soilValues.ph !== 'undefined') {
    soilData = {
      score: null,
      ph: soilValues.ph,
      n: soilValues.n,
      p: soilValues.p,
      k: soilValues.k,
      moisture: soilValues.moisture,
      oc: soilValues.oc
    };
  }

  if (!soilData) {
    return "";
  }

  // Calculate score and recommendations on the fly using mittiseva's algorithm
  let score = soilData.score;
  let recs = null;
  if (typeof window.analyseSoil === 'function') {
    recs = window.analyseSoil(soilData);
    if (score === null || typeof score === 'undefined') {
      score = recs.score;
    }
  }

  const cropsStr = recs && recs.crops ? recs.crops.map(c => `${c.icon} ${c.name} (${c.season})`).join(', ') : "N/A";
  const fertsStr = recs && recs.ferts ? recs.ferts.map(f => `${f.icon} ${f.name} (Apply: ${f.dose})`).join(', ') : "N/A";

  return `Farmer Profile:
- Name: ${farmerName}
- Location: ${farmerVillage}

Soil Analysis Data:
- Soil Health Score: ${score}/100
- pH: ${soilData.ph}
- Nitrogen (N): ${soilData.n} kg/ha
- Phosphorus (P): ${soilData.p} kg/ha
- Potassium (K): ${soilData.k} kg/ha
- Recommended Crops: ${cropsStr}
- Recommended Fertilizers: ${fertsStr}`;
}

// ── System Prompt ──
function buildSystemPrompt() {
  const basePrompt = "You are Krishi AI, an intelligent agriculture assistant for Indian farmers. Help users with soil health, fertilizers, crop recommendations, irrigation, pest control, organic farming, weather-related farming advice, and agricultural best practices. Use simple language and provide practical recommendations.";

  const soilContext = getSoilContext();
  let prompt = basePrompt;

  if (soilContext) {
    prompt += `\n\nHere is the current farmer's soil analysis context:\n${soilContext}\nUse this personalized information to provide precise and customized answers for this farmer.`;
  }

  // Detect app language and instruct AI to respond accordingly
  const lang = window.currentLang || 'en';
  const langInstruction =
    lang === 'te' ? 'Always respond in Telugu (తెలుగు) unless the user writes in a different language.' :
    lang === 'hi' ? 'Always respond in Hindi (हिंदी) unless the user writes in a different language.' :
                    'Respond in Telugu if the user writes in Telugu, Hindi if the user writes in Hindi, and English otherwise.';

  prompt += `\n\nInstructions:
1. ${langInstruction}
2. Use simple, clear, and practical village-level language.
3. Keep answers conversational, friendly, and under 4-5 lines unless a detailed step-by-step guidance is necessary.`;

  return prompt;
}

// ── Build OpenAI-compatible request body ──
function buildOpenRouterRequestBody(chatId) {
  const messages = [
    { role: "system", content: buildSystemPrompt() }
  ];

  // Map Gemini-structured or OpenAI-structured history to OpenAI standard messages array
  for (const h of chatHistory[chatId]) {
    const role = h.role === "model" || h.role === "assistant" ? "assistant" : "user";
    let content = "";
    if (typeof h.content === "string") {
      content = h.content;
    } else if (h.parts && h.parts[0] && h.parts[0].text) {
      content = h.parts[0].text;
    } else if (typeof h.text === "string") {
      content = h.text;
    }
    messages.push({ role, content });
  }

  return {
    messages: messages,
    temperature: 0.7,
    max_tokens: 800
  };
}

// ── Parse standard OpenAI SSE stream ──
async function readOpenRouterStream(response, onChunk, onDone) {
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
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const jsonStr = trimmed.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.choices?.[0]?.delta?.content || '';
        if (text) {
          fullText += text;
          onChunk(text, fullText);
        }
      } catch (_) { /* incomplete or comments line */ }
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
  setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 30);
}

// ── Remove typing indicator ──
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
  setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 30);
  return div;
}

// ── Offline Fallback Guidance ──
function getOfflineFallbackMessage(userMessage) {
  const isTe = window.currentLang === 'te';
  const msg = (userMessage || '').toLowerCase();
  
  const unavailableMsg = isTe 
    ? 'Krishi AI తాత్కాలికంగా అందుబాటులో లేదు.' 
    : 'Krishi AI is temporarily unavailable.';

  if (typeof analyseSoil !== 'function' || !window.soilValues) {
    return unavailableMsg;
  }

  try {
    const res = analyseSoil(window.soilValues);
    if (!res) return unavailableMsg;

    const cropList = res.crops ? res.crops.map(c => `${c.icon} ${c.name}`).join(', ') : '';
    const fertList = res.ferts ? res.ferts.map(f => `${f.icon} ${f.name} (${f.dose})`).join(', ') : '';

    // Intent detection
    const isSoilHealth = msg.includes('health') || msg.includes('score') || msg.includes('ఆరోగ్య') || msg.includes('status') || msg.includes('how is my soil');
    const isFertilizer = msg.includes('fertilizer') || msg.includes('urea') || msg.includes('dap') || msg.includes('mop') || msg.includes('ఎరువు') || msg.includes('nutrient');
    const isCrops = msg.includes('crop') || msg.includes('paddy') || msg.includes('grow') || msg.includes('sow') || msg.includes('పంట') || msg.includes('cotton') || msg.includes('groundnut');
    const isHello = msg.includes('hello') || msg.includes('hi') || msg.includes('namaste') || msg.includes('నమస్తే') || msg.includes('హలో');
    const isYellowLeaves = msg.includes('yellow') || msg.includes('ఆకుపచ్చ') || msg.includes('పసుపు') || msg.includes('leaf') || msg.includes('leaves');
    const isPhDetail = msg.includes('ph') || msg.includes('acid') || msg.includes('alkaline');
    const isOrganic = msg.includes('organic') || msg.includes('compost') || msg.includes('manure') || msg.includes('సేంద్రీయ');
    const isWater = msg.includes('water') || msg.includes('irrigation') || msg.includes('drip') || msg.includes('నీరు') || msg.includes('తేమ');
    const isPest = msg.includes('pest') || msg.includes('disease') || msg.includes('insect') || msg.includes('పురుగు') || msg.includes('తెగులు');

    if (isTe) {
      let advice = `${unavailableMsg}\n\n🤖 **స్థానిక కృషి సలహాదారు (ఆఫ్‌లైన్ మోడ్):**\n`;
      
      if (isYellowLeaves) {
        advice += `• **ఆకులు పసుపు రంగులోకి మారడం:** ఇది సాధారణంగా నత్రజని లోపాన్ని (Nitrogen deficiency) సూచిస్తుంది. మీ మట్టిలో నత్రజని స్థాయి: ${window.soilValues.n} kg/ha (ఇది ${res.nS === 'low' ? 'చాలా తక్కువ' : 'సముచితం'}). లోపం ఉంటే, తగిన మోతాదులో యూరియా వేయండి.\n`;
      } else if (isPhDetail) {
        advice += `• **pH స్థాయి చికిత్స:** మీ మట్టి pH విలువ: ${window.soilValues.ph}. pH విలువ 6.0 కన్నా తక్కువ ఉంటే మట్టి ఆమ్లత్వంతో ఉంది, సున్నం (lime) కలపండి. pH 7.5 కన్నా ఎక్కువ ఉంటే క్షార గుణం కలదు, జిప్సం (gypsum) వేయండి.\n`;
      } else if (isOrganic) {
        advice += `• **సేంద్రీయ కార్బన్:** మీ సేంద్రీయ కార్బన్ శాతం: ${window.soilValues.oc}%. భూసారాన్ని పెంచడానికి హెక్టారుకు 3-4 టన్నుల సేంద్రీయ ఎరువు లేదా కంపోస్ట్ కలపడం లేదా పచ్చిరొట్ట ఎరువుల సాగు (green manuring) చేయడం మంచిది.\n`;
      } else if (isWater) {
        advice += `• **నీటి యాజమాన్యం:** మీ మట్టి తేమ: ${window.soilValues.moisture}%. వరి వంటి పంటలకు క్రమం తప్పకుండా నీరు పెట్టండి. పత్తి, వేరుశనగ పంటలకు తక్కువ నీటితో కూడిన డ్రిప్ లేదా స్ప్రింక్లర్ పద్ధతి ఉపయోగించండి.\n`;
      } else if (isPest) {
        advice += `• **పురుగుల నివారణ:** రసాయన మందులకు బదులుగా వేప నూనె లేదా వేప కషాయం వంటి సహజ నివారణలను ఉపయోగించండి. పురుగుల ఉధృతిని తగ్గించడానికి పంటల మార్పిడి (crop rotation) పాటించండి.\n`;
      } else if (isSoilHealth) {
        advice += `• మీ మట్టి ఆరోగ్య స్కోరు **100 కి గాను ${res.score} పాయింట్లు**. మీ మట్టి యొక్క పోషకాల స్థాయిలు:\n`;
        advice += `  - pH విలువ: ${window.soilValues.ph} (${res.phS === 'optimal' ? 'సముచితం' : res.phS === 'low' ? 'తక్కువ' : 'ఎక్కువ'})\n`;
        advice += `  - నత్రజని (N): ${window.soilValues.n} kg/ha (${res.nS === 'optimal' ? 'సముచితం' : res.nS === 'low' ? 'తక్కువ' : 'ఎక్కువ'})\n`;
        advice += `  - భాస్వరం (P): ${window.soilValues.p} kg/ha\n`;
        advice += `  - పొటాషియం (K): ${window.soilValues.k} kg/ha\n`;
      } else if (isFertilizer) {
        advice += `• మీ మట్టి నివేదిక ప్రకారం కింది **ఎరువులు** సిఫార్సు చేయబడ్డాయి:\n`;
        res.ferts.forEach(f => {
          advice += `  - ${f.icon} **${f.name}**: మోతాదు: ${f.dose}\n`;
        });
      } else if (isCrops) {
        advice += `• మీ మట్టి రకం మరియు తేమ ఆధారంగా సిఫార్సు చేయబడిన **పంటలు**:\n`;
        res.crops.forEach(c => {
          advice += `  - ${c.icon} **${c.name}** (సీజన్: ${c.season === 'Kharif' ? 'ఖరీఫ్' : 'రబీ/ఖరీఫ్'})\n`;
        });
      } else if (isHello) {
        advice += `• నమస్తే! నేను కృషి AIని. ప్రస్తుతం సర్వర్ అందుబాటులో లేనందున నేను మీ మట్టి పరీక్ష విలువల ఆధారంగా సమాధానాలు ఇస్తున్నాను. మీ మట్టి ఆరోగ్యం, పంటలు లేదా ఎరువుల గురించి నన్ను ఏదైనా అడగండి.`;
      } else {
        advice += `• మీ మట్టి ఆరోగ్య స్కోరు: **${res.score}/100**\n`;
        if (cropList) advice += `• సిఫార్సు చేసిన పంటలు: ${cropList}\n`;
        if (fertList) advice += `• సిఫార్సు చేసిన ఎరువులు: ${fertList}\n`;
      }
      advice += `\n📋 పూర్తి వివరాల కోసం మెనూలోని **'రిపోర్ట్' (Report)** పేజీని సందర్శించండి.`;
      return advice;
    } else {
      let advice = `${unavailableMsg}\n\n🤖 **Krishi Local Expert (Offline Mode):**\n`;
      
      if (isYellowLeaves) {
        advice += `• **Yellowing of Leaves:** This typically indicates Nitrogen deficiency. Your Nitrogen level is: ${window.soilValues.n} kg/ha (which is ${res.nS === 'low' ? 'Low' : 'Optimal'}). If deficient, applying urea in split doses is recommended.\n`;
      } else if (isPhDetail) {
        advice += `• **pH Adjustment:** Your soil pH is: ${window.soilValues.ph}. If pH is below 6.0 (acidic), apply agricultural lime to neutralize. If pH is above 7.5 (alkaline), apply gypsum or elemental sulfur to balance it.\n`;
      } else if (isOrganic) {
        advice += `• **Organic Matter Improvement:** Your Organic Carbon is: ${window.soilValues.oc}%. To improve soil biology and water retention, apply 3–4 tonnes of compost/farmyard manure per acre, or cultivate green manure crops.\n`;
      } else if (isWater) {
        advice += `• **Irrigation Advice:** Your soil moisture is: ${window.soilValues.moisture}%. For heavy water crops like Paddy, ensure regular watering. For cotton and groundnut, adopt micro-irrigation like drip/sprinklers to prevent root decay.\n`;
      } else if (isPest) {
        advice += `• **Pest Prevention:** Implement Integrated Pest Management (IPM). Use natural neem oil sprays or bio-pesticides like Trichoderma before using chemical alternatives. Rotate crops to break pest cycles.\n`;
      } else if (isSoilHealth) {
        advice += `• Your soil health score is **${res.score}/100**. Nutrient breakdown:\n`;
        advice += `  - pH Level: ${window.soilValues.ph} (${res.phS})\n`;
        advice += `  - Nitrogen (N): ${window.soilValues.n} kg/ha (${res.nS})\n`;
        advice += `  - Phosphorus (P): ${window.soilValues.p} kg/ha (${res.pS})\n`;
        advice += `  - Potassium (K): ${window.soilValues.k} kg/ha (${res.kS})\n`;
      } else if (isFertilizer) {
        advice += `• Based on your soil report, the following **fertilizers** are recommended:\n`;
        res.ferts.forEach(f => {
          advice += `  - ${f.icon} **${f.name}**: Apply ${f.dose}\n`;
        });
      } else if (isCrops) {
        advice += `• Suited **crops** for your soil profile:\n`;
        res.crops.forEach(c => {
          advice += `  - ${c.icon} **${c.name}** (Season: ${c.season})\n`;
        });
      } else if (isHello) {
        advice += `• Namaste! I am Krishi AI. The AI server is temporarily unavailable, but I can answer questions using your local soil report values. Ask me about soil health, crops, or fertilizers!`;
      } else {
        advice += `• Soil Health Score: **${res.score}/100**\n`;
        if (cropList) advice += `• Recommended Crops: ${cropList}\n`;
        if (fertList) advice += `• Suggested Fertilizers: ${fertList}\n`;
      }
      advice += `\n📋 For a detailed PDF report, visit the **'Report'** page in the menu.`;
      return advice;
    }
  } catch (e) {
    console.error('Error generating offline fallback message:', e);
    return unavailableMsg;
  }
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
    chatHistory[chatId].push({ role: 'user', content: userMessage });
    const body = buildOpenRouterRequestBody(chatId);

    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : '';

    const response = await fetch(`${host}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Proxy returned status ${response.status}: ${errText}`);
    }

    removeTypingIndicator(msgsContainerId);
    const bubble = createStreamingBubble(msgsContainerId);
    let finalText = '';

    await readOpenRouterStream(
      response,
      (chunk, full) => {
        if (bubble) {
          bubble.textContent = full;
          const msgs = document.getElementById(msgsContainerId);
          if (msgs) {
            setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 30);
          }
        }
        finalText = full;
      },
      (complete) => {
        if (bubble) bubble.classList.remove('msg-streaming');
        finalText = complete;
      }
    );

    chatHistory[chatId].push({ role: 'assistant', content: finalText });
    if (typeof saveChatMessage === 'function' && finalText) saveChatMessage('ai', finalText);

  } catch (err) {
    console.error('[KrishiAI] Error calling OpenRouter proxy:', err);
    removeTypingIndicator(msgsContainerId);

    // Call Local Soil Expert offline mode fallback on error
    const offlineAdvice = getOfflineFallbackMessage(userMessage);
    appendMsgUI('ai', offlineAdvice, msgsContainerId);

    if (typeof saveChatMessage === 'function') {
      saveChatMessage('ai', offlineAdvice);
    }

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
  setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
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

console.log('[KrishiAI] OpenRouter AI engine loaded ✓');
