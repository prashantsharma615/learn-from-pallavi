/* =========================================================
   Learn from Pallavi Gupta — App Logic
   Landing page, student login (works on any device),
   lessons, quizzes, class tests, and Admin Portal.
   ========================================================= */

const KEYS = { lang:"lpg_lang", students:"lpg_students", admin:"lpg_admin", session:"lpg_session", prog:"lpg_prog_" };
const CLASS_COLORS = {1:"#ff6b6b",2:"#4d96ff",3:"#2ec4a6",4:"#9b5de5",5:"#f08a24"};

/* ---------- Storage (falls back to memory if browser storage is blocked) ---------- */
const MEM = {};
const store = {
  get(k, fallback){ try{ const v = localStorage.getItem(k); if(v) return JSON.parse(v); }catch(e){} return k in MEM ? JSON.parse(MEM[k]) : fallback; },
  set(k, v){ MEM[k] = JSON.stringify(v); try{ localStorage.setItem(k, MEM[k]); }catch(e){} },
  del(k){ delete MEM[k]; try{ localStorage.removeItem(k); }catch(e){} }
};
const getStudents = () => store.get(KEYS.students, []);
const saveStudents = s => store.set(KEYS.students, s);
const adminHash = (user, pass) => cyrb53(`lpg-admin|${user.trim().toLowerCase()}|${pass}`, 99).toString(36);
function checkAdmin(user, pass){
  const h = adminHash(user, pass);
  const local = store.get(KEYS.admin, null);            // password changed on this device (before redeploy)
  return h === CONFIG.adminHash || (local && local.hash === h);
}
const getProgress = login => store.get(KEYS.prog + login, {});
const saveProgress = (login, p) => store.set(KEYS.prog + login, p);

/* ---------- Utilities ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2600); }
function showScreen(id){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); $(id).classList.add("active"); window.scrollTo(0,0); }
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "हमेशा";
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const stars = (score,total) => total ? (score===total?"⭐⭐⭐": score>=total*0.6?"⭐⭐": score>0?"⭐":"") : "";
const prettyName = login => { const n = login.replace(/[0-9._-]+/g," ").trim(); return n ? n.charAt(0).toUpperCase()+n.slice(1) : login; };

/* =========================================================
   ACCESS CODES — passwords that work on every device
   Password (8 chars) = class(1) + validity(2) + signature(5)
   The signature is made from CONFIG.secret, so only the admin
   portal can create valid passwords.
   ========================================================= */
const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";
const SIG_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function cyrb53(str, seed=0){
  let h1=0xdeadbeef^seed, h2=0x41c6ce57^seed;
  for(let i=0;i<str.length;i++){ const ch=str.charCodeAt(i); h1=Math.imul(h1^ch,2654435761); h2=Math.imul(h2^ch,1597334677); }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return 4294967296*(2097151&h2)+(h1>>>0);
}
function signature(login, cls, exp){
  let n = cyrb53(`${CONFIG.secret}|${login.toLowerCase()}|${cls}|${exp}`, 7), s = "";
  for(let i=0;i<5;i++){ s += SIG_CHARS[n % SIG_CHARS.length]; n = Math.floor(n / SIG_CHARS.length); }
  return s;
}
function expiryToCode(dateStr){            // "2027-11-30" -> 2 chars; null -> "zz"
  if(!dateStr) return "zz";
  const [y,m] = dateStr.split("-").map(Number);
  const n = (y-2025)*12 + (m-1);
  return B36[Math.floor(n/36)] + B36[n%36];
}
function codeToExpiry(code){                // last day of the encoded month
  if(code==="zz") return null;
  const n = B36.indexOf(code[0])*36 + B36.indexOf(code[1]);
  if(n<0) return null;
  const y = 2025 + Math.floor(n/12), m = n%12;
  const last = new Date(Date.UTC(y, m+1, 0));
  return last.toISOString().slice(0,10);
}
function validityEnd(months){
  if(!Number(months)) return null;
  const d = new Date(); d.setMonth(d.getMonth() + Number(months));
  return new Date(Date.UTC(d.getFullYear(), d.getMonth()+1, 0)).toISOString().slice(0,10);
}
function makePassword(login, cls, expiry){
  const exp = expiryToCode(expiry);
  return String(cls) + exp + signature(login, String(cls), exp);
}
function checkPassword(login, pass){
  pass = (pass||"").trim().toLowerCase();
  if(pass.length!==8 || !"012345".includes(pass[0])) return null;
  const cls = pass[0], exp = pass.slice(1,3);
  if(signature(login, cls, exp) !== pass.slice(3)) return null;
  return { cls: cls==="0" ? 1 : Number(cls), allClasses: cls==="0", expiry: codeToExpiry(exp) };
}
const isBlockedEverywhere = login => (CONFIG.blocked||[]).map(x=>String(x).toLowerCase()).includes(login.toLowerCase());

