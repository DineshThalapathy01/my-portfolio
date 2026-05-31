document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("navToggle");
  const appNav = document.getElementById("appNav");

  if (navToggle && appNav) {
    navToggle.addEventListener("click", () => {
      document.body.classList.toggle("menu-open");
    });

    appNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        document.body.classList.remove("menu-open");
      });
    });
  }

  document.querySelectorAll(".dropdown-btn").forEach((btn) => {
    const figure = btn.closest("figure");
    const description = figure.querySelector(".image-description");

    if (!description) return;

    description.style.maxHeight = "0";
    description.style.overflow = "hidden";

    btn.addEventListener("click", () => {
      const isOpen = btn.classList.toggle("rotate");
      if (isOpen) {
        description.style.maxHeight = description.scrollHeight + "px";
        description.classList.add("open");
      } else {
        description.style.maxHeight = "0";
        description.classList.remove("open");
      }
    });
  });

  document.querySelectorAll(".dropdown-button-bbocw").forEach((btn) => {
    const figure = btn.closest("figure");
    const description = figure.querySelector(".image-description");

    if (!description) return;

    description.style.maxHeight = "0";
    description.style.overflow = "hidden";

    btn.addEventListener("click", () => {
      const isOpen = btn.classList.toggle("rotate");
      if (isOpen) {
        description.style.maxHeight = description.scrollHeight + "px";
        description.classList.add("open");
      } else {
        description.style.maxHeight = "0";
        description.classList.remove("open");
      }
    });
  });

  const lastUpdatedElement = document.getElementById("last-updated-time");
  const lastActiveElement = document.getElementById("last-updated-time2");

  const manualDate = "September 1, 2025";
  const manualTime = "10:00 AM";

  if (lastUpdatedElement) lastUpdatedElement.textContent = manualDate;
  if (lastActiveElement) lastActiveElement.textContent = manualTime;

  const VISITOR_STATS_KEY = 'portfolioVisitorStats';
  const VISITOR_ID_KEY = 'portfolioVisitorId';
  const getDateKey = (date) => date.toISOString().slice(0, 10);

  async function generateFingerprint() {
    const raw = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency
    ].join("|");

    const msgUint8 = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  const formatDateKey = (key) => {
    const date = new Date(key);
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const generateVisitorId = () => {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `visitor-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  };

  const getVisitorId = () => {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = generateVisitorId();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  };

  const getVisitorStats = () => {
    try {
      const stats = JSON.parse(localStorage.getItem(VISITOR_STATS_KEY) || '{}');
      return {
        globalVisitorIds: Array.isArray(stats.globalVisitorIds) ? stats.globalVisitorIds : [],
        dailyVisitorIds: typeof stats.dailyVisitorIds === 'object' && stats.dailyVisitorIds !== null ? stats.dailyVisitorIds : {},
      };
    } catch {
      return { globalVisitorIds: [], dailyVisitorIds: {} };
    }
  };

  const saveVisitorStats = (stats) => {
    localStorage.setItem(VISITOR_STATS_KEY, JSON.stringify(stats));
  };

  const incrementVisitorStats = () => {
    const visitorId = getVisitorId();
    const stats = getVisitorStats();
    const todayKey = getDateKey(new Date());

    if (!stats.globalVisitorIds.includes(visitorId)) {
      stats.globalVisitorIds.push(visitorId);
    }

    if (!Array.isArray(stats.dailyVisitorIds[todayKey])) {
      stats.dailyVisitorIds[todayKey] = [];
    }

    if (!stats.dailyVisitorIds[todayKey].includes(visitorId)) {
      stats.dailyVisitorIds[todayKey].push(visitorId);
    }

    saveVisitorStats(stats);
    return stats;
  };

  const getVisitorSummary = (dateKey) => {
    const stats = getVisitorStats();
    const todayKey = getDateKey(new Date());
    const total = stats.globalVisitorIds.length;
    const todayCount = Array.isArray(stats.dailyVisitorIds[todayKey]) ? stats.dailyVisitorIds[todayKey].length : 0;
    const requestedKey = dateKey || todayKey;
    const requestedCount = Array.isArray(stats.dailyVisitorIds[requestedKey]) ? stats.dailyVisitorIds[requestedKey].length : 0;
    return {
      stats,
      total,
      todayKey,
      todayCount,
      requestedKey,
      requestedCount,
    };
  };

  const getDailyBreakdown = async () => {
    try {
      const response = await fetch(`${WORKER_URL}/daily-breakdown`);
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch daily breakdown:', e);
      return { breakdown: [] };
    }
  };

  // Make tooltip sticky and avoid flicker: manage open/close with a small delay.
  const setupFooterTooltip = () => {
    const footer = document.querySelector('.app-footer');
    if (!footer) return;
    const totalBadge = footer.querySelector('.footer-badge-total');
    if (!totalBadge) return;

    let closeTimer = null;

    const openTooltip = () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      totalBadge.classList.add('open');
    };

    const closeTooltip = () => {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => totalBadge.classList.remove('open'), 400);
    };

    totalBadge.addEventListener('mouseenter', openTooltip);
    totalBadge.addEventListener('focusin', openTooltip);
    totalBadge.addEventListener('mouseleave', closeTooltip);
    totalBadge.addEventListener('focusout', closeTooltip);

    // keep it open while hovering the tooltip itself
    const tooltip = totalBadge.querySelector('.visitor-breakdown-tooltip');
    if (tooltip) {
      tooltip.addEventListener('mouseenter', openTooltip);
      tooltip.addEventListener('mouseleave', closeTooltip);
    }
  };

  const updateFooterVisitorStats = async () => {
    const local = getVisitorSummary();
    let counts = {
      total: local.total,
      today: local.todayCount,
    };
    try {
      const remote = await getRemoteCounts();
      if (typeof remote.total === 'number') {
        counts.total = remote.total;
      }
      if (typeof remote.today === 'number') {
        counts.today = remote.today;
      }
    } catch {
      // keep local fallback counts if remote is unavailable
    }

    const footer = document.querySelector('.app-footer');
    if (!footer) return;

    // Fetch daily breakdown for the hover dialog
    let breakdownHtml = '';
    try {
      const breakdown = await getDailyBreakdown();
      if (breakdown.breakdown && breakdown.breakdown.length > 0) {
        const listItems = breakdown.breakdown
          .map(({ date, count }) => {
            const dateObj = new Date(date + 'T00:00:00');
            const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `<li><span class="breakdown-date">${formatted}</span><span class="breakdown-count">${count}</span></li>`;
          })
          .join('');
        breakdownHtml = `<div class="visitor-breakdown-tooltip">
          <ul class="breakdown-list">${listItems}</ul>
        </div>`;
      }
    } catch (e) {
      console.error('Error building breakdown dialog:', e);
    }

    footer.innerHTML =
      `Designed & Maintained by S Dinesh Kumar. Last updated: May 31, 2026.` +
      `<div class="footer-visitor-summary">` +
      `<span class="footer-badge footer-badge-today">Visitors Today: ${counts.today}</span>` +
      `<span class="footer-badge footer-badge-total">` +
        `Total Visitors: ${counts.total}` +
        `<button class="visitor-info-btn" title="View daily breakdown">ℹ️</button>` +
        breakdownHtml +
      `</span>` +
      `</div>`;
    // ensure tooltip behaviors are wired after inserting the HTML
    setupFooterTooltip();
  };

  // Cloudflare Worker Visitor Counter
  const WORKER_URL =
    "https://portfolio-visitor-counter.dineshthalapathy62.workers.dev";

  async function incrementRemoteCountsIfNeeded() {
    try {
      const fingerprint = await generateFingerprint();
      await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fingerprint })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getRemoteCounts = async () => {

    try {

      const response =
        await fetch(
          `${WORKER_URL}/stats`
        );

      return await response.json();

    } catch (e) {

      return {
        total: 0,
        today: 0
      };
    }
  };

  const calculateExperience = () => {
    const startDate = new Date("2023-04-12");
    const currentDate = new Date();

    let years = currentDate.getFullYear() - startDate.getFullYear();
    let months = currentDate.getMonth() - startDate.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (currentDate.getDate() < startDate.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }

    let experienceString = "";
    if (years > 0) {
      experienceString += `${years} year${years > 1 ? "s" : ""}`;
    }
    if (months > 0) {
      experienceString += `${years > 0 ? " and " : ""}${months} month${months > 1 ? "s" : ""}`;
    }
    if (years === 0 && months === 0) {
      experienceString = "Less than a month";
    }

    const experienceElement = document.getElementById("experience");
    if (experienceElement) {
      experienceElement.textContent = experienceString;
    }
  };


  calculateExperience();
  incrementVisitorStats();

  (async () => {

    await incrementRemoteCountsIfNeeded();

    await updateFooterVisitorStats();

  })();

  // Make project cards navigate when clicked (except when inner links are clicked)
  document.querySelectorAll('.project-card').forEach((card) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // if the click originated from an anchor, let it handle navigation
      if (e.target.closest('a')) return;
      const link = card.querySelector('a.project-link');
      if (link) {
        window.location.href = link.getAttribute('href');
      }
    });
  });

  // Map link toggles for location labels on homepage
  const mapDisplay = document.getElementById('mapLinkDisplay');
  document.querySelectorAll('.show-map-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const href = btn.getAttribute('data-href');
      if (!mapDisplay) return;
      if (mapDisplay.textContent === href) {
        mapDisplay.style.display = 'none';
        mapDisplay.textContent = '';
      } else {
        mapDisplay.style.display = 'block';
        mapDisplay.textContent = href;
      }
    });
  });

  // Portfolio AI chat widget
  const chatTemplate = `
    <aside class="chat-widget" aria-live="polite" style="display: none;">
      <div class="chat-widget-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="chat-welcome">LEO</span>
          <p class="chat-subtitle">Portfolio AI assistant</p>
        </div>
        <button id="chatCloseBtn" type="button" aria-label="Close chat" title="Close chat" style="background: none; border: none; cursor: pointer; font-size: 24px; padding: 0;">×</button>
      </div>
      <div class="chat-widget-body" id="chatBody">
      </div>
      <div class="chat-widget-footer">
        <form id="chatForm">
          <div class="chat-input-wrapper">
            <input id="chatInput" type="text" placeholder="Ask me about my work..." autocomplete="off" />
            <div class="chat-suggestions-panel">
              <div class="chat-suggestions" id="chatSuggestions"></div>
              <div class="chat-status" id="chatStatus"></div>
            </div>
          </div>
          <button type="submit">Send</button>
        </form>
      </div>
    </aside>
  `;

  if (!document.querySelector('.chat-widget')) {
    document.body.insertAdjacentHTML('beforeend', chatTemplate);
  }

  const chatBody = document.getElementById('chatBody');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatStatus = document.getElementById('chatStatus');
  const chatSuggestionsPanel = document.querySelector('.chat-suggestions-panel');
  const chatSendButton = chatForm ? chatForm.querySelector('button[type="submit"]') : null;
  const originalSendButtonText = chatSendButton ? chatSendButton.textContent : 'Send';

  const chatWidget = document.querySelector('.chat-widget');
  let chatFirstOpened = false;
  let autoRotateInterval = null;
  let currentMessageIndex = 0;
  let messageAutoRotateTimeout = null;
  let blockCountdownInterval = null;

  const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap', 'idiot'];
  const badHashes = new Set();
  let warningCount = 0;
  let blockUntil = null;

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const hashBadWord = (word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i += 1) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  };

  const getBlockRemainingMs = () => (blockUntil ? Math.max(0, blockUntil - Date.now()) : 0);

  const setSendButtonTyping = (isTyping) => {
    if (!chatSendButton) return;
    const blockSeconds = Math.ceil(getBlockRemainingMs() / 1000);
    const isBlockedNow = blockSeconds > 0;
    chatSendButton.disabled = isTyping || isBlockedNow;
    if (isTyping) {
      chatSendButton.textContent = 'Wait...';
      return;
    }
    chatSendButton.textContent = isBlockedNow ? `Wait ${blockSeconds}s` : originalSendButtonText;
  };

  const showGreetingOnFirstOpen = () => {
    if (chatFirstOpened) return;
    chatFirstOpened = true;
    setSendButtonTyping(true);
    startTypingIndicator();
    const now = new Date();
    const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const greeting = `Hi, I'm LEO! Today is ${dateStr}, ${timeStr}. Ask about my projects or skills.`;
    setTimeout(() => {
      stopTypingIndicator();
      appendChatMessage(greeting, 'bot');
      setSendButtonTyping(false);
    }, 3000);
  };

  const startAutoRotate = () => {
    if (autoRotateInterval) window.clearInterval(autoRotateInterval);
    if (messageAutoRotateTimeout) window.clearTimeout(messageAutoRotateTimeout);

    const messages = chatBody.querySelectorAll('.chat-message.bot');
    if (messages.length === 0) return;

    currentMessageIndex = currentMessageIndex % messages.length;
    let remainingTime = 10000;

    const updateCountdown = () => {
      remainingTime -= 100;
      if (remainingTime <= 0) {
        remainingTime = 10000;
        currentMessageIndex = (currentMessageIndex + 1) % messages.length;
        messages.forEach((msg, idx) => {
          msg.style.display = idx === currentMessageIndex ? 'block' : 'none';
        });
      }
      const seconds = Math.ceil(Math.max(0, remainingTime) / 1000);
      setStatus(`${seconds}s`);
    };

    messages.forEach((msg, idx) => {
      msg.style.display = idx === currentMessageIndex ? 'block' : 'none';
    });
    setStatus('10s');
    autoRotateInterval = window.setInterval(updateCountdown, 100);
  };

  const stopAutoRotate = () => {
    if (autoRotateInterval) {
      window.clearInterval(autoRotateInterval);
      autoRotateInterval = null;
    }
    setStatus('');
  };

  const appendChatMessage = (text, type = 'bot') => {
    const message = document.createElement('div');
    message.className = `chat-message ${type}`;
    const textLine = document.createElement('p');
    textLine.textContent = text;
    const timeLabel = document.createElement('span');
    timeLabel.className = 'chat-time';
    timeLabel.textContent = formatTime();
    message.appendChild(textLine);
    message.appendChild(timeLabel);
    chatBody.appendChild(message);
    chatBody.scrollTop = chatBody.scrollHeight;
    return message;
  };

  // append HTML content to chat (used for breakdown grid)
  const appendChatHtml = (html, type = 'bot') => {
    const message = document.createElement('div');
    message.className = `chat-message ${type}`;
    const container = document.createElement('div');
    container.className = 'chat-html-content';
    container.innerHTML = html;
    const timeLabel = document.createElement('span');
    timeLabel.className = 'chat-time';
    timeLabel.textContent = formatTime();
    message.appendChild(container);
    message.appendChild(timeLabel);
    chatBody.appendChild(message);
    chatBody.scrollTop = chatBody.scrollHeight;
    return message;
  };

  const setStatus = (text) => {
    if (!chatStatus) return;
    chatStatus.textContent = text;
    chatStatus.classList.toggle('visible', Boolean(text));
  };

  const stopBlockCountdown = () => {
    if (blockCountdownInterval) {
      window.clearInterval(blockCountdownInterval);
      blockCountdownInterval = null;
    }
  };

  const updateBlockCountdown = () => {
    const remainingMs = getBlockRemainingMs();
    if (remainingMs <= 0) {
      blockUntil = null;
      stopBlockCountdown();
      if (!isBotTyping) {
        setStatus('');
      }
      setSendButtonTyping(false);
      return;
    }

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    setStatus(`Blocked for ${remainingSeconds}s`);
    setSendButtonTyping(false);
  };

  const startBlockCountdown = (durationMs = 5000) => {
    blockUntil = Date.now() + durationMs;
    stopBlockCountdown();
    updateBlockCountdown();
    blockCountdownInterval = window.setInterval(updateBlockCountdown, 250);
  };

  const showSuggestionPanel = () => {
    if (!chatSuggestionsPanel) return;
    chatSuggestionsPanel.classList.add('active');
  };

  const hideSuggestionPanel = (force = false) => {
    if (stickySuggestions && !force) return;
    if (!chatSuggestionsPanel) return;
    chatSuggestionsPanel.classList.remove('active');
    clearSuggestionCountdown();
    setStatus('');
  };

  const suggestionPool = [
    'Tell me about the BBOCW project',
    'What technologies do you use?',
    'How did you build the chatbot?',
    'Where is your office located?',
    'Tell me about the Smart Travellers app',
    'How did you start in full stack development?',
    'What is the TNCSC project about?',
    'What skills do you have in Java and Angular?',
    'What is your experience with government systems?',
    'How can I contact you?',
    'What is your full resume summary?',
    'Describe your work history and experience.',
    'What are your contact details?',
    'Tell me about your biography.',
    'Give project specifications for BBOCW or TNCSC.'
  ];

  const chatSuggestions = document.getElementById('chatSuggestions');
  let suggestionHideTimeout = null;
  let suggestionCountdownInterval = null;
  let suggestionCountdownValue = 0;
  let typingInterval = null;
  let isBotTyping = false;
  let suggestionSelectHandler = null;
  let stickySuggestions = false;
  let emailJsInitialized = false;
  let lastSuggestionSignature = '';
  const SUGGESTION_COUNTDOWN_SECONDS = 5;

  const clearSuggestionCountdown = () => {
    if (suggestionCountdownInterval) {
      window.clearInterval(suggestionCountdownInterval);
      suggestionCountdownInterval = null;
    }
  };

  const startSuggestionCountdown = () => {
    if (stickySuggestions) return;
    clearSuggestionCountdown();
    suggestionCountdownValue = SUGGESTION_COUNTDOWN_SECONDS;
    setStatus(`${suggestionCountdownValue}s`);
    suggestionCountdownInterval = window.setInterval(() => {
      suggestionCountdownValue -= 1;
      if (suggestionCountdownValue <= 0) {
        clearSuggestionCountdown();
        const newSuggestions = getSuggestions(chatInput.value.trim());
        if (newSuggestions.length > 0) {
          renderSuggestions(newSuggestions);
        } else {
          hideSuggestionPanel();
        }
      } else {
        setStatus(`${suggestionCountdownValue}s`);
      }
    }, 1000);
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  let typingMessage = null;

  const startTypingIndicator = () => {
    if (typingInterval) {
      window.clearInterval(typingInterval);
    }
    isBotTyping = true;
    renderSuggestions([]);
    typingMessage = appendChatMessage('LEO is typing...', 'typing');
    setSendButtonTyping(true);
    let dots = 0;
    typingInterval = window.setInterval(() => {
      if (typingMessage && typingMessage.querySelector('p')) {
        dots = (dots + 1) % 4;
        typingMessage.querySelector('p').textContent = 'LEO is typing' + '.'.repeat(dots);
      }
    }, 400);
  };

  const stopTypingIndicator = () => {
    if (typingInterval) {
      window.clearInterval(typingInterval);
      typingInterval = null;
    }
    isBotTyping = false;
    if (typingMessage) {
      typingMessage.remove();
      typingMessage = null;
    }
    setSendButtonTyping(false);
  };

  const getSuggestions = (query) => {
    const lower = query.toLowerCase();
    let filtered = suggestionPool.filter((item) => !query || item.toLowerCase().includes(lower));

    if (!query && filtered.length > 0) {
      filtered.sort(() => Math.random() - 0.5);
    }

    return filtered.slice(0, 1);
  };

  const censorBadWords = (input) => badWords.reduce((sanitized, word) => {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    return sanitized.replace(pattern, '******');
  }, input);

  const renderSuggestions = (items, options = {}) => {
    const { sticky = false, onSelect = null, variant = 'default' } = options;
    if (!chatSuggestions) return;
    stickySuggestions = sticky;
    suggestionSelectHandler = onSelect;
    chatSuggestions.innerHTML = '';
    if (!items.length) {
      lastSuggestionSignature = '';
      stickySuggestions = false;
      suggestionSelectHandler = null;
      chatSuggestions.classList.remove('active');
      hideSuggestionPanel(true);
      return;
    }
    lastSuggestionSignature = `${variant}|${sticky}|${items.map((suggestion) => (
      typeof suggestion === 'string' ? suggestion : suggestion.label
    )).join('||')}`;
    items.forEach((suggestion, index) => {
      const suggestionData = typeof suggestion === 'string'
        ? { label: suggestion, value: suggestion }
        : suggestion;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `suggestion-item${variant === 'actions' ? ' suggestion-item-action' : ''}${suggestionData.className ? ` ${suggestionData.className}` : ''}`;
      item.textContent = suggestionData.label;
      item.style.animation = `slideUpIn 0.2s ease ${index * 50}ms both`;
      if (suggestionData.disabled) {
        item.disabled = true;
      }
      item.addEventListener('click', () => {
        clearSuggestionCountdown();
        if (suggestionData.disabled) return;
        if (suggestionSelectHandler) {
          suggestionSelectHandler(suggestionData.value, suggestionData);
          return;
        }
        chatInput.value = suggestionData.value;
        renderSuggestions([]);
        handleUserInput(suggestionData.value);
      });
      chatSuggestions.appendChild(item);
    });
    chatSuggestions.classList.add('active');
    showSuggestionPanel();
    if (sticky) {
      clearSuggestionCountdown();
      setStatus('');
      return;
    }
    startSuggestionCountdown();
  };

  const updateSuggestions = () => {
    if (emailFlow === 'ASK_CONFIRM') {
      showEmailDecisionSuggestions();
      return;
    }
    if (emailFlow) return;
    const nextSuggestions = getSuggestions(chatInput.value.trim());
    const nextSignature = `default|false|${nextSuggestions.join('||')}`;
    const panelAlreadyActive = chatSuggestionsPanel && chatSuggestionsPanel.classList.contains('active');

    if (panelAlreadyActive && !stickySuggestions && nextSignature === lastSuggestionSignature) {
      return;
    }

    renderSuggestions(nextSuggestions);
  };

  // ── Email flow state machine ──────────────────────────────────────────────
  // States: null | 'ASK_CONFIRM' | 'ASK_SENDER_EMAIL' | 'ASK_SUBJECT' | 'ASK_BODY' | 'SENDING'
  let emailFlow = null;
  let emailData = { senderEmail: '', subject: '', body: '' };

  const isTemplatesPage = window.location.pathname.includes('/templates/');
  const CONTACT_INFO = {
    email: 'dineshkumarnavarasam@gmail.com',
    phone: '', // Add your mobile number here to enable call actions across the site.
    location: 'Chennai, India',
    portfolioUrl: 'https://dineshthalapathy01.github.io/my-portfolio/',
    contactPageUrl: isTemplatesPage ? 'contact.html' : 'templates/contact.html',
  };
  const EMAILJS_CONFIG = {
    publicKey: window.LEO_EMAIL_CONFIG?.publicKey || '',
    serviceId: window.LEO_EMAIL_CONFIG?.serviceId || '',
    templateId: window.LEO_EMAIL_CONFIG?.templateId || '',
  };

  const hasRealConfigValue = (value) => typeof value === 'string' && value.trim() !== '' && !/^YOUR_/i.test(value.trim());
  const hasPhoneNumber = () => Boolean(CONTACT_INFO.phone && CONTACT_INFO.phone.trim());
  const normalizePhoneHref = () => `tel:${CONTACT_INFO.phone.replace(/[^\d+]/g, '')}`;
  const isEmailJsConfigured = () => hasRealConfigValue(EMAILJS_CONFIG.publicKey)
    && hasRealConfigValue(EMAILJS_CONFIG.serviceId)
    && hasRealConfigValue(EMAILJS_CONFIG.templateId);
  const normalizeEmail = (value) => value.trim().toLowerCase();
  const isValidEmail = (value) => {
    const email = normalizeEmail(value);
    if (!email || email.length > 254 || email.includes(' ')) return false;
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) return false;
    if (email.includes('..')) return false;
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    if (domain.split('.').some((part) => !part || part.startsWith('-') || part.endsWith('-'))) return false;
    return true;
  };

  const getContactDetailsText = () => {
    const detailLines = [`📧 ${CONTACT_INFO.email}`];
    if (hasPhoneNumber()) {
      detailLines.push(`📱 ${CONTACT_INFO.phone}`);
    }
    detailLines.push(`📍 ${CONTACT_INFO.location}`);
    detailLines.push(`🔗 ${CONTACT_INFO.portfolioUrl}`);
    return detailLines.join('\n');
  };

  const ensureEmailJsInitialized = () => {
    if (emailJsInitialized) return true;
    if (!window.emailjs || !isEmailJsConfigured()) return false;
    window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
    emailJsInitialized = true;
    return true;
  };

  const buildDraftBody = ({ senderEmail, subject, body }) => {
    const normalizedSender = senderEmail ? normalizeEmail(senderEmail) : '';
    const messageBody = body.trim();
    return {
      subject: subject.trim(),
      body: normalizedSender
        ? `${messageBody}\n\nSender email: ${normalizedSender}`
        : messageBody,
    };
  };

  const openMailtoDraft = ({ senderEmail, subject, body }) => {
    const draft = buildDraftBody({ senderEmail, subject, body });
    const mailtoUrl = `mailto:${CONTACT_INFO.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    window.location.href = mailtoUrl;
  };

  const getGmailComposeUrl = ({ senderEmail, subject, body }) => {
    const draft = buildDraftBody({ senderEmail, subject, body });
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: CONTACT_INFO.email,
      su: draft.subject,
      body: draft.body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  const openGmailDraft = (draftData) => {
    const gmailUrl = getGmailComposeUrl(draftData);
    const popup = window.open(gmailUrl, '_blank', 'noopener');
    if (!popup) {
      window.location.href = gmailUrl;
    }
  };

  const lockInput = (placeholder) => {
    chatInput.disabled = true;
    chatInput.placeholder = placeholder;
    if (chatSendButton) chatSendButton.disabled = true;
    renderSuggestions([]);
  };

  const unlockInput = () => {
    chatInput.disabled = false;
    chatInput.placeholder = 'Ask me about my work...';
    if (chatSendButton) chatSendButton.disabled = false;
  };

  const resetEmailFlow = () => {
    emailFlow = null;
    emailData = { senderEmail: '', subject: '', body: '' };
    unlockInput();
    renderSuggestions([]);
  };

  const showStaticPromptChip = (label) => {
    renderSuggestions([{
      label,
      value: label,
      className: 'email-prompt-chip',
      disabled: true,
    }], { sticky: true });
  };

  const handleQuickContactAction = (action) => {
    resetEmailFlow();
    if (action === 'mail') {
      openGmailDraft({
        senderEmail: '',
        subject: '',
        body: '',
      });
      return;
    }
    if (action === 'contact-page') {
      window.location.href = CONTACT_INFO.contactPageUrl;
      return;
    }
    if (action === 'call' && hasPhoneNumber()) {
      window.location.href = normalizePhoneHref();
    }
  };

  const showEmailFallbackSuggestions = (draftData) => {
    renderSuggestions([
      { label: 'Open Gmail Draft', value: 'gmail' },
      { label: 'Open Mail App', value: 'mail-app', className: 'suggestion-item-action-alt' },
    ], {
      sticky: true,
      variant: 'actions',
      onSelect: (value) => {
        if (value === 'gmail') {
          openGmailDraft(draftData);
          return;
        }
        openMailtoDraft(draftData);
      },
    });
  };

  const showEmailDecisionSuggestions = () => {
    const decisionItems = [
      { label: 'Yes, draft email', value: 'yes' },
      { label: 'No, continue chat', value: 'no' },
      { label: 'Email Draft', value: 'mail', className: 'suggestion-item-action-alt' },
      { label: 'Open Contact Page', value: 'contact-page', className: 'suggestion-item-action-alt' },
    ];

    if (hasPhoneNumber()) {
      decisionItems.splice(2, 0, {
        label: 'Call Dinesh',
        value: 'call',
        className: 'suggestion-item-action-alt',
      });
    }

    renderSuggestions(decisionItems, {
      sticky: true,
      variant: 'actions',
      onSelect: (value) => {
        if (value === 'yes' || value === 'no') {
          handleUserInput(value);
          return;
        }
        handleQuickContactAction(value);
      },
    });
  };

  const populateContactDetails = () => {
    const emailLink = document.getElementById('contactEmailLink');
    const phoneItem = document.getElementById('contactPhoneItem');
    const phoneLink = document.getElementById('contactPhoneLink');
    const locationText = document.getElementById('contactLocationText');
    const portfolioLink = document.getElementById('contactPortfolioLink');

    if (emailLink) {
      emailLink.href = `mailto:${CONTACT_INFO.email}`;
      emailLink.textContent = CONTACT_INFO.email;
    }

    if (locationText) {
      locationText.textContent = CONTACT_INFO.location;
    }

    if (portfolioLink) {
      portfolioLink.href = CONTACT_INFO.portfolioUrl;
      portfolioLink.textContent = CONTACT_INFO.portfolioUrl;
    }

    if (phoneItem && phoneLink) {
      if (hasPhoneNumber()) {
        phoneItem.hidden = false;
        phoneLink.href = normalizePhoneHref();
        phoneLink.textContent = CONTACT_INFO.phone;
      } else {
        phoneItem.hidden = true;
      }
    }
  };

  populateContactDetails();

  const showEmailPrompt = (promptText, inputPlaceholder) => {
    appendChatMessage(promptText, 'bot');
    unlockInput();
    chatInput.placeholder = inputPlaceholder;
    showStaticPromptChip(`✏️ ${inputPlaceholder}`);
    chatInput.focus();
  };

  const handleEmailFlow = async (text) => {
    if (emailFlow === 'ASK_CONFIRM') {
      const yes = /^(yes|yeah|sure|ok|okay|send|yep|y)$/i.test(text.trim());
      const no = /^(no|nope|cancel|nah|n)$/i.test(text.trim());
      if (yes) {
        emailFlow = 'ASK_SENDER_EMAIL';
        appendChatMessage(text, 'user');
        chatInput.value = '';
        showEmailPrompt('Share your email address so Dinesh knows where to reply.', 'Type your email address...');
        return true;
      }
      if (no) {
        appendChatMessage(text, 'user');
        chatInput.value = '';
        resetEmailFlow();
        startTypingIndicator();
        setTimeout(() => {
          stopTypingIndicator();
          appendChatMessage('No problem! Feel free to ask anything else.', 'bot');
        }, 1000);
        return true;
      }

      resetEmailFlow();
      return false;
    }

    if (emailFlow === 'ASK_SENDER_EMAIL') {
      if (!text.trim()) return true;
      if (!isValidEmail(text)) {
        appendChatMessage('Please enter a proper email address like name@example.com so Dinesh can reply to you.', 'bot');
        showStaticPromptChip('✏️ Type your email address...');
        return true;
      }
      emailData.senderEmail = normalizeEmail(text);
      emailFlow = 'ASK_SUBJECT';
      appendChatMessage(normalizeEmail(text), 'user');
      chatInput.value = '';
      showEmailPrompt('What is the subject of your email?', 'Type subject here...');
      return true;
    }

    if (emailFlow === 'ASK_SUBJECT') {
      if (!text.trim()) return true;
      emailData.subject = text.trim();
      emailFlow = 'ASK_BODY';
      appendChatMessage(text, 'user');
      chatInput.value = '';
      showEmailPrompt('Got it! Now type your message body:', 'Type your message here...');
      return true;
    }

    if (emailFlow === 'ASK_BODY') {
      if (!text.trim()) return true;
      emailData.body = text.trim();
      emailFlow = 'SENDING';
      appendChatMessage(text, 'user');
      chatInput.value = '';
      lockInput('Sending email...');
      hideSuggestionPanel(true);
      startTypingIndicator();
      let shouldShowDraftFallback = false;
      const draftData = {
        senderEmail: emailData.senderEmail,
        subject: emailData.subject,
        body: emailData.body,
      };
      try {
        if (ensureEmailJsInitialized()) {
          await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
            to_email: CONTACT_INFO.email,
            subject: emailData.subject,
            message: emailData.body,
            from_name: 'Portfolio Visitor',
            from_email: emailData.senderEmail,
            reply_to: emailData.senderEmail,
          });
          stopTypingIndicator();
          appendChatMessage('✅ Email sent successfully! Dinesh will get back to you soon.', 'bot');
        } else {
          stopTypingIndicator();
          shouldShowDraftFallback = true;
          openGmailDraft(draftData);
          appendChatMessage('📨 I opened a Gmail draft with Dinesh\'s email, subject, and message already filled in.', 'bot');
        }
      } catch (err) {
        stopTypingIndicator();
        shouldShowDraftFallback = true;
        openGmailDraft(draftData);
        appendChatMessage(`❌ I could not send it directly, so I opened a Gmail draft with the details already filled in. You can also email Dinesh at ${CONTACT_INFO.email}.`, 'bot');
      }
      resetEmailFlow();
      if (shouldShowDraftFallback) {
        showEmailFallbackSuggestions(draftData);
      }
      return true;
    }

    return false;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const localResponses = (input) => {
    const name = 'S Dinesh Kumar';
    const lower = input.toLowerCase();

    // Exact phrase matching for better relevance
    const exactMatches = [
      { phrase: 'Tell me about the BBOCW project', reply: `BBOCW is the Bihar welfare portal ${name} built with Angular 16, Spring Boot, PostgreSQL, and Aadhaar integration for secure citizen access.` },
      { phrase: 'What technologies do you use?', reply: `${name} specializes in Angular, Java Spring Boot, PostgreSQL, REST APIs, Flutter, and modern full-stack development.` },
      { phrase: 'How did you build the chatbot?', reply: `${name} built the chatbot using Java backend with file handling, content moderation, and quick response processing capabilities.` },
      { phrase: 'Where is your office located?', reply: `${name} works from Chennai, delivering solutions remotely for state government systems and Bihar projects.` },
      { phrase: 'Tell me about the Smart Travellers app', reply: `Smart Travellers is a Flutter app ${name} created for public transport guidance and route planning with real-time navigation support.` },
      { phrase: 'How did you start in full stack development?', reply: `${name} started with Angular frontend fundamentals and expanded to backend services with Spring Boot and database design.` },
      { phrase: 'What is the TNCSC project about?', reply: `TNCSC is an enterprise access control system ${name} developed with role-based permissions, workflow modules, and GCP-hosted infrastructure.` },
      { phrase: 'What skills do you have in Java and Angular?', reply: `${name} uses Spring Boot for APIs in Java; in Angular builds responsive interfaces, state management, and component architecture.` },
      { phrase: 'What is your experience with government systems?', reply: `${name} has 3+ years building government systems like Bihar BBOCW portal and Tamil Nadu TNCSC with enterprise-level requirements.` },
      { phrase: 'How can I contact you?', reply: `You can find ${name}'s contact details on the portfolio homepage under the contact section with email and messaging options.` },
      { phrase: 'What are your contact details?', reply: `You can contact ${name} through the portfolio contact section, where email and messaging options are listed.` },
      { phrase: 'Tell me your resume', reply: `${name} is a Full Stack Developer with 3+ years experience building Angular, Spring Boot, PostgreSQL, REST APIs, Flutter, and government/enterprise systems from Chennai.` },
      { phrase: 'Tell me about your biography', reply: `${name} is a Full Stack Developer focused on enterprise portals, citizen services, mobile travel apps, chatbots, and regression automation since April 2023.` },
      { phrase: 'Where have you worked?', reply: `${name} has worked on government welfare and access systems like BBOCW and TNCSC, plus apps like Smart Travellers, a chatbot, and regression tooling.` },
      { phrase: 'What is your work history?', reply: `${name}'s work history spans full-stack development of web and mobile solutions since April 2023, with strong experience in Angular, Java Spring Boot, and PostgreSQL.` }
    ];

    // Check for exact phrase matches first
    for (const match of exactMatches) {
      if (lower.includes(match.phrase.toLowerCase())) {
        return match.reply;
      }
    }

    // Keyword-based matching for general queries
    const projectMap = [
      { keys: ['bbocw', 'bihar', 'welfare', 'portal'], reply: `BBOCW is the Bihar welfare portal with Angular 16, Spring Boot, PostgreSQL, and Aadhaar integration ${name} created.` },
      { keys: ['tncsc', 'tamil', 'civil', 'supplies', 'access'], reply: `TNCSC is an enterprise access control system ${name} developed with role-based permissions and GCP-hosted services.` },
      { keys: ['chatbot', 'url', 'shortening', 'file'], reply: `${name}'s chatbot handles file processing, content moderation, and quick responses with a Java backend.` },
      { keys: ['regression', 'testing', 'excel', 'automate'], reply: `${name} created the regression testing tool that automates workflows, scheduled processing, and Excel export functionality.` },
      { keys: ['smart', 'travellers', 'transport', 'flutter', 'app'], reply: `Smart Travellers is a Flutter travel app ${name} built for public transport guidance and route planning.` },
    ];

    for (const item of projectMap) {
      if (item.keys.some((key) => lower.includes(key))) {
        return item.reply;
      }
    }

    if (/\b(hi|hello|hey|good morning|good evening)\b/.test(lower)) {
      return `Hello! ${name} has LEO as assistant. What would you like to know?`;
    }
    if (/\b(name|who are you|who is leo)\b/.test(lower)) {
      return `LEO is an AI assistant for ${name}'s full-stack development portfolio.`;
    }
    if (/\b(boss|owner|creator|who made|who created|who built)\b/.test(lower)) {
      return `${name} is a Full Stack Developer with 2+ years of experience in government systems.`;
    }
    if (/\b(profile|about|background)\b/.test(lower)) {
      return `${name} is a Full Stack Developer specializing in Angular, Spring Boot, and enterprise systems.`;
    }
    if (/\b(visitor|visitor count|visitors|site visits|page views|visit count)\b/.test(lower)) {
      // handle visitor queries via remote counts asynchronously
      return '__VISITOR_REMOTE__';
    }
    if (/\b(contact|email|phone|reach you|contact details)\b/.test(lower)) {
      return `__CONTACT_TRIGGER__`;
    }
    if (/\b(resume|cv|bio|biography|career|employment|work history)\b/.test(lower)) {
      return `${name} is a Full Stack Developer with 2+ years of experience in Angular, Java Spring Boot, PostgreSQL, REST APIs, Flutter, and government systems. Key projects include BBOCW, TNCSC, Smart Travellers, chatbot, and regression automation.`;
    }
    if (/\b(project (spec|details|specification|specs)|project information)\b/.test(lower)) {
      return `Project specs cover BBOCW with Angular and Spring Boot, TNCSC with access control and GCP hosting, Smart Travellers with Flutter, plus chatbot and regression tools for government/enterprise workflows.`;
    }
    if (/\b(skill|tech|technology|stack|tools|languages)\b/.test(lower)) {
      return `${name} is expert in Angular, Java Spring Boot, PostgreSQL, REST APIs, Flutter, and modern development patterns.`;
    }
    if (/\b(currently|working|project|ongoing)\b/.test(lower)) {
      return `${name} is currently focused on modern Angular solutions and Spring Boot microservices from Chennai office.`;
    }
    if (/\b(location|city|office|based|work)\b/.test(lower)) {
      return `${name} is based in Chennai with remote delivery for government and enterprise applications.`;
    }
    if (/\b(thank|thanks|appreciate)\b/.test(lower)) {
      return "Thank you! Feel free to ask more about projects or skills.";
    }
    if (/\b(how are you|doing|how is it)\b/.test(lower)) {
      return `Ready to help! Ask about ${name}'s projects, skills, or experience.`;
    }
    return `Ask about ${name}'s projects (BBOCW, TNCSC, Chatbot, Regression, Smart Travellers), skills, or experience.`;
  };

  // ── Real-time AI via Cloudflare Worker proxy (key never in repo) ──────────
  const LEO_WORKER_URL = 'YOUR_CLOUDFLARE_WORKER_URL'; // e.g. https://leo-proxy.yourname.workers.dev
  const MAX_REPLY_CHARS = 750;

  const PORTFOLIO_CONTEXT = `You are LEO, the AI assistant for S Dinesh Kumar's portfolio.
Rules:
- Reply in 1-2 short sentences by default.
- If the answer genuinely needs more detail, reply up to ${MAX_REPLY_CHARS} characters max, then end with: "[Reply limited to ${MAX_REPLY_CHARS} chars. Ask a follow-up for more!]"
- Never exceed ${MAX_REPLY_CHARS} characters total.
- Only answer questions related to Dinesh's portfolio, skills, or projects.
- If unrelated, say: "I can only answer questions about Dinesh's portfolio."
Portfolio facts:
- Name: S Dinesh Kumar, Full Stack Java Developer, 2+ years exp, based in Chennai.
- Company: Eagle Software India Pvt Ltd.
- Skills: Angular (16/19/20), Java Spring Boot, PostgreSQL, Oracle, MySQL, REST APIs, JWT, Spring Security, Microservices, Flutter, GCP, Git.
- Projects: BBOCW (Bihar welfare portal, Angular+Spring Boot+Aadhaar), TNCSC (Tamil Nadu access control, RBAC+GCP), Smart Travellers (Flutter transport app), Chatbot (Java file/content handling), Regression Tool (automated testing+Excel export).
- Contact: dineshkummarnavarasam@gmail.com
- Portfolio URL: https://dineshthalapathy01.github.io/my-portfolio/`;

  const getResponse = async (input) => {
    // Check contact trigger before AI call
    if (/\b(contact|email|phone|reach|contact details)\b/i.test(input)) {
      return '__CONTACT_TRIGGER__';
    }
    // Handle visitor-count queries locally so LEO can reply with the latest stored counts.
    if (/\b(visitor|visitor count|visitors|site visits|page views|visit count)\b/i.test(input)) {
      return '__VISITOR_REMOTE__';
    }
    try {
      const res = await fetch(LEO_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: PORTFOLIO_CONTEXT, message: input }),
      });
      if (!res.ok) throw new Error('worker error');
      const data = await res.json();
      let reply = (data.reply || '').trim();
      if (!reply) return localResponses(input);
      // Enforce char limit with notice
      if (reply.length > MAX_REPLY_CHARS) {
        reply = reply.substring(0, MAX_REPLY_CHARS).trimEnd() +
          `… [Reply limited to ${MAX_REPLY_CHARS} chars. Ask a follow-up for more!]`;
      }
      return reply;
    } catch {
      return localResponses(input);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleUserInput = async (text) => {
    if (!text) return;

    // If email flow is active, route to it first
    if (emailFlow) {
      const handled = await handleEmailFlow(text);
      if (handled) return;
    }

    if (isBotTyping) {
      setStatus('LEO is replying now. Please wait for the answer.');
      setSendButtonTyping(true);
      return;
    }
    if (getBlockRemainingMs() > 0) {
      updateBlockCountdown();
      return;
    }

    let processedText = text;
    const found = badWords.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(text));
    if (found.length > 0) {
      processedText = censorBadWords(text);
      found.forEach((word) => badHashes.add(hashBadWord(word.toLowerCase())));
      warningCount += found.length;
      appendChatMessage(processedText, 'user');
      chatInput.value = '';
      if (chatSuggestions) renderSuggestions([]);
      if (warningCount >= 3) {
        startBlockCountdown(5000);
        appendChatMessage('I masked the bad words as ******. Please wait a few seconds before sending again.', 'bot');
        return;
      } else {
        setStatus('I masked the bad words as ******. Please keep the chat polite.');
        appendChatMessage('I masked the bad words as ******. Please keep the chat polite.', 'bot');
      }
    } else {
      appendChatMessage(processedText, 'user');
      chatInput.value = '';
      if (chatSuggestions) renderSuggestions([]);
    }
    startTypingIndicator();

    const response = await getResponse(processedText);
    const delay = 3000;

    setTimeout(() => {
      stopTypingIndicator();
      if (response === '__CONTACT_TRIGGER__') {
        appendChatMessage(`Here are Dinesh's contact details:\n${getContactDetailsText()}`, 'bot');
        setTimeout(() => {
          emailFlow = 'ASK_CONFIRM';
          appendChatMessage('Would you like to draft an email here, or continue chatting?', 'bot');
          showEmailDecisionSuggestions();
        }, 600);
      } else if (response === '__VISITOR_REMOTE__') {
        // fetch remote counts and daily breakdown, then reply with a scrollable 5-column grid
        (async () => {
          try {
            const [remote, breakdown] = await Promise.all([getRemoteCounts(), getDailyBreakdown()]);
            const local = getVisitorSummary();
            const today = (remote && typeof remote.today === 'number') ? remote.today : local.todayCount;
            const total = (remote && typeof remote.total === 'number') ? remote.total : local.total;

            // build an HTML table for chat: Date | Visitors Count
            const items = (breakdown && Array.isArray(breakdown.breakdown)) ? breakdown.breakdown : [];
            const rowsHtml = items.map(({ date, count }) => {
              const d = new Date(date + 'T00:00:00');
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const yyyy = d.getFullYear();
              const dateStr = `${dd}-${mm}-${yyyy}`;
              return `<tr><td class="vt-date">${dateStr}</td><td class="vt-count">${count}</td></tr>`;
            }).join('');

            const tableHtml = `
              <div class="visitor-summary-html">
                <div class="visitor-summary-header">Visitors count - Today: <strong>${today}</strong>, Total: <strong>${total}</strong></div>
                <div class="visitor-table-wrap">
                  <table class="visitor-table" role="table" aria-label="Daily visitor counts">
                    <thead>
                      <tr><th>Date</th><th>Visitors</th></tr>
                    </thead>
                    <tbody>
                      ${rowsHtml}
                    </tbody>
                  </table>
                </div>
              </div>
            `;

            appendChatHtml(tableHtml, 'bot');
          } catch (err) {
            const local = getVisitorSummary();
            appendChatMessage(`Visitors count - Today: ${local.todayCount}, Total: ${local.total}.`, 'bot');
          }
        })();
      } else {
        appendChatMessage(response, 'bot');
      }
    }, delay);
  };

  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const hideChatWidget = () => {
    if (!chatWidget) return;
    chatWidget.classList.remove('open');
    stopAutoRotate();
    stopTypingIndicator();
    if (chatSuggestionsPanel) {
      hideSuggestionPanel(true);
    }
    updateTogglePromptText();
    window.setTimeout(() => {
      if (chatWidget) {
        chatWidget.style.display = 'none';
      }
    }, 220);
  };

  if (chatCloseBtn) {
    chatCloseBtn.addEventListener('click', hideChatWidget);
  }

  const chatToggleMessages = [
    'Contact Dinesh in one tap.',
    'Let me help you reach Dinesh.',
    'Ask me about projects, skills, or contact details.',
    'Need Dinesh\'s email? I can help.',
    'Want to call or mail Dinesh? Tap here.',
    'I\'m LEO. Let me guide you.',
    'Reach DK faster with the chat assistant.'
  ];

  let togglePromptInterval = null;
  let togglePromptHideTimeout = null;
  const leoTogglePrompt = document.createElement('div');
  leoTogglePrompt.id = 'leoTogglePrompt';
  leoTogglePrompt.className = 'leo-toggle-prompt';

  const getNextToggleMessage = (current) => {
    const candidates = chatToggleMessages.filter((text) => text !== current);
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const updateTogglePromptText = (autoShow = true) => {
    const next = getNextToggleMessage(leoTogglePrompt.textContent || '');
    leoTogglePrompt.textContent = next;
    if (autoShow) {
      setTogglePromptVisibility(true);
      if (togglePromptHideTimeout) {
        window.clearTimeout(togglePromptHideTimeout);
      }
      togglePromptHideTimeout = window.setTimeout(() => {
        setTogglePromptVisibility(false);
      }, 5000);
    }
  };

  const setTogglePromptVisibility = (visible) => {
    if (visible) {
      leoTogglePrompt.classList.add('visible');
    } else {
      leoTogglePrompt.classList.remove('visible');
    }
  };

  const showChat = () => {
    if (!chatWidget) return;
    chatWidget.style.display = 'grid';
    window.requestAnimationFrame(() => {
      chatWidget.classList.add('open');
    });
    setTogglePromptVisibility(false);
    if (togglePromptHideTimeout) {
      window.clearTimeout(togglePromptHideTimeout);
      togglePromptHideTimeout = null;
    }
    if (!chatFirstOpened) {
      showGreetingOnFirstOpen();
    }
  };

  const leoToggleBtn = document.createElement('button');
  leoToggleBtn.id = 'leoToggleBtn';
  leoToggleBtn.type = 'button';
  leoToggleBtn.setAttribute('aria-label', 'Open chat');
  leoToggleBtn.setAttribute('title', 'Open chat');
  leoToggleBtn.className = 'leo-toggle-btn';
  leoToggleBtn.innerHTML = '💬';
  leoToggleBtn.addEventListener('click', showChat);

  // pick an initial random prompt, show it briefly, and rotate every 30s
  updateTogglePromptText();
  document.body.appendChild(leoTogglePrompt);
  document.body.appendChild(leoToggleBtn);
  if (!togglePromptInterval) {
    togglePromptInterval = window.setInterval(() => updateTogglePromptText(true), 30000);
  }

  if (chatWidget) {
    chatWidget.style.flexDirection = 'column';
  }

  if (chatForm && chatInput) {
    const submitChatMessage = () => {
      if (chatInput.disabled) return;
      if (getBlockRemainingMs() > 0) {
        updateBlockCountdown();
        return;
      }
      if (isBotTyping) {
        setStatus('LEO is replying now. Please wait for the answer.');
        setSendButtonTyping(true);
        return;
      }
      if (chatSendButton && chatSendButton.disabled) return;
      handleUserInput(chatInput.value.trim());
    };

    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitChatMessage();
    });

    chatInput.addEventListener('input', updateSuggestions);
    chatInput.addEventListener('focus', updateSuggestions);
    chatInput.addEventListener('blur', () => {
      suggestionHideTimeout = window.setTimeout(() => {
        if (stickySuggestions) return;
        renderSuggestions([]);
        clearSuggestionCountdown();
      }, 120);
    });

    if (chatSuggestions) {
      chatSuggestions.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
    }

    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitChatMessage();
      }
    });
  }
});
