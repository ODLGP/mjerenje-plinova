// === AI ASISTENT - GEMINI CHAT BALONČIĆ ===
// Plutajući AI chat dostupan na svim ekranima aplikacije

(function () {
  'use strict';

  // ─── Konstante ────────────────────────────────────────────────────────────
  var LS_API_KEY = 'mop_openrouter_api_key';
  var AI_ENDPOINT = 'https://text.pollinations.ai/';
  var AI_MODEL = 'mistral'; // besplatan, bez ključa

  var SYSTEM_PROMPT = `Ti si AI asistent specijaliziran za mjerenje odlagališnih plinova. 
Radiš unutar mobilne terenske aplikacije MOP (Mjerenje Odlagališnih Plinova) tvrtke Dvokut.
Pomaži mjeriteljima s tumačenjem izmjerenih vrijednosti plinova, uputama za rad, propisima i preporukama.

Relevantni plinovi i tipične vrijednosti za odlagalište:
- CH₄ (metan): normalno 40-60% u bioplinu, >1% LFL (donja eksplozivna granica) = upozorenje
- CO₂ (ugljični dioksid): normalno 30-50% u bioplinu
- O₂ (kisik): trebao bi biti nizak (<5%) u aktivnim zonama, visok O₂ = aerobna zona ili propuštanje
- H₂S (sumporovodik): toksičan već pri >10 ppm, IDLH = 50 ppm, odmah evakuacija pri >100 ppm
- H₂ (vodik): može ukazivati na svježi otpad
- Temperatura: viša temperatura = veća mikrobiološka aktivnost

Odgovaraj kratko, jasno i na hrvatskom jeziku. Ako korisnik pita o vrijednostima iz trenutnog mjerenja, analiziraj ih.`;

  // ─── State ────────────────────────────────────────────────────────────────
  var chatHistory = [];
  var isOpen = false;
  var isLoading = false;

  // ─── HTML Injekcija ───────────────────────────────────────────────────────
  function injectHTML() {
    var html = `
<!-- AI ASISTENT BALONČIĆ -->
<div id="ai-bubble-btn" title="AI Asistent" onclick="aiToggleChat()">
  <span id="ai-bubble-icon">🤖</span>
  <span id="ai-bubble-badge" style="display:none;">!</span>
</div>

<div id="ai-chat-panel">
  <div id="ai-chat-header">
    <div id="ai-chat-title">
      <span>🤖</span>
      <div>
        <div style="font-weight:600;font-size:15px;">AI Asistent</div>
        <div id="ai-chat-status">AI Asistent • Mjerenje plinova</div>
      </div>
    </div>
    <div style="display:flex;gap:6px;align-items:center;">
      <button id="ai-context-btn" onclick="aiSendContext()" title="Pošalji kontekst mjerenja" style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:white;padding:6px 10px;font-size:12px;border-radius:6px;cursor:pointer;width:auto;margin:0;">📊</button>
      <button onclick="aiToggleChat()" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;padding:0;width:32px;margin:0;line-height:1;">×</button>
    </div>
  </div>

  <div id="ai-chat-messages">
    <div class="ai-msg ai-msg-bot">
      <div class="ai-msg-bubble">
        👋 Bok! Ja sam AI asistent za mjerenje odlagališnih plinova.<br><br>
        Mogu ti pomoći s:<br>
        • Tumačenjem izmjerenih vrijednosti<br>
        • Pitanjima o CH₄, CO₂, O₂, H₂S, H₂<br>
        • Propisima i sigurnosnim granicama<br>
        • Bilo čim vezanim uz mjerenje<br><br>
        Klikni 📊 za analizu trenutnog mjerenja.
      </div>
    </div>
  </div>

  <div id="ai-chat-input-area">
    <div id="ai-no-key-warning" style="display:none;">
      ⚠️ Nema API ključa. <a href="#" onclick="aiShowKeyModal();return false;" style="color:var(--primary);">Postavi Gemini API ključ</a>
    </div>
    <div id="ai-input-row">
      <textarea id="ai-input" placeholder="Postavi pitanje..." rows="1" onkeydown="aiHandleKeydown(event)" oninput="aiAutoResize(this)"></textarea>
      <button id="ai-send-btn" onclick="aiSend()" title="Pošalji">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  </div>
</div>

<!-- API KEY MODAL -->
<div id="ai-key-modal" onclick="if(event.target===this)aiHideKeyModal()">
  <div id="ai-key-modal-content">
    <h3 style="margin-top:0;color:var(--primary);">🔑 OpenRouter API ključ</h3>
    <p style="font-size:13px;color:var(--secondary-text);margin-bottom:15px;">
      Besplatni API ključ možeš dobiti na 
      <a href="https://openrouter.ai/keys" target="_blank" style="color:var(--primary);">openrouter.ai/keys</a>
    </p>
    <input type="password" id="ai-key-input" placeholder="AIzaSy..." style="margin-bottom:12px;">
    <div style="display:flex;gap:8px;">
      <button onclick="aiSaveKey()" style="flex:1;">Spremi</button>
      <button onclick="aiHideKeyModal()" style="flex:1;background:#6c757d;">Odustani</button>
    </div>
    <button onclick="aiDeleteKey()" style="margin-top:8px;background:#dc3545;width:100%;font-size:13px;padding:10px;">🗑️ Ukloni spremljeni ključ</button>
  </div>
</div>
`;
    var div = document.createElement('div');
    div.innerHTML = html;
    while (div.firstChild) document.body.appendChild(div.firstChild);
  }

  // ─── CSS Injekcija ────────────────────────────────────────────────────────
  function injectCSS() {
    var css = `
/* ── AI Bubble Button ── */
#ai-bubble-btn {
  position: fixed;
  bottom: 24px;
  right: 20px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #2e7d32, #4caf50);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10000;
  box-shadow: 0 4px 16px rgba(46,125,50,0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
#ai-bubble-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(46,125,50,0.55);
}
#ai-bubble-btn:active {
  transform: scale(0.95);
}
#ai-bubble-icon {
  font-size: 26px;
  line-height: 1;
  transition: transform 0.3s ease;
}
#ai-bubble-btn.open #ai-bubble-icon {
  transform: rotate(20deg);
}
#ai-bubble-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  background: #f44336;
  border-radius: 50%;
  border: 2px solid white;
  font-size: 9px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Chat Panel ── */
#ai-chat-panel {
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 340px;
  max-width: calc(100vw - 32px);
  height: 500px;
  max-height: calc(100vh - 120px);
  background: var(--card-bg, #fff);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22);
  display: none;
  flex-direction: column;
  z-index: 9999;
  border: 1px solid var(--input-border, #ddd);
  overflow: hidden;
  animation: aiSlideUp 0.25s ease-out;
}
#ai-chat-panel.open {
  display: flex;
}
@keyframes aiSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Header ── */
#ai-chat-header {
  background: linear-gradient(135deg, #2e7d32, #4caf50);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  flex-shrink: 0;
}
#ai-chat-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
}
#ai-chat-status {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 1px;
}

/* ── Messages ── */
#ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
}
.ai-msg {
  display: flex;
  gap: 6px;
  max-width: 88%;
  animation: aiMsgIn 0.2s ease-out;
}
@keyframes aiMsgIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ai-msg-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.ai-msg-bot {
  align-self: flex-start;
}
.ai-msg-bubble {
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}
.ai-msg-user .ai-msg-bubble {
  background: #2e7d32;
  color: white;
  border-bottom-right-radius: 4px;
}
.ai-msg-bot .ai-msg-bubble {
  background: var(--hover-bg, #f5f5f5);
  color: var(--text-color, #333);
  border-bottom-left-radius: 4px;
}
.ai-msg-typing .ai-msg-bubble {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
}
.ai-typing-dot {
  width: 7px;
  height: 7px;
  background: var(--secondary-text, #888);
  border-radius: 50%;
  animation: aiTyping 1.2s infinite;
}
.ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes aiTyping {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ── Input Area ── */
#ai-chat-input-area {
  padding: 10px 12px;
  border-top: 1px solid var(--input-border, #ddd);
  flex-shrink: 0;
  background: var(--card-bg, #fff);
}
#ai-no-key-warning {
  font-size: 12px;
  color: #e65100;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #fff3e0;
  border-radius: 6px;
}
#ai-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
#ai-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--input-border, #ddd);
  border-radius: 20px;
  font-size: 14px;
  resize: none;
  min-height: 40px;
  max-height: 120px;
  overflow-y: auto;
  line-height: 1.4;
  background: var(--input-bg, #fff);
  color: var(--text-color, #333);
  transition: border-color 0.2s;
  margin: 0;
  width: auto;
}
#ai-input:focus {
  border-color: #2e7d32;
  box-shadow: 0 0 0 2px rgba(46,125,50,0.15);
  outline: none;
  transform: none;
}
#ai-send-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: #2e7d32;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
  transition: background 0.2s, transform 0.15s;
}
#ai-send-btn:hover { background: #4caf50; transform: scale(1.05); }
#ai-send-btn:disabled { background: #bdbdbd; cursor: not-allowed; transform: none; }

/* ── API Key Modal ── */
#ai-key-modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 11000;
  align-items: center;
  justify-content: center;
}
#ai-key-modal.open {
  display: flex;
}
#ai-key-modal-content {
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}

/* Dark mode prilagodba */
body.dark .ai-msg-bot .ai-msg-bubble {
  background: #2a2a2a;
  color: #e0e0e0;
}
body.dark #ai-no-key-warning {
  background: #3e2700;
  color: #ffb74d;
}

@media (max-width: 400px) {
  #ai-chat-panel {
    right: 8px;
    left: 8px;
    width: auto;
    bottom: 80px;
  }
  #ai-bubble-btn {
    right: 14px;
    bottom: 20px;
  }
}
`;
    var style = document.createElement('style');
    style.id = 'ai-assistant-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── API ključ ────────────────────────────────────────────────────────────
  function getApiKey() {
    return localStorage.getItem(LS_API_KEY) || '';
  }

  window.aiShowKeyModal = function () {
    var modal = document.getElementById('ai-key-modal');
    var input = document.getElementById('ai-key-input');
    if (input) input.value = getApiKey();
    if (modal) modal.classList.add('open');
  };

  window.aiHideKeyModal = function () {
    var modal = document.getElementById('ai-key-modal');
    if (modal) modal.classList.remove('open');
  };

  window.aiSaveKey = function () {
    var val = document.getElementById('ai-key-input').value.trim();
    if (!val) { alert('Unesi API ključ!'); return; }
    localStorage.setItem(LS_API_KEY, val);
    aiHideKeyModal();
    checkApiKey();
    aiAppendMsg('bot', '✅ API ključ je postavljen. Spreman sam za pitanja!');
  };

  window.aiDeleteKey = function () {
    localStorage.removeItem(LS_API_KEY);
    aiHideKeyModal();
    checkApiKey();
  };

  function checkApiKey() {
    // Nema API ključa - sve je besplatno
    var warning = document.getElementById('ai-no-key-warning');
    var sendBtn = document.getElementById('ai-send-btn');
    if (warning) warning.style.display = 'none';
    if (sendBtn) sendBtn.disabled = false;
  }

  // ─── Chat toggle ──────────────────────────────────────────────────────────
  window.aiToggleChat = function () {
    isOpen = !isOpen;
    var panel = document.getElementById('ai-chat-panel');
    var btn = document.getElementById('ai-bubble-btn');
    if (panel) {
      panel.classList.toggle('open', isOpen);
    }
    if (btn) {
      btn.classList.toggle('open', isOpen);
    }
    if (isOpen) {
      checkApiKey();
      setTimeout(function () {
        var input = document.getElementById('ai-input');
        if (input) input.focus();
        scrollToBottom();
      }, 50);
    }
  };

  // ─── Kontekst mjerenja ────────────────────────────────────────────────────
  function getMeasurementContext() {
    // Pokušaj dohvatiti state iz globalnog scope-a
    var s = window.state;
    if (!s) return null;

    var ctx = {};

    // Odlagalište
    if (s.selectedLandfill) {
      ctx.odlagaliste = s.selectedLandfill.name || '';
    }

    // Trenutno mjerenje
    if (s.currentMeasurement) {
      var m = s.currentMeasurement;
      ctx.datum = m.date || '';
      ctx.mjeritelj = m.measurer || '';
      ctx.uredaj = m.device || '';

      // Meteorološki podaci
      if (m.weather) {
        ctx.temperatura_zraka = m.weather.temp ? m.weather.temp + ' °C' : '';
        ctx.tlak_zraka = m.weather.pressure ? m.weather.pressure + ' hPa' : '';
        ctx.vjetar = (m.weather.windDir || '') + ' ' + (m.weather.windSpeed ? m.weather.windSpeed + ' m/s' : '');
      }

      // Izmjereni odušnici
      if (m.vents && m.vents.length > 0) {
        ctx.izmjereni_odzusnici = m.vents.map(function (v) {
          if (v.status === 'not_measurable') {
            return v.name + ': ne može se izmjeriti' + (v.note ? ' (' + v.note + ')' : '');
          }
          var vals = [];
          if (v.ch4 !== '' && v.ch4 !== null && v.ch4 !== undefined) vals.push('CH₄=' + v.ch4 + '%');
          if (v.co2 !== '' && v.co2 !== null && v.co2 !== undefined) vals.push('CO₂=' + v.co2 + '%');
          if (v.o2  !== '' && v.o2  !== null && v.o2  !== undefined) vals.push('O₂=' + v.o2 + '%');
          if (v.h2  !== '' && v.h2  !== null && v.h2  !== undefined) vals.push('H₂=' + v.h2 + ' ppm');
          if (v.h2s !== '' && v.h2s !== null && v.h2s !== undefined) vals.push('H₂S=' + v.h2s + ' ppm');
          if (v.temp !== '' && v.temp !== null && v.temp !== undefined) vals.push('T=' + v.temp + '°C');
          return v.name + ': ' + (vals.length ? vals.join(', ') : '(nema vrijednosti)') + (v.note ? ' [' + v.note + ']' : '');
        });
      }
    }

    // Odušnik koji se trenutno uređuje (ako je forma otvorena)
    var ventForm = document.getElementById('vent-form');
    if (ventForm && ventForm.style.display !== 'none') {
      var currentVent = {
        naziv: document.getElementById('vent-name') ? document.getElementById('vent-name').value : '',
        ch4: document.getElementById('ch4') ? document.getElementById('ch4').value : '',
        co2: document.getElementById('co2') ? document.getElementById('co2').value : '',
        o2: document.getElementById('o2') ? document.getElementById('o2').value : '',
        h2: document.getElementById('h2') ? document.getElementById('h2').value : '',
        h2s: document.getElementById('h2s') ? document.getElementById('h2s').value : '',
        temp: document.getElementById('vent-temp') ? document.getElementById('vent-temp').value : ''
      };
      // Samo dodaj ako ima barem naziv
      if (currentVent.naziv) {
        ctx.trenutni_odusnik = currentVent;
      }
    }

    return Object.keys(ctx).length > 0 ? ctx : null;
  }

  window.aiSendContext = function () {
    var ctx = getMeasurementContext();
    if (!ctx) {
      aiAppendMsg('bot', 'ℹ️ Trenutno nema aktivnog mjerenja. Navigiraj do ekrana mjerenja pa pokušaj ponovo.');
      if (!isOpen) aiToggleChat();
      return;
    }

    var lines = ['📊 **Kontekst trenutnog mjerenja:**\n'];
    if (ctx.odlagaliste) lines.push('Odlagalište: ' + ctx.odlagaliste);
    if (ctx.datum) lines.push('Datum: ' + ctx.datum);
    if (ctx.mjeritelj) lines.push('Mjeritelj: ' + ctx.mjeritelj);
    if (ctx.uredaj) lines.push('Uređaj: ' + ctx.uredaj);
    if (ctx.temperatura_zraka) lines.push('Temp. zraka: ' + ctx.temperatura_zraka);
    if (ctx.tlak_zraka) lines.push('Tlak: ' + ctx.tlak_zraka);
    if (ctx.vjetar && ctx.vjetar.trim()) lines.push('Vjetar: ' + ctx.vjetar.trim());

    if (ctx.trenutni_odusnik) {
      var v = ctx.trenutni_odusnik;
      lines.push('\n🔧 Odušnik koji se mjeri: ' + v.naziv);
      if (v.ch4) lines.push('  CH₄ = ' + v.ch4 + '%');
      if (v.co2) lines.push('  CO₂ = ' + v.co2 + '%');
      if (v.o2)  lines.push('  O₂ = ' + v.o2 + '%');
      if (v.h2)  lines.push('  H₂ = ' + v.h2 + ' ppm');
      if (v.h2s) lines.push('  H₂S = ' + v.h2s + ' ppm');
      if (v.temp) lines.push('  Temp. = ' + v.temp + '°C');
    }

    if (ctx.izmjereni_odzusnici && ctx.izmjereni_odzusnici.length > 0) {
      lines.push('\n📋 Izmjereni odušnici (' + ctx.izmjereni_odzusnici.length + '):');
      ctx.izmjereni_odzusnici.forEach(function (row) {
        lines.push('  ' + row);
      });
    }

    if (!isOpen) aiToggleChat();

    aiAppendMsg('bot', lines.join('\n'));

    // Automatski pošalji analizu ako ima podataka
    if (ctx.izmjereni_odzusnici && ctx.izmjereni_odzusnici.length > 0) {
      setTimeout(function () {
        var question = 'Na temelju prikazanog konteksta mjerenja, daj kratku analizu izmjerenih vrijednosti i upozori me na sve što je izvan normalnih granica.';
        aiSendMessage(question, ctx);
      }, 300);
    }
  };

  // ─── Slanje poruka ────────────────────────────────────────────────────────
  window.aiHandleKeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      aiSend();
    }
  };

  window.aiAutoResize = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  window.aiSend = function () {
    var input = document.getElementById('ai-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    input.style.height = 'auto';

    // Dohvati kontekst mjerenja i priloži uz poruku
    var ctx = getMeasurementContext();
    aiSendMessage(text, ctx);
  };

  function aiSendMessage(userText, ctx) {
    // Prikaži korisnikovu poruku
    aiAppendMsg('user', userText);

    // Pripremi kontekst string
    var contextBlock = '';
    if (ctx) {
      contextBlock = '\n\n[KONTEKST MJERENJA]\n' + JSON.stringify(ctx, null, 2) + '\n[/KONTEKST MJERENJA]\n\n';
    }

    // Typing indikator
    var typingId = aiAppendTyping();
    isLoading = true;
    var sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    // Pripremi messages
    var messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    chatHistory.forEach(function (msg) {
      messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text });
    });
    messages.push({ role: 'user', content: contextBlock + userText });
    chatHistory.push({ role: 'user', text: userText });

    // Pozovi API bez ključa - Pollinations text format
    fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        model: AI_MODEL,
        seed: -1,
        private: true
      })
    })
    .then(function (res) {
      // Pollinations vraća plain text, ne JSON
      return res.text();
    })
    .then(function (text) {
      aiRemoveTyping(typingId);
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;

      if (!text || text.trim() === '') {
        aiAppendMsg('bot', '⚠️ Prazan odgovor. Pokušaj ponovo.');
        return;
      }

      // Provjeri je li greška
      var maybeJson = null;
      try { maybeJson = JSON.parse(text); } catch(e) {}
      if (maybeJson && maybeJson.error) {
        aiAppendMsg('bot', '❌ Greška: ' + (maybeJson.error.message || JSON.stringify(maybeJson.error)));
        return;
      }

      chatHistory.push({ role: 'model', text: text });
      aiAppendMsg('bot', text);
    })
    .catch(function (err) {
      aiRemoveTyping(typingId);
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      aiAppendMsg('bot', '❌ Mrežna greška: ' + err.message);
    });
  }


  // ─── DOM helpers ──────────────────────────────────────────────────────────
  function aiAppendMsg(role, text) {
    var container = document.getElementById('ai-chat-messages');
    if (!container) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'ai-msg ai-msg-' + role;

    var bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';
    // Pretvorba osnovnog Markdowna (bold, italic, liste) u HTML
    bubble.innerHTML = aiMarkdownToHTML(text);

    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
  }

  function aiAppendTyping() {
    var container = document.getElementById('ai-chat-messages');
    if (!container) return null;
    var id = 'ai-typing-' + Date.now();
    var wrapper = document.createElement('div');
    wrapper.className = 'ai-msg ai-msg-bot ai-msg-typing';
    wrapper.id = id;
    wrapper.innerHTML = '<div class="ai-msg-bubble"><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span></div>';
    container.appendChild(wrapper);
    scrollToBottom();
    return id;
  }

  function aiRemoveTyping(id) {
    if (!id) return;
    var el = document.getElementById(id);
    if (el) el.remove();
  }

  function scrollToBottom() {
    var container = document.getElementById('ai-chat-messages');
    if (container) {
      setTimeout(function () {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  // Osnovna Markdown → HTML konverzija
  function aiMarkdownToHTML(text) {
    if (!text) return '';
    // Escape HTML
    var escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped
      // Bold: **text** ili __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic: *text* ili _text_
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>')
      // Bullet lista: • ili - ili *
      .replace(/^[•\-\*] (.+)/gm, '<li>$1</li>')
      // Numerirana lista
      .replace(/^\d+\. (.+)/gm, '<li>$1</li>')
      // Grupiranje li elemenata (aproksimacija)
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin:4px 0 4px 16px;padding:0;">$&</ul>')
      // Novi redovi
      .replace(/\n/g, '<br>');
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    injectCSS();
    injectHTML();
    checkApiKey();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