/* ---------- In-page dialogs (no browser pop-ups) ---------- */
function openModal(html){ $("modalBody").innerHTML = html; $("modal").classList.remove("hidden"); }
function closeModal(){ $("modal").classList.add("hidden"); }
$("modal").addEventListener("click", e => { if(e.target.id==="modal") closeModal(); });
function askConfirm(msg, onYes){
  openModal(`<p class="m-msg">${esc(msg)}</p><div class="row end"><button class="btn ghost" id="mNo">रद्द करें</button><button class="btn primary" id="mYes">हाँ</button></div>`);
  $("mNo").onclick = closeModal; $("mYes").onclick = () => { closeModal(); onYes(); };
}
function copyText(txt){
  const done = () => toast("📋 कॉपी हो गया");
  if(navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done));
  else fallbackCopy(txt, done);
}
function fallbackCopy(txt, done){
  const t=document.createElement("textarea"); t.value=txt; document.body.appendChild(t); t.select();
  try{ document.execCommand("copy"); done(); }catch(e){ toast("कृपया text चुनकर कॉपी करें"); }
  t.remove();
}
function showText(title, txt, extraHtml=""){
  openModal(`<h3>${esc(title)}</h3><textarea id="mText" readonly>${esc(txt)}</textarea>${extraHtml}
    <div class="row end"><button class="btn ghost" id="mClose">बंद करें</button><button class="btn primary" id="mCopy">📋 Copy</button></div>`);
  $("mClose").onclick = closeModal;
  $("mCopy").onclick = () => copyText($("mText").value);
}

/* =========================================================
   LANDING PAGE
   ========================================================= */
function renderLanding(){
  $("year").textContent = new Date().getFullYear();
  if(CONFIG.tagline) document.querySelector(".hero .pill").textContent = "📚 " + CONFIG.tagline;
  $("classCards").innerHTML = [1,2,3,4,5].map(c => {
    const list = TOPICS.filter(t=>t.cls===c);
    return `<div class="class-card" style="--c:${CLASS_COLORS[c]}">
      <div class="cc-head"><b>Class ${c}</b><span>${list.length} टॉपिक्स</span></div>
      <ul>${list.map(t=>`<li>${esc(t.title)}</li>`).join("")}</ul></div>`;
  }).join("");

  const wa = String(CONFIG.whatsapp||"").replace(/\D/g,"");
  const items = [];
  if(wa) items.push(`<a class="contact-item wa" href="https://wa.me/${wa}?text=${encodeURIComponent("नमस्ते, मुझे Learn from Pallavi Gupta में admission के बारे में जानकारी चाहिए।")}" target="_blank" rel="noopener">💬 WhatsApp पर बात करें</a>`);
  if(CONFIG.phone) items.push(`<a class="contact-item" href="tel:${esc(CONFIG.phone.replace(/\s/g,""))}">📞 ${esc(CONFIG.phone)}</a>`);
  if(CONFIG.email) items.push(`<a class="contact-item" href="mailto:${esc(CONFIG.email)}">✉️ ${esc(CONFIG.email)}</a>`);
  if(CONFIG.city)  items.push(`<span class="contact-item">📍 ${esc(CONFIG.city)}</span>`);
  if(items.length) $("contactBox").innerHTML = items.join("");
  else { $("contact").classList.add("hidden"); $("navContact").classList.add("hidden"); }
}

document.querySelectorAll("[data-open-login]").forEach(b => b.addEventListener("click", e => {
  e.preventDefault(); selectTab(b.dataset.openLogin); showScreen("loginScreen");
}));
$("backToHome").onclick = () => showScreen("landingScreen");
$("demoBtn").onclick = () => {
  current = { login:null, name:"Guest", cls:3, allClasses:false, progress:{}, guest:true };
  $("studentName").textContent = "👀 Demo"; $("studentLogout").textContent = "Login करें";
  showScreen("studentScreen"); openLesson(CONFIG.demoTopic || TOPICS[0].id);
};

/* =========================================================
   LOGIN
   ========================================================= */
function selectTab(name){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.tab===name));
  $("studentLoginForm").classList.toggle("active", name==="student");
  $("adminLoginForm").classList.toggle("active", name==="admin");
  $("loginError").textContent = "";
}
document.querySelectorAll(".tab").forEach(tab => tab.onclick = () => selectTab(tab.dataset.tab));

function resolveStudent(login, pass){
  login = login.trim().toLowerCase();
  if(!login) return { error:"❌ Login ID डालें।" };
  const info = checkPassword(login, pass);
  if(!info) return { error:"❌ Login ID या Password ग़लत है।" };
  const local = getStudents().find(s => s.login.toLowerCase()===login);
  if(isBlockedEverywhere(login) || (local && !local.active)) return { error:"🚫 आपका Access बंद है। कृपया टीचर से संपर्क करें।" };
  if(info.expiry && info.expiry < today()) return { error:"⏰ आपका Access "+fmtDate(info.expiry)+" को समाप्त हो गया। कृपया टीचर से संपर्क करें।" };
  const saved = getProgress(login)._name;
  return { student: { login, name: local?.name || saved || prettyName(login), askName: !local?.name && !saved, ...info } };
}

$("studentLoginForm").onsubmit = e => {
  e.preventDefault();
  const r = resolveStudent($("sId").value, $("sPass").value);
  if(r.error){ $("loginError").textContent = r.error; return; }
  store.set(KEYS.session, { role:"student", login:r.student.login, pass:$("sPass").value.trim().toLowerCase() });
  e.target.reset(); startStudent(r.student);
};

