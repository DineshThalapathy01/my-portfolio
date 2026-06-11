// Simple client-side ATS checks. Operates on pasted plain text.
(function(){
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

  document.addEventListener('DOMContentLoaded', function(){
    var run = document.getElementById('runChecks');
    var clear = document.getElementById('clearText');
    var ta = document.getElementById('resumeText');
    var out = document.getElementById('results');
    if(!run||!ta||!out) return;
    run.addEventListener('click', function(){
      var text = ta.value || '';
      if(!text.trim()){ out.innerHTML = '<em>Paste resume text first.</em>'; return; }
      var r = runChecks(text);
      renderResults(r, out);
    });
    clear.addEventListener('click', function(){ ta.value=''; out.innerHTML=''; });
  });
})();
