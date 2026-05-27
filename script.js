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
    <aside class="chat-widget" aria-live="polite">
      <div class="chat-widget-header">
        <span class="chat-welcome">LEO</span>
        <p class="chat-subtitle">Portfolio AI assistant</p>
      </div>
      <div class="chat-widget-body" id="chatBody">
        <div class="chat-message bot">
          <p>Hi, I’m LEO. Ask about my projects or skills.</p>
        </div>
      </div>
      <div class="chat-widget-footer">
        <form id="chatForm">
          <div class="chat-input-wrapper">
            <input id="chatInput" type="text" placeholder="Ask me about my work..." autocomplete="off" />
            <div class="chat-suggestions" id="chatSuggestions"></div>
          </div>
          <button type="submit">Send</button>
        </form>
        <div class="chat-status" id="chatStatus"></div>
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

  const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap', 'idiot'];
  const badHashes = new Set();
  let warningCount = 0;
  let blockUntil = null;

  const hashBadWord = (word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i += 1) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    return hash;
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

  const setStatus = (text) => {
    if (chatStatus) chatStatus.textContent = text;
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
    'How can I contact you?'
  ];

  const chatSuggestions = document.getElementById('chatSuggestions');
  let suggestionHideTimeout = null;
  let typingInterval = null;

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startTypingIndicator = () => {
    if (!chatStatus) return;
    if (typingInterval) {
      window.clearInterval(typingInterval);
    }
    let dots = '';
    chatStatus.textContent = `LEO is typing • ${formatTime()}`;
    typingInterval = window.setInterval(() => {
      dots = dots.length < 3 ? dots + '.' : '';
      if (chatStatus) {
        chatStatus.textContent = `LEO is typing${dots} • ${formatTime()}`;
      }
    }, 500);
  };

  const stopTypingIndicator = () => {
    if (typingInterval) {
      window.clearInterval(typingInterval);
      typingInterval = null;
    }
    if (chatStatus) {
      chatStatus.textContent = `Answered at ${formatTime()}`;
      window.setTimeout(() => {
        if (chatStatus && chatStatus.textContent.startsWith('Answered')) {
          chatStatus.textContent = '';
        }
      }, 2600);
    }
  };

  const getSuggestions = (query) => {
    const lower = query.toLowerCase();
    const filtered = suggestionPool.filter((item) => !query || item.toLowerCase().includes(lower));
    return filtered.sort(() => 0.5 - Math.random()).slice(0, 4);
  };

  const renderSuggestions = (items) => {
    if (!chatSuggestions) return;
    chatSuggestions.innerHTML = '';
    if (!items.length) {
      chatSuggestions.classList.remove('active');
      return;
    }
    items.forEach((suggestion) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'suggestion-item';
      item.textContent = suggestion;
      item.addEventListener('click', () => {
        chatInput.value = suggestion;
        renderSuggestions([]);
        handleUserInput(suggestion);
      });
      chatSuggestions.appendChild(item);
    });
    chatSuggestions.classList.add('active');
  };

  const updateSuggestions = () => {
    renderSuggestions(getSuggestions(chatInput.value.trim()));
  };

  const localResponses = (input) => {
    const lower = input.toLowerCase();
    const projectMap = [
      { keys: ['bbocw', 'bihar'], reply: 'BBOCW is a completed Bihar welfare portal delivered with Angular 16, Spring Boot, PostgreSQL and Aadhaar integration.' },
      { keys: ['tncsc', 'tamil nadu', 'civil supplies'], reply: 'TNCSC is an enterprise access control app with RBAC, workflow modules and GCP-hosted services.' },
      { keys: ['chatbot application', 'chatbot', 'url shortening'], reply: 'My chatbot app handles files, content moderation and quick responses with a Java backend.' },
      { keys: ['regression', 'regression testing', 'excel'], reply: 'The regression tool automates file workflows, scheduled processing, secure sessions and Excel exports.' },
      { keys: ['smart travellers', 'transport', 'flutter'], reply: 'Smart Travellers is a Flutter travel app for public transport guidance and route planning.' },
    ];
    for (const item of projectMap) {
      if (item.keys.some((key) => lower.includes(key))) {
        return item.reply;
      }
    }
    if (/\b(hi|hello|hey|good morning|good evening)\b/.test(lower)) {
      return "Hello. I am LEO, assistant for S Dinesh Kumar. What would you like to know?";
    }
    if (/\b(name|who are you|who is leo)\b/.test(lower)) {
      return "I'm LEO, an AI assistant for S Dinesh Kumar's portfolio.";
    }
    if (/\b(boss|owner|creator|who made|who created|who built|who is your boss)\b/.test(lower)) {
      return "I'm built for S Dinesh Kumar, a Full Stack Developer with 2+ years of experience.";
    }
    if (/\b(profile|about.*profile|tell me about.*profile)\b/.test(lower)) {
      return "S Dinesh Kumar is a Full Stack Developer specializing in Angular, Spring Boot, and government systems.";
    }
    if (/\b(skill|tech|technology|stack|tools)\b/.test(lower)) {
      return "S Dinesh Kumar works with Angular, Java Spring Boot, PostgreSQL, REST APIs and modern frontend flows.";
    }
    if (/\b(currently working|working now|at office|current project|ongoing project)\b/.test(lower)) {
      return "The Bihar portal is completed and delivered; current work is focused on modern Angular and Spring Boot solutions from Chennai.";
    }
    if (/\b(location|chennai|bihar|patna|office)\b/.test(lower)) {
      return "S Dinesh Kumar works from Chennai, with remote delivery for Bihar and state government apps.";
    }
    if (/\b(thank|thanks)\b/.test(lower)) {
      return "You are welcome. Ask one more thing if you like.";
    }
    if (/\b(how are you|how is it going)\b/.test(lower)) {
      return "I'm ready and responsive, just ask about S Dinesh Kumar's projects or skills.";
    }
    return "I keep replies short and helpful. Try asking about S Dinesh Kumar or his projects.";
  };

  const getResponse = async (input) => {
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1', {
        headers: { Authorization: 'Bearer YOUR_HUGGINGFACE_TOKEN' },
        method: 'POST',
        body: JSON.stringify({ inputs: `You are LEO, a friendly portfolio AI assistant for S Dinesh Kumar's portfolio. Keep replies SHORT (1-2 sentences max). Portfolio context: BBOCW (Bihar welfare portal), TNCSC (Tamil Nadu access control), Chatbot (file & content handling), Regression (testing tool), Smart Travellers (transport app). User profile: S Dinesh Kumar is a Full Stack Developer with 2+ years of experience. User: ${input}` }),
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      let text = data?.[0]?.generated_text || '';
      text = text.replace(/.*?User:/, '').trim().split('\n')[0].substring(0, 150);
      return text || localResponses(input);
    } catch {
      return localResponses(input);
    }
  };

  const handleUserInput = async (text) => {
    if (!text) return;
    const now = Date.now();
    if (blockUntil && now < blockUntil) {
      setStatus('You are blocked for 5 seconds. Please wait.');
      appendChatMessage('I’m blocked for a moment. I will be back soon.', 'bot');
      return;
    }

    const found = badWords.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(text));
    if (found.length > 0) {
      found.forEach((word) => badHashes.add(hashBadWord(word.toLowerCase())));
      warningCount += found.length;
      if (warningCount >= 3) {
        blockUntil = now + 5000;
        setStatus('Blocked for 5 seconds. Do not repeat that.');
        appendChatMessage('Stop using rude words. Wait 5 seconds before sending again.', 'bot');
      } else {
        setStatus('Please keep the chat polite. One more warning and I block input.');
        appendChatMessage('I prefer polite language. Please try again.', 'bot');
      }
      return;
    }

    appendChatMessage(text, 'user');
    chatInput.value = '';
    if (chatSuggestions) renderSuggestions([]);
    startTypingIndicator();

    const response = await getResponse(text);
    const delay = Math.min(1200, response.length * 35 + 200);

    setTimeout(() => {
      appendChatMessage(response, 'bot');
      stopTypingIndicator();
    }, delay);
  };

  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleUserInput(chatInput.value.trim());
    });

    chatInput.addEventListener('input', updateSuggestions);
    chatInput.addEventListener('focus', updateSuggestions);
    chatInput.addEventListener('click', updateSuggestions);
    chatInput.addEventListener('blur', () => {
      suggestionHideTimeout = window.setTimeout(() => renderSuggestions([]), 120);
    });

    if (chatSuggestions) {
      chatSuggestions.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
    }

    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleUserInput(chatInput.value.trim());
      }
    });
  }
});