$("adminLoginForm").onsubmit = e => {
  e.preventDefault();
  if(checkAdmin($("aUser").value, $("aPass").value)){
    store.set(KEYS.session, { role:"admin" });
    e.target.reset(); startAdmin();
  } else $("loginError").textContent = "❌ Admin username या password ग़लत है।";
};

function logout(){
  store.del(KEYS.session);
  try{ speechSynthesis.cancel(); }catch(e){}
  current = null; $("studentLogout").textContent = "Logout";
  selectTab("student"); showScreen("landingScreen");
}
$("studentLogout").onclick = () => { if(current?.guest){ logout(); showScreen("loginScreen"); } else logout(); };
$("adminLogout").onclick = logout;

/* =========================================================
   STUDENT APP
   ========================================================= */
let current = null;
let activeClass = 1;

function startStudent(s){
  current = { ...s, progress: getProgress(s.login) };
  activeClass = current.cls;
  $("studentName").textContent = "👤 " + s.name;
  $("studentLogout").textContent = "Logout";
  $("welcomeText").textContent = `नमस्ते, ${s.name.split(" ")[0]}! 👋`;
  $("validityText").textContent = s.expiry ? "Access valid till: " + fmtDate(s.expiry) : "";
  renderClassTabs(); renderTopics(); updateProgress();
  $("lessonView").classList.add("hidden"); $("studentHome").classList.remove("hidden");
  showScreen("studentScreen");
  if(s.askName) askStudentName();
}

function askStudentName(){
  openModal(`<h3>👋 आपका स्वागत है! / Welcome!</h3><p>अपना पूरा नाम लिखें (Certificate पर यही नाम आएगा):</p>
    <input type="text" id="mName" placeholder="जैसे: Aarav Sharma" value="${esc(current.name)}" maxlength="40">
    <p class="error" id="mNameErr"></p>
    <div class="row end"><button class="btn primary" id="mNameOk">सेव करें</button></div>`);
  $("mName").focus(); $("mName").select();
  $("mName").oninput = () => $("mNameErr").textContent = "";
  $("mNameOk").onclick = () => {
    const n = $("mName").value.trim().replace(/\s+/g," ");
    if(n.length < 2) { $("mNameErr").textContent = "कृपया अपना नाम लिखें"; return; }
    current.name = n; current.askName = false; current.progress._name = n; saveProgress(current.login, current.progress);
    $("studentName").textContent = "👤 " + n; $("welcomeText").textContent = `नमस्ते, ${n.split(" ")[0]}! 👋`;
    closeModal();
  };
}

function allowedClasses(){ return current.allClasses ? [1,2,3,4,5] : [Number(current.cls)]; }

function renderClassTabs(){
  const allowed = allowedClasses();
  $("classTabs").innerHTML = [1,2,3,4,5].map(c =>
    `<button class="class-tab ${c===activeClass?"active":""}" data-c="${c}" ${allowed.includes(c)?"":"disabled title='आपकी कक्षा नहीं'"}>Class ${c}</button>`
  ).join("");
  $("classTabs").querySelectorAll(".class-tab").forEach(b => b.onclick = () => {
    activeClass = Number(b.dataset.c); $("topicSearch").value=""; renderClassTabs(); renderTopics(); updateProgress();
  });
  $("testBtn").textContent = `📝 Class ${activeClass} Test दें`;
}

function renderTopics(){
  const q = $("topicSearch").value.trim().toLowerCase();
  const allowed = allowedClasses();
  const list = q ? TOPICS.filter(t => allowed.includes(t.cls) && (t.title+" "+t.hindi).toLowerCase().includes(q))
                 : TOPICS.filter(t => t.cls === activeClass);
  const done = current.progress || {};
  const best = done["test-c"+activeClass];
  $("topicGrid").innerHTML = (best!==undefined && !q ? `<div class="test-best">📝 Class ${activeClass} Test — आपका सबसे अच्छा स्कोर: <b>${best}/10</b> ${stars(best,10)}</div>` : "") +
   (list.length ? list.map(t => {
    const i = TOPICS.filter(x=>x.cls===t.cls).indexOf(t)+1;
    const sc = done[t.id];
    return `<div class="topic-card" style="--c:${CLASS_COLORS[t.cls]}" data-id="${t.id}" tabindex="0" role="button">
      ${sc!==undefined ? `<span class="done">${stars(sc,t.quiz.length)||"✓"} ${sc}/${t.quiz.length}</span>` : ""}
      <span class="num">CLASS ${t.cls} • TOPIC ${i}</span>
      <h4>${esc(t.title)}</h4><p>${esc(t.hindi)}</p></div>`;
  }).join("") : `<p class="muted">कोई टॉपिक नहीं मिला।</p>`);
  $("topicGrid").querySelectorAll(".topic-card").forEach(c => {
    c.onclick = () => openLesson(c.dataset.id);
    c.onkeydown = e => { if(e.key==="Enter") openLesson(c.dataset.id); };
  });
}
$("topicSearch").oninput = renderTopics;

