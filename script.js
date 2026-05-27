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

  const hashBadWord = (word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i += 1) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  };

  const showGreetingOnFirstOpen = () => {
    if (chatFirstOpened) return;
    chatFirstOpened = true;
    const now = new Date();
    const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const greeting = `Hi, I'm LEO! Today is ${dateStr}, ${timeStr}. Ask about my projects or skills.`;
    appendChatMessage(greeting, 'bot');
  };

  const startAutoRotate = () => {
    if (autoRotateInterval) window.clearInterval(autoRotateInterval);
    if (messageAutoRotateTimeout) window.clearTimeout(messageAutoRotateTimeout);

    const messages = chatBody.querySelectorAll('.chat-message.bot');
    if (messages.length === 0) return;

    currentMessageIndex = currentMessageIndex % messages.length;
    let remainingTime = 5000;

    const updateCountdown = () => {
      remainingTime -= 100;
      if (remainingTime <= 0) {
        remainingTime = 5000;
        currentMessageIndex = (currentMessageIndex + 1) % messages.length;
        messages.forEach((msg, idx) => {
          msg.style.display = idx === currentMessageIndex ? 'block' : 'none';
        });
      }
      const seconds = Math.ceil(Math.max(0, remainingTime) / 1000);
      setStatus(`Auto-switching in ${seconds} seconds...`);
    };

    messages.forEach((msg, idx) => {
      msg.style.display = idx === currentMessageIndex ? 'block' : 'none';
    });
    setStatus('Auto-switching in 5 seconds...');
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
    
    if (type === 'bot') {
      startAutoRotate();
    }
    
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
  let suggestionChangeInterval = null;
  let typingInterval = null;

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  let typingMessage = null;

  const startTypingIndicator = () => {
    if (typingInterval) {
      window.clearInterval(typingInterval);
    }
    typingMessage = appendChatMessage('LEO is typing...', 'typing');
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
    if (typingMessage) {
      typingMessage.remove();
      typingMessage = null;
    }
  };

  const getSuggestions = (query) => {
    const lower = query.toLowerCase();
    let filtered = suggestionPool.filter((item) => !query || item.toLowerCase().includes(lower));
    
    if (!query && filtered.length > 0) {
      filtered.sort(() => Math.random() - 0.5);
    }
    
    return filtered.slice(0, 1);
  };

  const renderSuggestions = (items) => {
    if (!chatSuggestions) return;
    chatSuggestions.innerHTML = '';
    if (!items.length) {
      chatSuggestions.classList.remove('active');
      if (suggestionChangeInterval) {
        window.clearInterval(suggestionChangeInterval);
        suggestionChangeInterval = null;
      }
      return;
    }
    items.forEach((suggestion, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'suggestion-item';
      item.textContent = suggestion;
      item.style.animation = `slideUpIn 0.2s ease ${index * 50}ms both`;
      item.addEventListener('click', () => {
        chatInput.value = suggestion;
        if (suggestionChangeInterval) {
          window.clearInterval(suggestionChangeInterval);
          suggestionChangeInterval = null;
        }
        renderSuggestions([]);
        handleUserInput(suggestion);
      });
      chatSuggestions.appendChild(item);
    });
    chatSuggestions.classList.add('active');

    if (suggestionChangeInterval) {
      window.clearInterval(suggestionChangeInterval);
    }
    
    suggestionChangeInterval = window.setInterval(() => {
      const newSuggestions = getSuggestions(chatInput.value.trim());
      if (newSuggestions.length > 0) {
        renderSuggestions(newSuggestions);
      }
    }, 2000);
  };

  const updateSuggestions = () => {
    renderSuggestions(getSuggestions(chatInput.value.trim()));
  };

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
      { phrase: 'What is your experience with government systems?', reply: `${name} has 2+ years building government systems like Bihar BBOCW portal and Tamil Nadu TNCSC with enterprise-level requirements.` },
      { phrase: 'How can I contact you?', reply: `You can find ${name}'s contact details on the portfolio homepage under the contact section with email and messaging options.` }
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

  const chatCloseBtn = document.getElementById('chatCloseBtn');
  if (chatCloseBtn) {
    chatCloseBtn.addEventListener('click', () => {
      if (chatWidget) {
        chatWidget.style.display = 'none';
        stopAutoRotate();
      }
    });
  }

  const showChat = () => {
    if (chatWidget) {
      chatWidget.style.display = 'flex';
      if (!chatFirstOpened) {
        showGreetingOnFirstOpen();
      }
    }
  };

  const leoToggleBtn = document.createElement('button');
  leoToggleBtn.id = 'leoToggleBtn';
  leoToggleBtn.type = 'button';
  leoToggleBtn.setAttribute('aria-label', 'Open chat');
  leoToggleBtn.innerHTML = '💬';
  leoToggleBtn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #007bff; color: white; border: none; border-radius: 50%; width: 54px; height: 54px; cursor: pointer; font-size: 22px; z-index: 999; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
  leoToggleBtn.addEventListener('click', showChat);
  document.body.appendChild(leoToggleBtn);

  if (chatWidget) {
    chatWidget.style.flexDirection = 'column';
  }

  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleUserInput(chatInput.value.trim());
    });

    chatInput.addEventListener('input', updateSuggestions);
    chatInput.addEventListener('focus', updateSuggestions);
    chatInput.addEventListener('click', updateSuggestions);
    chatInput.addEventListener('blur', () => {
      suggestionHideTimeout = window.setTimeout(() => {
        renderSuggestions([]);
        if (suggestionChangeInterval) {
          window.clearInterval(suggestionChangeInterval);
          suggestionChangeInterval = null;
        }
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
        handleUserInput(chatInput.value.trim());
      }
    });
  }
});
