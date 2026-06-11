// Simple client-side ATS checks. Operates on pasted plain text.
(function(){
  // If pdf.js is available, it will be used for PDF text extraction.
  const pdfjs = window['pdfjsLib'];

  function findEmail(text){
    var m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig);
    return m ? m[0] : null;
  }
  function findPhone(text){
    var m = text.match(/(\+?\d[\d \-()]{6,}\d)/g);
    if(!m) return null;
    // prefer longer numeric-looking tokens
    m.sort(function(a,b){return b.replace(/\D/g,'').length - a.replace(/\D/g,'').length;});
    return m[0];
  }
  function countWords(text){
    return (text.replace(/\s+/g,' ').trim().length===0)?0:text.trim().split(/\s+/).length;
  }
  function hasHeadings(text){
    var headings = ['experience','education','skills','projects','summary','contact','certification'];
    var found = [];
    var lower = text.toLowerCase();
    headings.forEach(function(h){ if(lower.indexOf(h) !== -1) found.push(h); });
    return found;
  }

  function runChecks(text){
    var res = [];
    var email = findEmail(text);
    if(email) res.push({ok:true, msg:'Email found: '+email}); else res.push({ok:false, msg:'No email address detected.'});
    var phone = findPhone(text);
    if(phone) res.push({ok:true, msg:'Phone number found: '+phone}); else res.push({ok:false, msg:'No phone number detected.'});

    var wc = countWords(text);
    if(wc < 200) res.push({ok:false, msg:'Short resume — only '+wc+' words. Aim for 400–800 words for rich ATS keyword coverage.'}); else if(wc>2500) res.push({ok:false,msg:'Very long resume — '+wc+' words. Consider trimming to 1–2 pages.'}); else res.push({ok:true,msg:'Word count: '+wc});

    var headings = hasHeadings(text);
    if(headings.length >=3) res.push({ok:true,msg:'Found sections: '+headings.join(', ')}); else res.push({ok:false,msg:'Missing common sections. Found: '+(headings.length?headings.join(', '):'none')});

    // simple keyword density check for 'skills' and common tech keywords
    var keywords = ['java','spring','angular','sql','postgres','microservice','rest','api','aws','docker','kubernetes','git'];
    var lower = text.toLowerCase();
    var foundK = keywords.filter(function(k){ return lower.indexOf(k) !== -1; });
    if(foundK.length >= 3) res.push({ok:true,msg:'Relevant technical keywords present: '+foundK.slice(0,8).join(', ')}); else res.push({ok:false,msg:'Few technical keywords detected: '+(foundK.length?foundK.join(', '):'none')});

    // bullets and headings style
    var bullets = (text.match(/[\u2022\-\*]\s+/g) || []).length;
    if(bullets >= 4) res.push({ok:true,msg:'Bullet points detected ('+bullets+') — good for ATS parsing.'}); else res.push({ok:false,msg:'Few bullet points detected. Use bullets for responsibilities and achievements.'});

    return res;
  }

  function computeScore(text){
    // weights (total 100): email 10, phone 10, wordcount 20, headings 20, keywords 25, bullets 15
    var score = 0;
    var email = findEmail(text) ? 10 : 0;
    var phone = findPhone(text) ? 10 : 0;
    var wc = countWords(text);
    var wcScore = 0;
    if(wc >= 400 && wc <= 1500) wcScore = 20; else if (wc >= 250) wcScore = 12; else if (wc >= 150) wcScore = 6; else wcScore = 0;
    var headingsFound = hasHeadings(text).length;
    var headingsScore = Math.min(20, Math.round((headingsFound/5)*20));
    var keywords = ['java','spring','angular','sql','postgres','microservice','rest','api','aws','docker','kubernetes','git'];
    var lower = text.toLowerCase();
    var foundK = keywords.filter(function(k){ return lower.indexOf(k) !== -1; });
    var keywordsScore = Math.min(25, Math.round((foundK.length/keywords.length)*25));
    var bullets = (text.match(/[\u2022\-\*]\s+/g) || []).length;
    var bulletsScore = Math.min(15, Math.round(Math.min(bullets,6)/6*15));

    score = email + phone + wcScore + headingsScore + keywordsScore + bulletsScore;
    return {score: score, breakdown:{email,phone,wcScore,headingsScore,keywordsScore,bulletsScore,foundK}};
  }

  function renderScore(scoreObj, scoreEl, barEl){
    scoreEl.textContent = scoreObj.score + ' / 100';
    barEl.style.width = Math.max(0, Math.min(100, scoreObj.score)) + '%';
  }

  // Call OpenAI Chat Completions to get an ATS-style structured response.
  function callOpenAIForATS(text, apiKey){
    var system = "You are an ATS scoring assistant. Given a resume plaintext, return a JSON object with keys: score (0-100 integer), suggestions (array of short actionable strings), summaries (optional short summary). Respond with ONLY valid JSON.";
    var user = "ResumeText:\n" + text.slice(0, 24000); // limit size
    var payload = {
      model: 'gpt-4o-mini',
      messages: [
        {role:'system', content: system},
        {role:'user', content: user}
      ],
      temperature: 0.2,
      max_tokens: 600
    };

    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(payload)
    }).then(function(r){
      if(!r.ok) return r.text().then(function(t){ throw new Error('OpenAI error: '+t); });
      return r.json();
    }).then(function(j){
      var content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      return content;
    });
  }

  function renderResults(results, container){
    container.innerHTML = '';
    results.forEach(function(r){
      var d = document.createElement('div');
      d.style.padding = '.4rem .2rem';
      d.style.borderBottom = '1px solid #eee';
      d.style.color = r.ok ? '#0b6623' : '#7a1f1f';
      d.textContent = (r.ok? 'OK: ' : 'Fix: ') + r.msg;
      container.appendChild(d);
    });
  }

  // PDF extraction utility
  function extractTextFromPDFArrayBuffer(arrBuf){
    if(!pdfjs) return Promise.reject(new Error('pdf.js not available'));
    return pdfjs.getDocument({data:arrBuf}).promise.then(function(pdf){
      var max = pdf.numPages;
      var seq = [];
      for(var i=1;i<=max;i++){
        seq.push(pdf.getPage(i).then(function(page){
            return page.getTextContent().then(function(tc){
              return tc.items.map(function(it){ return it.str; }).join(' ');
            });
        }));
      }
      return Promise.all(seq).then(function(pages){ return pages.join('\n'); });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var run = document.getElementById('runChecks');
    var clear = document.getElementById('clearText');
    var ta = document.getElementById('resumeText');
    var out = document.getElementById('results');
    var pdfInput = document.getElementById('pdfInput');
    var scoreValue = document.getElementById('scoreValue');
    var scoreBar = document.getElementById('scoreBar');
    var iframe = document.getElementById('resumeIframe');

    function runAllOnText(text){
      ta.value = text;
      var r = runChecks(text);
      renderResults(r, out);
      var s = computeScore(text);
      renderScore(s, scoreValue, scoreBar);
    }

    if(pdfInput){
      pdfInput.addEventListener('change', function(e){
        var f = e.target.files && e.target.files[0];
        if(!f) return;
        var reader = new FileReader();
        reader.onload = function(ev){
          var arr = ev.target.result;
          extractTextFromPDFArrayBuffer(arr).then(function(text){
            runAllOnText(text);
            // update iframe to show uploaded PDF using object URL
            try{ var url = URL.createObjectURL(f); iframe.src = url; }catch(e){}
          }).catch(function(err){
            out.innerHTML = '<div style="color:#7a1f1f">PDF parsing failed: '+(err.message||err)+'</div>';
          });
        };
        reader.readAsArrayBuffer(f);
      });
    }

    // provider / API key UI
    var providerSel = document.getElementById('providerSelect');
    var apiKeyInput = document.getElementById('apiKeyInput');
    var saveKey = document.getElementById('saveKey');
    // restore session key if saved
    try{
      var saved = sessionStorage.getItem('resume_checker_api_key');
      if(saved) apiKeyInput.value = saved;
    }catch(e){}

    // when provider changes, clear any existing API key and results
    // and hide/show the API key form depending on provider
    var apiKeyForm = document.getElementById('apiKeyForm');
    function updateApiKeyFormVisibility(){
      if(!apiKeyForm) return;
      if(providerSel && providerSel.value === 'local') apiKeyForm.style.display = 'none';
      else apiKeyForm.style.display = 'block';
    }
    // initial visibility
    updateApiKeyFormVisibility();

    providerSel.addEventListener('change', function(){
      try{ apiKeyInput.value = ''; }catch(e){}
      try{ if(saveKey) saveKey.checked = false; }catch(e){}
      try{ out.innerHTML = ''; }catch(e){}
      try{ scoreValue.textContent = '—'; scoreBar.style.width = '0%'; }catch(e){}
      updateApiKeyFormVisibility();
    });

    function saveApiKeyIfNeeded(){
      try{
        if(saveKey && saveKey.checked){ sessionStorage.setItem('resume_checker_api_key', apiKeyInput.value || ''); }
      }catch(e){}
    }

    if(!run||!ta||!out) return;

    // helper to fetch and parse the site's PDF file
    function fetchSitePDFAndRun(){
      var pdfPath = 'S Dinesh Kumar.pdf';
      var encoded = encodeURI(pdfPath);
      out.innerHTML = '<div style="color:#0e5f5a">Fetching site resume for ATS check…</div>';
      return fetch(encoded).then(function(r){ if(!r.ok) throw new Error('Failed to fetch site PDF'); return r.arrayBuffer(); }).then(function(arr){
        return extractTextFromPDFArrayBuffer(arr).then(function(text){
          try{ iframe.src = encoded; }catch(e){}
          runAllOnText(text);
          return text;
        });
      }).catch(function(err){ out.innerHTML = '<div style="color:#7a1f1f">PDF parsing failed: '+(err.message||err)+'</div>'; throw err; });
    }

    // factor out external call so we can invoke after site-pdf run
    function maybeCallExternal(text){
      var key = apiKeyInput && apiKeyInput.value && apiKeyInput.value.trim();
      var provider = providerSel && providerSel.value;
      if(!provider || provider === 'local') return; // no external call for local
      if(provider === 'openai'){
        if(!key){ var msg = document.createElement('div'); msg.style.color='#7a1f1f'; msg.style.marginTop='.5rem'; msg.textContent = 'OpenAI key required for external check.'; out.appendChild(msg); return; }
        var statusBox = document.createElement('div');
        statusBox.style.marginTop = '.5rem';
        statusBox.style.padding = '.5rem';
        statusBox.style.borderTop = '1px dashed rgba(15,79,84,0.06)';
        statusBox.style.background = 'rgba(31,157,148,0.02)';
        statusBox.textContent = 'Running external ATS check (OpenAI)...';
        out.appendChild(statusBox);
        callOpenAIForATS(text, key).then(function(result){
          var box = document.createElement('div');
          box.style.marginTop = '.6rem';
          box.style.padding = '.6rem';
          box.style.borderTop = '1px dashed #ddd';
          try{
            var parsed = typeof result === 'string' ? JSON.parse(result) : result;
            box.innerHTML = '<strong>LLM ATS Score:</strong> '+(parsed.score||'—')+' / 100';
            if(parsed.suggestions && parsed.suggestions.length){
              box.innerHTML += '<ul style="margin-top:.4rem">'+parsed.suggestions.map(function(s){return '<li>'+s+'</li>';}).join('')+'</ul>';
            } else if(parsed.summaries){
              box.innerHTML += '<pre style="white-space:pre-wrap">'+(parsed.summaries||'')+'</pre>';
            }
          }catch(e){
            box.innerHTML = '<strong>LLM response (raw):</strong><pre style="white-space:pre-wrap">'+String(result)+'</pre>';
          }
          try{ out.replaceChild(box, statusBox); }catch(e){ out.appendChild(box); }
        }).catch(function(err){
          try{ statusBox.textContent = 'External ATS failed: ' + (err && err.message ? err.message : String(err)); statusBox.style.color = '#7a1f1f'; }
          catch(e){ out.appendChild(document.createTextNode('External ATS failed')); }
        });
        return;
      }
      // other provider placeholders
      out.innerHTML += '<div style="color:#7a1f1f;margin-top:.5rem">Selected provider ('+provider+') is not yet implemented. Use Local or OpenAI.</div>';
    }

    run.addEventListener('click', function(){
      var text = ta.value || '';
      saveApiKeyIfNeeded();
      var finish = function(text){ runAllOnText(text); return text; };
      if(!text.trim()){
        fetchSitePDFAndRun().then(function(text){ maybeCallExternal(text); }).catch(function(){});
      } else {
        finish(text);
        maybeCallExternal(text);
      }
    });

    clear.addEventListener('click', function(){ ta.value=''; out.innerHTML=''; scoreValue.textContent='—'; scoreBar.style.width='0%'; });
  });
})();