function renderHomeExtras(){
  const p = current.progress || {};
  const last = TOPICS.find(t => t.id === p._last);
  const cls = activeClass, list = TOPICS.filter(t => t.cls === cls);
  const allDone = list.every(t => p[t.id] !== undefined), test = p["test-c"+cls] ?? -1;
  let html = "";
  if(last && allowedClasses().includes(last.cls)) html += `<button class="btn ghost" id="continueBtn">▶ जारी रखें: ${esc(last.title)}</button>`;
  if(allDone && test >= 7) html += `<button class="btn gold" id="certBtn">🏅 Class ${cls} Certificate</button>`;
  else html += `<span class="muted cert-hint">🏅 Class ${cls} Certificate: सभी ${list.length} टॉपिक्स पूरे करें और Class Test में 7+ लाएँ</span>`;
  $("homeExtras").innerHTML = html;
  if($("continueBtn")) $("continueBtn").onclick = () => openLesson(last.id);
  if($("certBtn")) $("certBtn").onclick = () => showCertificate(cls, test);
}

function showCertificate(cls, score){
  const d = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  $("lessonContent").style.setProperty("--c", CLASS_COLORS[cls]);
  $("lessonContent").innerHTML = `
    <div class="certificate">
      <img src="${document.querySelector('.brand img').src}" alt="">
      <p class="c-top">Learn from ${esc(CONFIG.teacherName||"Pallavi Gupta")}</p>
      <h2>Certificate of Achievement</h2>
      <p>यह प्रमाणित किया जाता है कि / This is to certify that</p>
      <h1>${esc(current.name)}</h1>
      <p>ने <b>Class ${cls} English Grammar</b> के सभी टॉपिक्स सफलतापूर्वक पूरे किए<br>has successfully completed all topics of <b>Class ${cls} English Grammar</b></p>
      <p class="c-score">Class Test Score: <b>${score}/10</b> ${stars(score,10)}</p>
      <div class="c-foot"><span>${d}</span><span><b>${esc(CONFIG.teacherName||"Pallavi Gupta")}</b><br>Teacher</span></div>
    </div>
    <div class="lesson-nav"><button class="btn ghost" data-home="1">← वापस</button><button class="btn primary" data-print="1">🖨 Print / PDF</button></div>`;
  $("lessonContent").querySelector("[data-home]").onclick = goHome;
  $("lessonContent").querySelector("[data-print]").onclick = printPage;
  $("studentHome").classList.add("hidden"); $("lessonView").classList.remove("hidden"); window.scrollTo(0,0);
}

function updateProgress(){
  const mine = TOPICS.filter(t => allowedClasses().includes(t.cls));
  const p = current.progress || {};
  const done = mine.filter(t => p[t.id] !== undefined).length;
  const pct = mine.length ? Math.round(done/mine.length*100) : 0;
  const starTotal = mine.reduce((n,t) => n + (p[t.id]!==undefined ? stars(p[t.id], t.quiz.length).length/2 : 0), 0);
  renderHomeExtras();
  $("progressRing").style.setProperty("--p", pct);
  $("progressPct").textContent = pct + "%";
  $("starCount").textContent = `⭐ ${starTotal} Stars • ${done}/${mine.length} टॉपिक`;
}

function speak(text, lang="en-IN"){
  if(!("speechSynthesis" in window)) return toast("इस ब्राउज़र में आवाज़ उपलब्ध नहीं है");
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/→|×|\|/g, ",").replace(/^(Active|Passive|Direct|Indirect):\s*/,""));
    u.lang=lang; u.rate=.85;
    const v = speechSynthesis.getVoices().find(v => v.lang.replace("_","-").startsWith(lang.slice(0,2)));
    if(v) u.voice = v;
    speechSynthesis.speak(u);
  }catch(e){ toast("आवाज़ नहीं चल पाई"); }
}

