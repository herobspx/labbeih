/* لبّيه — سلوك الصفحة */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- ١. تطبيق الإعدادات ---------- */

  $$("[data-bind]").forEach(function (el) {
    var v = CFG[el.getAttribute("data-bind")];
    if (v) el.textContent = v;
  });
  if (CFG.serviceName) document.title = CFG.serviceName + (CFG.tagline ? " — " + CFG.tagline : "");

  if (CFG.logoSrc) {
    $$("[data-logo]").forEach(function (el) {
      el.innerHTML = "";
      var img = new Image();
      img.src = CFG.logoSrc;
      img.alt = "";
      el.appendChild(img);
    });
  }

  var links = $("[data-footer-links]");
  [
    ["email", "راسلنا بالبريد", function (v) { return "mailto:" + v; }],
    ["instagram", "إنستقرام", function (v) { return v; }],
    ["x", "إكس", function (v) { return v; }]
  ].forEach(function (d) {
    if (!CFG[d[0]] || !links) return;
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = d[2](CFG[d[0]]);
    a.textContent = d[1];
    if (d[0] !== "email") { a.target = "_blank"; a.rel = "noopener"; }
    li.appendChild(a);
    links.appendChild(li);
  });

  /* ---------- ٢. أزرار التواصل ---------- */

  var notice = $("[data-notice]");
  var number = String(CFG.whatsappNumber || "").replace(/\D/g, "");
  var BASE_MSG = CFG.whatsappMessage || "السلام عليكم، مهتم بخدمة لبّيه وأرغب بعرض يناسب نشاطي.";

  function composeMessage(form) {
    if (!form) return BASE_MSG;
    var d = new FormData(form);
    var lines = [];
    if ((d.get("cafe") || "").trim()) lines.push("اسم الكافيه: " + d.get("cafe").trim());
    if (d.get("branches")) lines.push("عدد الفروع: " + d.get("branches"));
    if (d.get("need")) lines.push("أكثر طلب يجينا: " + d.get("need"));
    return lines.length ? BASE_MSG + "\n" + lines.join("\n") : BASE_MSG;
  }

  // رابط واتساب برسالة جاهزة. لا يُرسل شيء: الزائر يضغط «إرسال» بنفسه داخل واتساب
  function waUrl(msg) { return "https://wa.me/" + number + "?text=" + encodeURIComponent(msg); }

  function showNotice(msg) {
    if (notice && typeof notice.showModal === "function") {
      $("[data-notice-message]", notice).textContent = msg;
      notice.showModal();
    } else {
      window.alert("وسيلة التواصل غير مربوطة بعد. أضف رقم الواتساب في config.js قبل الإطلاق.");
    }
  }

  // النص تحت الأزرار يتبع الإعدادات
  $$("[data-contact-note]").forEach(function (el) {
    var isForm = el.getAttribute("data-contact-note") === "form";
    el.textContent = number
      ? (isForm ? "الزر يفتح واتساب برسالة جاهزة فيها إجاباتك، وتقدر تعدّلها قبل ما ترسلها." : "يفتح واتساب برسالة جاهزة، والإرسال منك")
      : "نسخة معاينة — التواصل غير مفعّل بعد";
  });

  // أزرار الصفحة روابط حقيقية، فتعمل أيضًا داخل متصفح واتساب
  $$("[data-cta]").forEach(function (a) {
    if (number) {
      a.href = waUrl(BASE_MSG);
      a.target = "_blank";
      a.rel = "noopener";
    } else {
      a.addEventListener("click", function (e) { e.preventDefault(); showNotice(BASE_MSG); });
    }
  });

  var compose = $("[data-compose]");
  if (compose) compose.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = composeMessage(compose);
    if (!number) { showNotice(msg); return; }
    var link = document.createElement("a");
    link.href = waUrl(msg);
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  if (notice) notice.addEventListener("click", function (e) { if (e.target === notice) notice.close(); });

  /* ---------- ٣. الشريط العلوي وشريط الجوال ---------- */

  var topbar = $(".topbar");
  var onScroll = function () { topbar.classList.toggle("is-scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var dock = $("[data-dock]");
  if (dock && "IntersectionObserver" in window) {
    var seen = { hero: true, close: false, demo: false };
    var sync = function () {
      // يختفي فوق المثال حتى لا يغطي أزرار التحكم، وقرب نموذج التواصل لأنه يكرره
      var on = !seen.hero && !seen.close && !seen.demo;
      dock.classList.toggle("is-on", on);
      dock.setAttribute("aria-hidden", on ? "false" : "true");
      $(".btn", dock).tabIndex = on ? 0 : -1;
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var k = en.target.id === "top" ? "hero" : en.target.id === "start" ? "close" : "demo";
        seen[k] = en.isIntersecting;
      });
      sync();
    }, { threshold: 0 });
    io.observe($("#top"));
    io.observe($("#start"));
    io.observe($("#demo-stage"));
  }

  /* ---------- ٤. المثال التفاعلي ---------- */

  var STATUS = {
    new: "استفسار جديد",
    collect: "جمع التفاصيل",
    pending: "بانتظار اعتماد الموظف",
    approved: "معتمد، بانتظار الدفع",
    done: "مؤكد"
  };

  /*
    المثالان توضيحيان وبأسعار افتراضية. عند تعديل أي سعر، حدّث الملخص والإجمالي معًا:
    - المناسبة: ١٬٣٥٠ (الباقة) + ٥٠ (تقديم الكيكة) = ١٬٤٠٠ ريال، ضمن ميزانية ١٬٥٠٠.
    - البوكسات: ٢٥ × ٢٨ = ٧٠٠، و١٥ × ٣٥ = ٥٢٥، والإجمالي ١٬٢٢٥ ريال لـ٤٠ بوكس.
  */
  var SCENARIOS = {
    event: {
      title: "طلب مناسبة",
      no: "رقم ٠١٥٧",
      done: "مؤكد",
      fields: [
        ["occasion", "المناسبة"], ["when", "الموعد"], ["count", "العدد"], ["branch", "الفرع"],
        ["budget", "الميزانية"], ["choice", "الباقة"], ["fee", "تقديم الكيكة"], ["total", "الإجمالي"],
        ["approve", "موافقة العميل"]
      ],
      chips: ["occasion", "count", "when", "total"],
      steps: [
        { f: "c", t: "مساء الخير، ودي أحجز ركن لعيد ميلاد بنتي، الجمعة الجاية الساعة ٨ بالليل",
          set: { occasion: "عيد ميلاد", when: "الجمعة، ٨:٠٠ م" }, status: "collect" },
        { f: "a", t: "مساء النور، ومبروك مقدمًا. كم عدد الحضور تقريبًا؟ وأي فرع يناسبكم؟" },
        { f: "c", t: "حوالي ١٥ شخص، الفرع الرئيسي", set: { count: "١٥ شخصًا", branch: "الفرع الرئيسي" } },
        { f: "a", t: "وكم الميزانية التقريبية؟ وعندكم أي تفضيلات؟" },
        { f: "c", t: "حدود ١٬٥٠٠، وبنجيب الكيكة من برا إذا مسموح", set: { budget: "حدود ١٬٥٠٠ ريال" } },
        { f: "a", t: "هذي الباقات المناسبة لعددكم:",
          opts: [["باقة الركن", "٩٥٠ ريال"], ["الركن مع التزيين", "١٬٣٥٠ ريال"]],
          after: "وإحضار الكيكة مسموح حسب سياسة الفرع، مع رسوم تقديم ٥٠ ريال." },
        { f: "c", t: "باقة التزيين", set: { choice: "الركن مع التزيين، ١٬٣٥٠ ريال", fee: "٥٠ ريال" } },
        { f: "a", t: "هذا ملخص طلبك: عيد ميلاد، الجمعة ٨:٠٠ م، الفرع الرئيسي، ١٥ شخصًا.",
          sum: [["الركن مع التزيين", "١٬٣٥٠ ريال"], ["رسوم تقديم الكيكة", "٥٠ ريال"], ["الإجمالي", "١٬٤٠٠ ريال"]],
          after: "التفاصيل صحيحة؟", set: { total: "١٬٤٠٠ ريال" } },
        { f: "c", t: "صحيحة، تمام", set: { approve: "وافق على الملخص" } },
        { f: "a", t: "شكرًا. رفعت طلبك لفريق الفرع الرئيسي يتأكدون من توفر الركن يوم الجمعة، وأرجع لك بالرد.",
          status: "pending" },
        { f: "sys", t: "الموظف اعتمد الطلب بعد مراجعة الجدول", status: "approved" },
        { f: "a", t: "أبشر، الركن متاح يوم الجمعة. الإجمالي ١٬٤٠٠ ريال، وهذا رابط الدفع الخاص بالمقهى لتثبيت الحجز:", pay: true },
        { f: "sys", t: "تم الدفع عبر رابط المقهى", status: "done" },
        { f: "a", t: "تم تأكيد حجزك. نشوفكم الجمعة الساعة ٨، وإذا احتجت أي تعديل راسلنا هنا." }
      ]
    },
    boxes: {
      title: "طلب بوكسات",
      no: "رقم ٠١٥٨",
      done: "مؤكد، جاهز للتحضير",
      fields: [
        ["occasion", "الغرض"], ["count", "الكمية"], ["when", "الموعد"], ["branch", "الاستلام"],
        ["choice", "التفاصيل"], ["notes", "ملاحظات"], ["total", "الإجمالي"], ["approve", "موافقة العميل"]
      ],
      chips: ["count", "when", "branch", "total"],
      steps: [
        { f: "c", t: "السلام عليكم، نبي بوكسات قهوة وحلى لاجتماع في الشركة، تقريبًا ٤٠ بوكس",
          set: { occasion: "اجتماع شركة", count: "٤٠ بوكس" }, status: "collect" },
        { f: "a", t: "وعليكم السلام، حياكم. متى تحتاجونها؟ وتفضلون استلام من الفرع ولا توصيل؟" },
        { f: "c", t: "الأحد الساعة ٩ الصبح، استلام من الفرع الثاني",
          set: { when: "الأحد، ٩:٠٠ ص", branch: "الفرع الثاني" } },
        { f: "a", t: "عندنا نوعين:",
          opts: [["قهوة سعودية مع تمر", "٢٨ ريال للبوكس"], ["قهوة مختصة مع حلى", "٣٥ ريال للبوكس"]],
          after: "كم تبون من كل نوع؟ ولكم أي تفضيلات؟" },
        { f: "c", t: "٢٥ سعودي و١٥ مختصة، والحلى بدون مكسرات لو أمكن",
          set: { choice: "٢٥ سعودي، ١٥ مختصة", notes: "حلى بدون مكسرات" } },
        { f: "a", t: "هذا ملخص طلبك، استلام الأحد ٩:٠٠ ص من الفرع الثاني:",
          sum: [["٢٥ × قهوة سعودية مع تمر", "٧٠٠ ريال"], ["١٥ × قهوة مختصة مع حلى", "٥٢٥ ريال"], ["الإجمالي", "١٬٢٢٥ ريال"]],
          after: "التفاصيل صحيحة؟", set: { total: "١٬٢٢٥ ريال" } },
        { f: "c", t: "صحيحة، اعتمدوها", set: { approve: "وافق على الملخص" } },
        { f: "a", t: "الطلبات فوق ٣٠ بوكس تحتاج اعتماد الفرع، رفعت طلبك لهم الحين وأرجع لك.",
          status: "pending" },
        { f: "sys", t: "فريق الفرع الثاني اعتمد الطلب", status: "approved" },
        { f: "a", t: "تم الاعتماد. الإجمالي ١٬٢٢٥ ريال، وهذا رابط الدفع الخاص بالمقهى، وبنذكرك قبل الموعد بيوم:", pay: true },
        { f: "sys", t: "الموظف أكد استلام الدفع", status: "done" },
        { f: "a", t: "تم تأكيد طلبك، ويكون جاهز للاستلام الأحد ٩ الصبح من الفرع الثاني." }
      ]
    }
  };

  var thread = $("[data-thread]");
  var rowsEl = $("[data-ticket-rows]");
  var statusEl = $("[data-ticket-status]");
  var btnNext = $("[data-demo-next]");
  var btnAll = $("[data-demo-all]");
  var btnReset = $("[data-demo-reset]");
  var btnPlay = $("[data-demo-play]");
  var playLabel = $("[data-demo-play-label]");
  var chipsEl = $("[data-progress-chips]");
  var tabs = $$(".demo__tabs [role=tab]");
  var panel = $("#demo-stage");

  var state = { key: "event", i: 0, timer: null, auto: false };

  var ORDER = ["new", "collect", "pending", "approved", "done"];
  var progLabel = $("[data-progress-label]");
  var progCount = $("[data-progress-count]");
  var progSteps = $$("[data-progress-steps] li");

  function renderTicket() {
    var s = SCENARIOS[state.key];
    $("[data-ticket-title]").textContent = s.title;
    $("[data-ticket-no]").textContent = s.no;
    rowsEl.innerHTML = "";
    s.fields.forEach(function (f) {
      var row = document.createElement("div");
      row.dataset.field = f[0];
      if (f[0] === "total") row.className = "is-total";
      var dt = document.createElement("dt");
      dt.textContent = f[1];
      var dd = document.createElement("dd");
      dd.textContent = "بانتظار العميل";
      dd.className = "is-empty";
      row.appendChild(dt); row.appendChild(dd);
      rowsEl.appendChild(row);
    });
    setStatus("new");
    updateSummary();
  }

  function setStatus(st) {
    var label = st === "done" ? SCENARIOS[state.key].done : STATUS[st];
    statusEl.dataset.state = st;
    statusEl.textContent = label;
    if (progLabel) { progLabel.dataset.state = st; progLabel.textContent = label; }
    var at = ORDER.indexOf(st);
    progSteps.forEach(function (li, i) { li.classList.toggle("is-on", i < at || at === 4); });
  }

  function valueOf(k) {
    var dd = rowsEl.querySelector('[data-field="' + k + '"] dd');
    return dd && !dd.classList.contains("is-empty") ? dd.textContent : "";
  }

  var DIGITS = "٠١٢٣٤٥٦٧٨٩";
  function ar(n) { return String(n).replace(/[0-9]/g, function (d) { return DIGITS[d]; }); }

  // ملخص مختصر فوق المحادثة: عدد التفاصيل وأهم القيم المسجلة
  function updateSummary() {
    var s = SCENARIOS[state.key];
    if (progCount) {
      var filled = rowsEl.querySelectorAll("dd:not(.is-empty)").length;
      progCount.textContent = "بطاقة الطلب: " + ar(filled) + " من " + ar(s.fields.length) + " تفاصيل";
    }
    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    s.chips.forEach(function (k) {
      var label = s.fields.filter(function (f) { return f[0] === k; })[0][1];
      var v = valueOf(k);
      var li = document.createElement("li");
      if (!v) li.className = "is-empty";
      var l = document.createElement("span"); l.textContent = label;
      var b = document.createElement("b"); b.textContent = v || "—";
      li.appendChild(l); li.appendChild(b);
      chipsEl.appendChild(li);
    });
  }

  function fill(set) {
    Object.keys(set).forEach(function (k) {
      var row = rowsEl.querySelector('[data-field="' + k + '"]');
      if (!row) return;
      var dd = row.querySelector("dd");
      dd.textContent = set[k];
      dd.classList.remove("is-empty");
      if (!reduceMotion) {
        row.classList.add("is-new");
        setTimeout(function () { row.classList.remove("is-new"); }, 700);
      }
    });
  }

  function rowsList(items, cls) {
    var ul = document.createElement("ul");
    if (cls) ul.className = cls;
    items.forEach(function (o) {
      var it = document.createElement("li");
      it.className = "opt";
      var n = document.createElement("span"); n.textContent = o[0];
      var pr = document.createElement("b"); pr.textContent = o[1];
      it.appendChild(n); it.appendChild(pr);
      ul.appendChild(it);
    });
    return ul;
  }

  function bubble(step) {
    var li = document.createElement("li");
    li.className = "msg msg--" + step.f + (reduceMotion ? "" : " is-in");
    var p = document.createElement("span");
    p.textContent = step.t;
    li.appendChild(p);
    if (step.opts) li.appendChild(rowsList(step.opts));
    if (step.sum) li.appendChild(rowsList(step.sum, "sum"));
    if (step.after) {
      var a = document.createElement("span");
      a.style.display = "block";
      a.textContent = step.after;
      li.appendChild(a);
    }
    if (step.pay) {
      var pay = document.createElement("span");
      pay.className = "paylink";
      pay.textContent = "رابط الدفع الخاص بالمقهى";
      li.appendChild(document.createElement("br"));
      li.appendChild(pay);
    }
    return li;
  }

  function step() {
    var s = SCENARIOS[state.key];
    if (state.i >= s.steps.length) return false;
    var st = s.steps[state.i++];
    thread.appendChild(bubble(st));
    if (st.set) {
      fill(st.set);
      var labels = s.fields.filter(function (f) { return st.set[f[0]]; }).map(function (f) { return f[1]; });
      var note = document.createElement("li");
      note.className = "msg msg--note" + (reduceMotion ? "" : " is-in");
      note.textContent = "سُجّل في بطاقة الطلب: " + labels.join("، ");
      thread.appendChild(note);
    }
    if (st.status) setStatus(st.status);
    updateSummary();
    thread.scrollTop = thread.scrollHeight;
    updateControls();
    return true;
  }

  function isDone() { return state.i >= SCENARIOS[state.key].steps.length; }

  function updateControls() {
    var done = isDone();
    btnNext.disabled = done;
    btnAll.disabled = done;
    btnNext.textContent = done ? "انتهى المثال" : "الرسالة التالية";
    if (btnPlay) {
      btnPlay.disabled = done;
      btnPlay.dataset.playing = state.auto ? "true" : "false";
      playLabel.textContent = state.auto ? "إيقاف مؤقت" : (state.i > 1 && !done ? "استئناف" : "تشغيل تلقائي");
    }
  }

  // مؤشر كتابة قصير قبل رد الوكيل، أثناء التشغيل التلقائي فقط
  var typingEl = null;
  function clearTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }
  function showTyping() {
    clearTyping();
    typingEl = document.createElement("li");
    typingEl.className = "msg msg--a msg--typing";
    typingEl.setAttribute("aria-hidden", "true");
    typingEl.innerHTML = "<i></i><i></i><i></i>";
    thread.appendChild(typingEl);
    thread.scrollTop = thread.scrollHeight;
  }

  function stopAuto() { state.auto = false; clearTimeout(state.timer); clearTyping(); updateControls(); }

  // يتقدم رسالة كل ١٫٥ ثانية تقريبًا حتى النهاية أو حتى الإيقاف
  function startAuto() {
    if (isDone()) return;
    clearTimeout(state.timer);
    state.auto = true;
    updateControls();
    (function tick() {
      state.timer = setTimeout(function () {
        if (!state.auto) return;
        var next = SCENARIOS[state.key].steps[state.i];
        var advance = function () {
          clearTyping();
          if (step() && !isDone()) tick(); else stopAuto();
        };
        if (next && next.f === "a" && !reduceMotion) {
          showTyping();
          state.timer = setTimeout(function () { if (state.auto) advance(); }, 850);
        } else {
          advance();
        }
      }, 1300);
    })();
  }

  function load(key, play) {
    stopAuto();
    state.key = key; state.i = 0;
    thread.innerHTML = "";
    renderTicket();
    step();
    // مع «تقليل الحركة» لا يبدأ العرض من نفسه؛ الزائر يشغّله بزر التشغيل
    if (play && !reduceMotion) startAuto();
  }

  btnNext.addEventListener("click", function () { stopAuto(); step(); });
  btnAll.addEventListener("click", function () { stopAuto(); while (step()) {} });
  btnReset.addEventListener("click", function () { load(state.key, true); });
  if (btnPlay) btnPlay.addEventListener("click", function () { if (state.auto) stopAuto(); else startAuto(); });

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", tab.id);
    if (focus) tab.focus();
    // انتقال ناعم: المحتوى الجديد جاهز فورًا، ويظهر بتلاشٍ قصير
    panel.classList.add("is-switching");
    load(tab.dataset.scenario, true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { panel.classList.remove("is-switching"); });
    });
  }
  tabs.forEach(function (t, idx) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      // في RTL: السهم الأيسر ينقل للتبويب التالي
      var d = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      selectTab(tabs[(idx + d + tabs.length) % tabs.length], true);
    });
  });

  load("event", false);

  // يبدأ العرض تلقائيًا عند الوصول للقسم، مرة واحدة
  if ("IntersectionObserver" in window) {
    var started = false;
    var demoIo = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !started) {
        started = true;
        if (state.i <= 1 && !reduceMotion) startAuto();
        demoIo.disconnect();
      }
    }, { threshold: 0.35 });
    demoIo.observe(panel);
  }
  /* ---------- ٥. الحركة: ظهور تدريجي وعمق خفيف ---------- */

  var motionOK = !reduceMotion && "IntersectionObserver" in window;

  if (motionOK) {
    // مجموعات تظهر بالتتابع عند دخولها الشاشة
    [".section-head", ".origin__copy", ".journey__step", ".timeline > li", ".rail > li", ".ledger__col",
     ".measure__copy", ".report", ".control__col", ".handoff", ".faq details", ".close__copy > h2",
     ".close__copy > p", ".after li", ".compose"].forEach(function (sel) {
      $$(sel).forEach(function (el) {
        el.setAttribute("data-reveal", "");
        var sib = el.parentElement ? $$(":scope > [data-reveal]", el.parentElement) : [el];
        el.style.setProperty("--rd", Math.min(sib.indexOf(el), 6));
      });
    });
    var revealIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); revealIo.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$("[data-reveal]").forEach(function (el) { revealIo.observe(el); });
    document.documentElement.classList.add("motion-ready");

    // عمق خفيف لصور الخلفية على الكمبيوتر فقط، دون التحكم في التمرير
    var desk = window.matchMedia("(min-width: 960px)");
    var layers = $$("[data-parallax]");
    var ticking = false;
    var parallax = function () {
      ticking = false;
      if (!desk.matches) return;
      var vh = window.innerHeight;
      layers.forEach(function (img) {
        var r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var offset = (r.top + r.height / 2 - vh / 2) * parseFloat(img.getAttribute("data-parallax"));
        img.style.setProperty("--py", (-offset).toFixed(1) + "px");
      });
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
    }, { passive: true });
    parallax();
  }
})();