function openLesson(id){
  const t = TOPICS.find(x=>x.id===id); if(!t) return;
  const sameClass = TOPICS.filter(x=>x.cls===t.cls);
  const idx = sameClass.indexOf(t);
  const prev = sameClass[idx-1], next = sameClass[idx+1];
  const en = (typeof TOPICS_EN!=="undefined" && TOPICS_EN[t.id]) || {};

  $("lessonContent").style.setProperty("--c", CLASS_COLORS[t.cls]);
  $("lessonContent").innerHTML = `
    <div class="lesson-head">
      <span class="badge">Class ${t.cls} • Topic ${idx+1}${current.guest?" • मुफ़्त Demo":""}</span>
      <h2>${esc(t.title)}</h2><h3>${esc(t.hindi)}</h3>
    </div>
    <div class="lesson-body">
      <div class="lang-switch" role="group" aria-label="भाषा चुनें">
        <span>भाषा / Language:</span>
        <button data-lang="hi">हिंदी</button><button data-lang="en">English</button><button data-lang="both">दोनों / Both</button>
      </div>
      <section><h5>📖 समझिए / Understand</h5>
        <p class="intro hi-block">${esc(t.intro)} <button class="speak sm" data-say="hi" aria-label="हिंदी में सुनें">🔊</button></p>
        ${en.intro?`<p class="intro en-block"><span class="lang-tag">English</span>${esc(en.intro)} <button class="speak sm" data-say="en" aria-label="Listen in English">🔊</button></p>`:""}</section>
      <section><h5>📌 मुख्य नियम / Main Rules</h5><ul class="points">${t.points.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></section>
      <section><h5>✏️ उदाहरण / Examples <small class="muted">(🔊 दबाकर सुनें / tap to listen)</small></h5>
        <div class="ex">${t.examples.map((e,i)=>`
          <div class="ex-item"><div><div class="en">${esc(e[0])}</div><div class="hi">${esc(e[1])}</div></div>
          <button class="speak" data-i="${i}" aria-label="सुनें">🔊</button></div>`).join("")}
        </div></section>
      <section><div class="tip"><div class="hi-block">💡 याद रखने की ट्रिक: ${esc(t.tip)}</div>${en.tip?`<div class="en-block">💡 Memory trick: ${esc(en.tip)}</div>`:""}</div></section>
      <section><h5>🎯 अभ्यास करें / Practice Quiz</h5><div id="quizBox"></div></section>
    </div>
    <div class="lesson-nav">
      ${current.guest ? `<span></span><button class="btn primary" id="guestLogin">पूरा कोर्स पढ़ने के लिए Login करें →</button>` :
        `${prev ? `<button class="btn ghost" data-go="${prev.id}">← ${esc(prev.title)}</button>` : "<span></span>"}
         <button class="btn ghost" data-print="1">🖨 Print / PDF</button>
         ${next ? `<button class="btn primary" data-go="${next.id}">${esc(next.title)} →</button>` : `<button class="btn primary" data-home="1">🏠 सभी टॉपिक्स</button>`}`}
    </div>`;

  applyLang(store.get(KEYS.lang, "both"));
  $("lessonContent").querySelectorAll("[data-lang]").forEach(b => b.onclick = () => { store.set(KEYS.lang, b.dataset.lang); applyLang(b.dataset.lang); });
  $("lessonContent").querySelectorAll(".speak[data-i]").forEach(b => b.onclick = () => speak(t.examples[b.dataset.i][0]));
  $("lessonContent").querySelectorAll("[data-say]").forEach(b => b.onclick = () => b.dataset.say==="hi" ? speak(t.intro, "hi-IN") : speak(en.intro, "en-IN"));
  if(!current.guest){ current.progress._last = t.id; saveProgress(current.login, current.progress); }
  $("lessonContent").querySelectorAll("[data-go]").forEach(b => b.onclick = () => openLesson(b.dataset.go));
  $("lessonContent").querySelectorAll("[data-home]").forEach(b => b.onclick = goHome);
  $("lessonContent").querySelectorAll("[data-print]").forEach(b => b.onclick = printPage);
  if($("guestLogin")) $("guestLogin").onclick = () => { logout(); showScreen("loginScreen"); };
  renderQuiz(t.quiz, (correct) => saveScore(t.id, correct), t.quiz.length);

  $("studentHome").classList.add("hidden"); $("lessonView").classList.remove("hidden");
  window.scrollTo(0,0);
}

function applyLang(lang){
  const box = $("lessonContent");
  box.classList.toggle("show-hi", lang!=="en");
  box.classList.toggle("show-en", lang!=="hi");
  box.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("on", b.dataset.lang===lang));
}

function renderQuiz(questions, onFinish, total){
  let answered = 0, correct = 0;
  const box = $("quizBox");
  box.innerHTML = questions.map((q,qi)=>`
    <div class="quiz-q" data-q="${qi}">${q.topic?`<span class="q-topic">${esc(q.topic)}</span>`:""}<p>${qi+1}. ${esc(q.q)}</p>
      <div class="opts">${q.o.map((o,oi)=>`<button class="opt" data-o="${oi}">${esc(o)}</button>`).join("")}</div>
      <div class="feedback"></div></div>`).join("") + `<div id="scoreBox"></div>`;

  box.querySelectorAll(".quiz-q").forEach(qEl=>{
    const q = questions[qEl.dataset.q];
    qEl.querySelectorAll(".opt").forEach(btn => btn.onclick = () => {
      const pick = Number(btn.dataset.o);
      qEl.querySelectorAll(".opt").forEach(b=>b.disabled=true);
      qEl.querySelectorAll(".opt")[q.a].classList.add("right");
      const fb = qEl.querySelector(".feedback");
      if(pick===q.a){ correct++; fb.textContent="✅ बहुत बढ़िया! सही जवाब।"; fb.className="feedback good"; }
      else { btn.classList.add("wrong"); fb.textContent="❌ सही जवाब है: "+q.o[q.a]; fb.className="feedback bad"; }
      answered++;
      if(answered===questions.length){
        const msg = correct===total ? "🏆 शानदार! सारे जवाब सही!" : correct>=total*0.6 ? "👍 अच्छा प्रयास! थोड़ा और अभ्यास करें।" : "📚 कोई बात नहीं, टॉपिक फिर से पढ़ें।";
        $("scoreBox").innerHTML = `<div class="score">आपका स्कोर: ${correct} / ${total} ${stars(correct,total)}<br>${msg}<br>
          <button class="btn small ghost" id="retry" style="margin-top:10px">🔄 फिर से करें</button></div>`;
        $("retry").onclick = () => renderQuiz(questions, onFinish, total);
        $("scoreBox").scrollIntoView({behavior:"smooth", block:"center"});
        onFinish(correct);
      }
    });
  });
}

function saveScore(key, correct){
  if(current.guest) return;
  current.progress[key] = Math.max(current.progress[key] ?? 0, correct);
  saveProgress(current.login, current.progress);
  const all = getStudents(); const s = all.find(x=>x.login.toLowerCase()===current.login);
  if(s){ s.lastSeen = new Date().toISOString(); saveStudents(all); }
}

$("testBtn").onclick = () => {
  const pool = [];
  TOPICS.filter(t=>t.cls===activeClass).forEach(t => t.quiz.forEach(q => pool.push({ ...q, topic:t.title })));
  const qs = shuffle(pool).slice(0,10);
  $("lessonContent").style.setProperty("--c", CLASS_COLORS[activeClass]);
  $("lessonContent").innerHTML = `
    <div class="lesson-head"><span class="badge">Class ${activeClass}</span><h2>📝 Class ${activeClass} Grammar Test</h2>
      <h3>10 प्रश्न • सभी टॉपिक्स से मिले-जुले</h3></div>
    <div class="lesson-body"><div id="quizBox"></div></div>
    <div class="lesson-nav"><span></span><button class="btn primary" data-home="1">🏠 सभी टॉपिक्स</button></div>`;
  $("lessonContent").querySelector("[data-home]").onclick = goHome;
  renderQuiz(qs, c => saveScore("test-c"+activeClass, c), qs.length);
  $("studentHome").classList.add("hidden"); $("lessonView").classList.remove("hidden");
  window.scrollTo(0,0);
};

function printPage(){
  try{ window.print(); }catch(e){ toast("इस जगह Print नहीं हो सकता — वेबसाइट पर खोलकर Print करें"); }
}

function goHome(){
  if(current?.guest){ logout(); return; }
  $("lessonView").classList.add("hidden"); $("studentHome").classList.remove("hidden");
  renderTopics(); updateProgress(); window.scrollTo(0,0);
}
$("backBtn").onclick = goHome;
$("homeBrand").onclick = goHome;

/* =========================================================
   ADMIN PORTAL
   ========================================================= */
function startAdmin(){
  $("newAdminUser").value = CONFIG.adminUser || "admin";
  $("statTopics").textContent = TOPICS.length;
  resetForm(); renderStudents(); showScreen("adminScreen");
}

function statusOf(s){
  if(!s.active || isBlockedEverywhere(s.login)) return "off";
  if(s.expiry && s.expiry < today()) return "exp";
  return "on";
}

function daysLeft(s){ return s.expiry ? Math.ceil((new Date(s.expiry+"T23:59:59") - new Date())/86400000) : Infinity; }
function renderReminders(){
  const due = getStudents().filter(s => s.active && daysLeft(s) <= 15).sort((a,b)=>daysLeft(a)-daysLeft(b));
  $("reminderPanel").classList.toggle("hidden", !due.length);
  $("reminderList").innerHTML = due.map(s => {
    const dl = daysLeft(s);
    return `<div class="rem-item"><div><b>${esc(s.name)}</b> <small class="muted">(${esc(s.login)})</small><br>
      <small>${dl < 0 ? `⛔ ${-dl} दिन पहले समाप्त` : dl === 0 ? "⚠ आज समाप्त" : `⏳ ${dl} दिन बाकी`} • ${fmtDate(s.expiry)}</small></div>
      <div class="actions"><button data-rem="${s.id}">💬 Reminder</button><button data-ren="${s.id}">🔁 Renew</button></div></div>`;
  }).join("");
  $("reminderList").querySelectorAll("[data-rem]").forEach(b => b.onclick = () => {
    const s = getStudents().find(x=>x.id===b.dataset.rem);
    const msg = `नमस्ते! 📚 Learn from Pallavi Gupta में ${s.name} का Access ${fmtDate(s.expiry)} को ${daysLeft(s)<0?"समाप्त हो गया है":"समाप्त हो रहा है"}। पढ़ाई जारी रखने के लिए कृपया fee जमा करें। धन्यवाद 🙏`;
    const phone = String(s.phone||"").replace(/\D/g,""); const num = phone.length===10 ? "91"+phone : phone;
    showText(`${s.name} — Reminder`, msg, `<a class="btn wa-btn full" href="https://wa.me/${num}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">💬 WhatsApp पर भेजें</a>`);
  });
  $("reminderList").querySelectorAll("[data-ren]").forEach(b => b.onclick = () => studentAction("renew", b.dataset.ren));
}

function renderStudents(){
  renderReminders();
  const q = $("studentSearch").value.trim().toLowerCase();
  const all = getStudents();
  const list = all.filter(s => (s.name+" "+s.login).toLowerCase().includes(q));
  $("statTotal").textContent = all.length;
  $("statActive").textContent = all.filter(s=>statusOf(s)==="on").length;
  $("statBlocked").textContent = all.filter(s=>statusOf(s)!=="on").length;
  $("emptyMsg").classList.toggle("hidden", all.length>0);

  $("studentTable").innerHTML = list.map(s=>{
    const st = statusOf(s);
    const label = { on:'<span class="status on">Active</span>', off:'<span class="status off">Blocked</span>', exp:'<span class="status exp">Expired</span>' }[st];
    return `<tr>
      <td><b>${esc(s.name)}</b>${s.phone?`<br><small class="muted">${esc(s.phone)}</small>`:""}</td>
      <td>${s.cls==0?"1–5":esc(s.cls)}</td>
      <td><code>${esc(s.login)}</code></td>
      <td><code>${esc(s.pass)}</code></td>
      <td>${fmtDate(s.expiry)}</td>
      <td>${label}</td>
      <td class="actions">
        <button data-act="share" data-id="${s.id}">💬 भेजें</button>
        <button data-act="edit" data-id="${s.id}">✏️ Edit</button>
        <button data-act="renew" data-id="${s.id}">🔁 Renew</button>
        <button data-act="toggle" data-id="${s.id}">${s.active?"🚫 Block":"✅ Allow"}</button>
        <button data-act="del" data-id="${s.id}" class="del" aria-label="Delete">🗑</button>
      </td></tr>`;
  }).join("");
  $("studentTable").querySelectorAll("button").forEach(b => b.onclick = () => studentAction(b.dataset.act, b.dataset.id));
}
$("studentSearch").oninput = renderStudents;

function siteUrl(){ return /^https?:/.test(location.protocol) && !location.hostname.endsWith("claude.ai") && !location.hostname.endsWith("claudeusercontent.com") ? location.origin + location.pathname : ""; }
function credText(s){
  const url = siteUrl();
  return `📚 Learn from Pallavi Gupta\nनमस्ते ${s.name}!\n\nआपकी English Grammar classes के लिए login details:\nLogin ID: ${s.login}\nPassword: ${s.pass}\nClass: ${s.cls==0?"1 to 5":s.cls}\nValid till: ${fmtDate(s.expiry)}` + (url?`\n\nवेबसाइट: ${url}`:"");
}
function shareCreds(s){
  const txt = credText(s);
  const phone = String(s.phone||"").replace(/\D/g,"");
  const waNum = phone.length===10 ? "91"+phone : phone;
  const wa = `https://wa.me/${waNum}?text=${encodeURIComponent(txt)}`;
  showText(`${s.name} के Login details`, txt, `<a class="btn wa-btn full" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp पर भेजें${waNum?"":" (नंबर चुनें)"}</a>`);
}

function studentAction(act, id){
  const all = getStudents(); const s = all.find(x=>x.id===id); if(!s) return;
  if(act==="share") return shareCreds(s);
  if(act==="edit"){
    $("editId").value=s.id; $("fName").value=s.name; $("fClass").value=String(s.cls);
    $("fLogin").value=s.login; $("fPhone").value=s.phone||""; $("fValid").value = s.validMonths ?? "12";
    $("formTitle").textContent="✏️ Student एडिट करें"; $("saveBtn").textContent="बदलाव सेव करें";
    $("cancelEdit").classList.remove("hidden"); $("credBox").classList.add("hidden");
    $("fName").focus(); window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  if(act==="renew"){
    const months = Number(s.validMonths) || 12;
    askConfirm(`${s.name} का Access ${months} महीने के लिए आगे बढ़ाएँ? नया Password बनेगा।`, () => {
      s.expiry = validityEnd(months); s.pass = makePassword(s.login, s.cls, s.expiry); s.active = true;
      saveStudents(all); renderStudents(); shareCreds(s);
    });
    return;
  }
  if(act==="toggle"){
    s.active = !s.active; saveStudents(all); renderStudents();
    if(!s.active) openModal(`<h3>🚫 ${esc(s.name)} Blocked</h3>
      <p>इस डिवाइस पर Access तुरंत बंद हो गया है।</p>
      <p class="muted">सभी फ़ोन/कंप्यूटर पर बंद करने के लिए <b>config.js</b> फ़ाइल में <code>blocked: ["${esc(s.login)}"]</code> जोड़कर वेबसाइट दोबारा deploy करें — या Student का Password अपने-आप उसकी Validity ख़त्म होने पर बंद हो जाएगा।</p>
      <div class="row end"><button class="btn primary" id="mOk">ठीक है</button></div>`), $("mOk").onclick = closeModal;
    else toast(`✅ ${s.name} को Access दिया गया`);
    return;
  }
  if(act==="del"){
    askConfirm(`क्या आप सच में ${s.name} को हटाना चाहते हैं?`, ()=>{ saveStudents(all.filter(x=>x.id!==id)); renderStudents(); toast("Student हटा दिया गया"); });
  }
}

$("genId").onclick = () => {
  const base = ($("fName").value.trim().split(" ")[0] || "student").toLowerCase().replace(/[^a-z0-9]/g,"") || "student";
  const all = getStudents(); let n=1, id;
  do { id = base + String(n).padStart(2,"0"); n++; } while(all.some(s=>s.login.toLowerCase()===id));
  $("fLogin").value = id;
};

$("studentForm").onsubmit = e => {
  e.preventDefault();
  const all = getStudents();
  const editId = $("editId").value;
  if(!$("fLogin").value.trim()) $("genId").click();
  const login = $("fLogin").value.trim().toLowerCase();
  if(!/^[a-z0-9_.-]{3,20}$/.test(login)) return toast("Login ID: 3–20 अक्षर, सिर्फ़ a-z, 0-9 (बिना space)");
  if(all.some(s => s.login===login && s.id!==editId)) return toast("⚠ यह Login ID पहले से मौजूद है");

  const cls = $("fClass").value, validMonths = $("fValid").value;
  const prev = editId ? all.find(s=>s.id===editId) : null;
  const keepExpiry = prev && String(prev.validMonths)===validMonths;
  const expiry = keepExpiry ? prev.expiry : validityEnd(validMonths);
  const data = { name:$("fName").value.trim(), cls, login, validMonths, expiry, phone:$("fPhone").value.trim(),
                 pass: makePassword(login, cls, expiry) };
  let saved;
  if(prev){ saved = Object.assign(prev, data); toast("✅ बदलाव सेव हो गए"); }
  else { saved = { id:"s"+Date.now(), active:true, created:today(), ...data }; all.push(saved); toast("✅ नया Student जोड़ा गया"); }
  saveStudents(all); renderStudents(); resetForm();

  $("credBox").innerHTML = `✅ <b>${esc(saved.name)}</b> के Login details:<br>Login ID: <b>${esc(saved.login)}</b><br>Password: <b>${esc(saved.pass)}</b><br>Valid till: <b>${fmtDate(saved.expiry)}</b>
    <div class="row"><button class="btn small primary" id="shareNew">💬 Share / Copy</button></div>`;
  $("credBox").classList.remove("hidden");
  $("shareNew").onclick = () => shareCreds(saved);
};

function resetForm(){
  $("studentForm").reset(); $("editId").value=""; $("fValid").value="12";
  $("formTitle").textContent="➕ नया Student जोड़ें"; $("saveBtn").textContent="Student सेव करें";
  $("cancelEdit").classList.add("hidden");
}
$("cancelEdit").onclick = resetForm;

$("adminPassForm").onsubmit = e => {
  e.preventDefault();
  const user = $("newAdminUser").value.trim().toLowerCase(), h = adminHash(user, $("newAdminPass").value);
  store.set(KEYS.admin, { hash:h });
  $("newAdminPass").value="";
  const line = `adminUser: "${user}",\n  adminHash: "${h}",`;
  showText("नया Admin Password — सभी डिवाइस पर लागू करने के लिए", line,
    `<p class="muted" style="margin-top:8px">यह Password अभी सिर्फ़ इस डिवाइस पर चलेगा। हर डिवाइस पर लागू करने के लिए <b>config.js</b> में पुरानी <code>adminUser</code> और <code>adminHash</code> वाली दो लाइनें इन लाइनों से बदलें और वेबसाइट दोबारा deploy करें।</p>`);
};

$("exportBtn").onclick = () => {
  const json = JSON.stringify({ app:"learn-from-pallavi-gupta", exported:new Date().toISOString(), students:getStudents() },null,2);
  try{
    const blob = new Blob([json], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `pallavi-students-backup-${today()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }catch(e){}
  showText("Backup (अगर फ़ाइल डाउनलोड न हुई हो तो इसे कॉपी करके सेव करें)", json);
};
$("importFile").onchange = e => {
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const d = JSON.parse(r.result);
      if(!Array.isArray(d.students)) throw 0;
      askConfirm(`${d.students.length} students लोड करें? मौजूदा सूची बदल जाएगी।`, ()=>{
        let fixed = 0;
        const list = d.students.filter(x => x && x.login).map(x => {
          x.login = String(x.login).toLowerCase(); x.cls = String(x.cls ?? (x.allClasses?0:1)); if(x.allClasses) x.cls = "0";
          x.id = x.id || "s"+Date.now()+Math.random().toString(36).slice(2,6); x.active = x.active !== false;
          x.expiry = x.expiry ? codeToExpiry(expiryToCode(x.expiry)) : null;
          if(!checkPassword(x.login, x.pass) || checkPassword(x.login, x.pass).expiry !== x.expiry){ x.pass = makePassword(x.login, x.cls, x.expiry); fixed++; }
          return x;
        });
        saveStudents(list); renderStudents();
        toast(fixed ? `✅ Backup लोड हुआ — ${fixed} पुराने Passwords नए बनाए गए` : "✅ Backup लोड हो गया");
      });
    }catch(err){ toast("⚠ यह सही backup फ़ाइल नहीं है"); }
    e.target.value="";
  };
  r.readAsText(f);
};

/* =========================================================
   START
   ========================================================= */
(function init(){
  renderLanding();
  const sess = store.get(KEYS.session, null);
  if(sess?.role==="admin") return startAdmin();
  if(sess?.role==="student"){
    const r = resolveStudent(sess.login, sess.pass);
    if(r.student) return startStudent(r.student);
    store.del(KEYS.session);
  }
  showScreen("landingScreen");
})();

/* Installable app + offline support (only on a real website) */
if("serviceWorker" in navigator && location.protocol==="https:" && !/claude\.ai|claudeusercontent/.test(location.hostname)){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
