/* Al Tayebat International City — site behaviour and booking studio.
   Plain JS, no dependencies. State is replaced, never mutated in place. */
(function () {
  "use strict";

  const VAT_RATE = 0.15;
  const MAX_VISITORS = 12;
  const RATES = { SAR: 1, AED: 0.98, USD: 0.2667 };
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SATURDAY = 6;
  const FRIDAY = 5;

  const TICKETS = [
    {
      id: "general", name: "General admission", sub: "All five wings, at your own pace",
      from: 40, includes: ["All wings and houses", "Pilgrimage model", "Re-entry within 7 days"],
      visitors: [
        { id: "adult", label: "Adult", note: "13 and over", price: 40, min: 1, def: 2 },
        { id: "child", label: "Child", note: "6 to 12 years", price: 20, min: 0, def: 0 },
        { id: "infant", label: "Under 6", note: "Free, still needs a ticket", price: 0, min: 0, def: 0 }
      ]
    },
    {
      id: "guided", name: "Guided heritage tour", sub: "Ninety minutes with a museum guide, then free time",
      from: 65, includes: ["Everything in general admission", "Guide in Arabic or English", "Manuscript room talk"],
      visitors: [
        { id: "adult", label: "Adult", note: "13 and over", price: 65, min: 1, def: 2 },
        { id: "child", label: "Child", note: "6 to 12 years", price: 35, min: 0, def: 0 },
        { id: "infant", label: "Under 6", note: "Free, still needs a ticket", price: 0, min: 0, def: 0 }
      ]
    },
    {
      id: "family", name: "Family day", sub: "Two adults and up to three children", from: 130, fixed: true, save: "Save SAR 30",
      includes: ["General admission for all", "Courtyard tea for the adults", "Children's trail booklet"],
      visitors: [
        { id: "adult", label: "Adults", note: "Included in the package", price: 0, min: 2, max: 2, def: 2 },
        { id: "child", label: "Children", note: "6 to 12, up to three", price: 0, min: 1, max: 3, def: 2 },
        { id: "infant", label: "Under 6", note: "Free", price: 0, min: 0, def: 0 }
      ],
      packagePrice: 130
    },
    {
      id: "student", name: "Student and teacher", sub: "With a valid student or staff card", from: 25,
      includes: ["All wings and houses", "Study access to the coin rooms on request"],
      visitors: [
        { id: "adult", label: "Student", note: "Show your card at the gate", price: 25, min: 1, def: 1 }
      ]
    },
    {
      id: "walk", name: "City walk", sub: "The streets and courtyards only, no museum rooms", from: 0,
      includes: ["Outdoor streets and courtyards", "Mosque and majlis", "Any time in opening hours"],
      visitors: [
        { id: "adult", label: "Visitor", note: "Any age", price: 0, min: 1, def: 2 }
      ]
    }
  ];

  const ADDONS = { audio: { label: "Audio guide", price: 15 }, tea: { label: "Hijazi tea", price: 25 } };

  const SLOTS = [
    { time: "08:30", note: "Quietest" }, { time: "10:30", note: "Guided tour, English" },
    { time: "13:00", note: "" }, { time: "16:00", note: "Guided tour, Arabic" },
    { time: "18:00", note: "Golden hour in the courtyards" }, { time: "19:30", note: "Last entry 20:00" }
  ];

  const initialState = {
    step: 1, ticketId: null, date: null, slot: null,
    counts: {}, addons: { audio: false, tea: false }, currency: "SAR",
    calMonth: startOfMonth(new Date()), confirmed: null
  };
  let state = initialState;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function setState(patch) {
    state = Object.freeze({ ...state, ...patch });
    render();
  }

  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function sameDay(a, b) { return a && b && a.toDateString() === b.toDateString(); }
  function isPast(d) { const t = new Date(); t.setHours(0, 0, 0, 0); return d < t; }
  function fmtDate(d) { return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function money(sar, currency) {
    const v = sar * RATES[currency || state.currency];
    const rounded = currency === "USD" || state.currency === "USD" ? v.toFixed(2) : Math.round(v).toString();
    return `${currency || state.currency} ${rounded}`;
  }
  function ticket() { return TICKETS.find((t) => t.id === state.ticketId) || null; }

  function defaultCounts(t) {
    return t.visitors.reduce((acc, v) => ({ ...acc, [v.id]: v.def }), {});
  }

  function totalVisitors() { return Object.values(state.counts).reduce((a, b) => a + b, 0); }

  function priceLines() {
    const t = ticket();
    if (!t) return [];
    const lines = [];
    if (t.packagePrice != null) {
      lines.push({ label: t.name, qty: 1, sar: t.packagePrice });
    } else {
      t.visitors.forEach((v) => {
        const n = state.counts[v.id] || 0;
        if (n > 0) lines.push({ label: `${v.label} × ${n}`, qty: n, sar: n * v.price });
      });
    }
    const people = totalVisitors();
    Object.keys(ADDONS).forEach((k) => {
      if (state.addons[k] && people > 0) lines.push({ label: `${ADDONS[k].label} × ${people}`, qty: people, sar: people * ADDONS[k].price });
    });
    return lines;
  }
  function total() { return priceLines().reduce((a, l) => a + l.sar, 0); }

  /* ---------- rendering ---------- */
  function render() {
    renderSteps();
    renderTickets();
    renderCalendar();
    renderSlots();
    renderVisitors();
    renderSummary();
    renderConfirm();
  }

  function renderSteps() {
    const reachable = { 1: true, 2: !!state.ticketId, 3: !!(state.ticketId && state.date && state.slot), 4: !!(state.ticketId && state.date && state.slot && totalVisitors() > 0) };
    $$(".steps button").forEach((b) => {
      const n = Number(b.dataset.step);
      b.disabled = !reachable[n];
      b.classList.toggle("done", n < state.step);
      if (n === state.step && !state.confirmed) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    $$(".panel").forEach((p) => p.classList.toggle("active", Number(p.dataset.panel) === state.step && !state.confirmed));
    $('[data-panel="1"] [data-next]').disabled = !reachable[2];
    $('[data-panel="2"] [data-next]').disabled = !reachable[3];
    $('[data-panel="3"] [data-next]').disabled = !reachable[4];
  }

  function renderTickets() {
    const list = $("#ticket-list");
    if (list.childElementCount === 0) {
      list.innerHTML = TICKETS.map((t) => `
        <button type="button" class="ticket" data-ticket="${t.id}" aria-pressed="false">
          <div>
            <h4>${t.name}</h4>
            <div class="ticket-sub">${t.sub}</div>
            <ul>${t.includes.map((i) => `<li>${i}</li>`).join("")}</ul>
          </div>
          <div class="ticket-price">
            <span class="from">${t.fixed ? "Package" : "From"}</span>
            <span class="amount" data-sar="${t.from}">${t.from === 0 ? "Free" : money(t.from)}</span>
            <span class="vat">VAT included</span>
            ${t.save ? `<span class="save">${t.save}</span>` : ""}
          </div>
        </button>`).join("");
    }
    $$(".ticket", list).forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.ticket === state.ticketId));
      const amt = $(".amount", b);
      const sar = Number(amt.dataset.sar);
      amt.textContent = sar === 0 ? "Free" : money(sar);
    });
  }

  function renderCalendar() {
    const cal = $("#calendar");
    const m = state.calMonth;
    $("#cal-title").textContent = m.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = DAY_NAMES.map((d) => `<div class="dow">${d}</div>`);
    for (let i = 0; i < first.getDay(); i++) cells.push("<div></div>");
    for (let d = 1; d <= days; d++) {
      const date = new Date(m.getFullYear(), m.getMonth(), d);
      const closed = date.getDay() === SATURDAY;
      const disabled = isPast(date) || closed;
      const note = closed ? "groups" : date.getDay() === FRIDAY ? "from 16:00" : "";
      cells.push(`<button type="button" class="day" data-date="${date.toISOString()}" ${disabled ? "disabled" : ""} aria-pressed="${sameDay(date, state.date)}" aria-label="${fmtDate(date)}${closed ? ", groups only" : ""}">${d}${note ? `<small>${note}</small>` : ""}</button>`);
    }
    cal.innerHTML = cells.join("");
    const now = startOfMonth(new Date());
    $("#cal-prev").disabled = m <= now;
    $("#cal-next").disabled = m.getMonth() - now.getMonth() + 12 * (m.getFullYear() - now.getFullYear()) >= 2;
  }

  function renderSlots() {
    const box = $("#slots");
    if (!state.date) { box.innerHTML = '<p class="slots-empty">Pick a day first.</p>'; return; }
    const friday = state.date.getDay() === FRIDAY;
    const isToday = sameDay(state.date, new Date());
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    box.innerHTML = SLOTS.map((s) => {
      const [h, mm] = s.time.split(":").map(Number);
      const gone = isToday && h * 60 + mm <= nowMins + 30;
      const closedFri = friday && h < 16;
      const disabled = gone || closedFri;
      return `<button type="button" class="slot" data-slot="${s.time}" ${disabled ? "disabled" : ""} aria-pressed="${state.slot === s.time}">${s.time}<small>${closedFri ? "Closed Friday morning" : gone ? "Passed" : s.note || "Available"}</small></button>`;
    }).join("");
  }

  function renderVisitors() {
    const t = ticket();
    const box = $("#visitors");
    if (!t) { box.innerHTML = ""; return; }
    const people = totalVisitors();
    box.innerHTML = t.visitors.map((v) => {
      const n = state.counts[v.id] || 0;
      const max = v.max != null ? v.max : MAX_VISITORS;
      const canAdd = n < max && people < MAX_VISITORS;
      const priceText = t.packagePrice != null ? "Included" : v.price === 0 ? "Free" : money(v.price);
      return `<div class="visitor-row">
        <div><strong>${v.label} <span style="font-weight:400">· ${priceText}</span></strong><span>${v.note}</span></div>
        <div class="stepper" role="group" aria-label="${v.label}">
          <button type="button" data-dec="${v.id}" ${n <= v.min ? "disabled" : ""} aria-label="Fewer ${v.label}">−</button>
          <output aria-live="polite">${n}</output>
          <button type="button" data-inc="${v.id}" ${canAdd ? "" : "disabled"} aria-label="More ${v.label}">+</button>
        </div>
      </div>`;
    }).join("");
    $$("[data-addon]").forEach((cb) => { cb.checked = !!state.addons[cb.dataset.addon]; });
    $$(".addon-price").forEach((el) => { el.textContent = `${money(Number(el.dataset.price))} / visitor`; });
  }

  function renderSummary() {
    const t = ticket();
    const body = $("#summary-body");
    if (!t) { body.innerHTML = '<p class="summary-empty">Choose a ticket to begin.</p>'; $("#summary-total").textContent = money(0); return; }
    const lines = priceLines();
    const parts = [`<div><span>${t.name}</span><span class="muted">${t.sub}</span></div>`];
    parts.push(`<div><span class="muted">Date</span><span>${state.date ? fmtDate(state.date) : "Not chosen"}</span></div>`);
    parts.push(`<div><span class="muted">Time</span><span>${state.slot || "Not chosen"}</span></div>`);
    lines.forEach((l) => parts.push(`<div><span>${l.label}</span><span>${l.sar === 0 ? "Free" : money(l.sar)}</span></div>`));
    const gross = total();
    const vat = gross - gross / (1 + VAT_RATE);
    if (gross > 0) parts.push(`<div class="muted"><span>of which VAT 15%</span><span>${money(vat)}</span></div>`);
    body.innerHTML = `<div class="summary-lines">${parts.join("")}</div>`;
    $("#summary-total").textContent = gross === 0 ? "Free" : money(gross);
    $(".summary-total small").textContent = `VAT 15% included · charged in SAR${state.currency !== "SAR" ? ", shown in " + state.currency : ""}`;
  }

  function renderConfirm() {
    const box = $("#confirm");
    box.classList.toggle("active", !!state.confirmed);
    if (!state.confirmed) return;
    const c = state.confirmed;
    $("#c-email").textContent = c.email;
    $("#c-ticket").textContent = c.ticketName;
    $("#c-date").textContent = fmtDate(c.date);
    $("#c-time").textContent = c.slot;
    $("#c-visitors").textContent = c.visitors;
    $("#c-ref").textContent = c.ref;
    $("#c-name").textContent = c.name;
    $("#c-total").textContent = c.total === 0 ? "Free" : money(c.total, "SAR");
    $("#qr").innerHTML = qrPattern(c.ref);
    $("#ics-link").href = icsHref(c);
  }

  function finderCell(r, c) {
    const ring = r === 0 || r === 4 || c === 0 || c === 4;
    return ring || (r === 2 && c === 2);
  }

  function qrPattern(seed) {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const cells = [];
    for (let i = 0; i < 256; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      const r = Math.floor(i / 16), c = i % 16;
      let on;
      if (r < 5 && c < 5) on = finderCell(r, c);
      else if (r < 5 && c > 10) on = finderCell(r, c - 11);
      else if (r > 10 && c < 5) on = finderCell(r - 11, c);
      else on = (h >> 7) % 2 === 0;
      cells.push(`<i class="${on ? "" : "off"}"></i>`);
    }
    return cells.join("");
  }

  function icsHref(c) {
    const [h, m] = c.slot.split(":").map(Number);
    const start = new Date(c.date); start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 3 * 3600 * 1000);
    const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Al Tayebat International City//Booking//EN", "BEGIN:VEVENT",
      `UID:${c.ref}@altayebat`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:Al Tayebat International City – ${c.ticketName}`, `DESCRIPTION:Booking ${c.ref}. ${c.visitors}. Show the QR code at the main gate.`,
      "LOCATION:Rayhanat Al Jazirah Street, Al Faisaliyah, Jeddah", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
  }

  /* ---------- events ---------- */
  function goTo(step) {
    setState({ step });
    const panel = $(`.panel[data-panel="${step}"]`);
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("button, a");
    if (!el) return;
    if (el.matches(".ticket")) {
      const t = TICKETS.find((x) => x.id === el.dataset.ticket);
      setState({ ticketId: t.id, counts: defaultCounts(t), addons: { audio: false, tea: false } });
      return;
    }
    if (el.matches(".day") && !el.disabled) { setState({ date: new Date(el.dataset.date), slot: null }); return; }
    if (el.matches(".slot") && !el.disabled) { setState({ slot: el.dataset.slot }); return; }
    if (el.matches("#cal-prev")) { setState({ calMonth: new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() - 1, 1) }); return; }
    if (el.matches("#cal-next")) { setState({ calMonth: new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() + 1, 1) }); return; }
    if (el.dataset.inc) { setState({ counts: { ...state.counts, [el.dataset.inc]: (state.counts[el.dataset.inc] || 0) + 1 } }); return; }
    if (el.dataset.dec) { setState({ counts: { ...state.counts, [el.dataset.dec]: (state.counts[el.dataset.dec] || 0) - 1 } }); return; }
    if (el.matches(".steps button") && !el.disabled) { goTo(Number(el.dataset.step)); return; }
    if (el.hasAttribute("data-next")) { goTo(state.step + 1); return; }
    if (el.hasAttribute("data-prev")) { goTo(state.step - 1); return; }
    if (el.matches("#confirm-btn")) { confirmBooking(); return; }
    if (el.matches("#restart-btn")) { state = initialState; render(); goTo(1); return; }
    if (el.matches(".video-play")) { playVideo(el.closest(".video")); return; }
    if (el.matches(".nav-toggle")) { toggleNav(el); return; }
    if (el.matches(".site-nav a")) { const nav = $("#site-nav"); nav.classList.remove("open"); $(".nav-toggle").setAttribute("aria-expanded", "false"); }
  });

  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-addon]")) setState({ addons: { ...state.addons, [e.target.dataset.addon]: e.target.checked } });
    if (e.target.matches("#currency")) setState({ currency: e.target.value });
  });

  function confirmBooking() {
    const form = $("#review-form");
    let valid = true;
    $$(".field", form).forEach((f) => {
      const input = $("input", f);
      if (!input || !input.required) return;
      const ok = input.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value) : input.value.trim().length > 1;
      f.classList.toggle("invalid", !ok);
      if (!ok) valid = false;
    });
    if (!$("#f-agree").checked) { toast("Please accept the visitor terms to continue."); valid = false; }
    if (!valid) { toast("Check the highlighted fields."); return; }
    const t = ticket();
    const visitors = t.visitors.filter((v) => (state.counts[v.id] || 0) > 0).map((v) => `${state.counts[v.id]} ${v.label.toLowerCase()}`).join(", ");
    const ref = "TYB-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase();
    setState({
      confirmed: {
        ref, email: $("#f-email").value.trim(), name: `${$("#f-first").value.trim()} ${$("#f-last").value.trim()}`,
        ticketName: t.name, date: state.date, slot: state.slot, visitors, total: total()
      }
    });
    $("#confirm").scrollIntoView({ behavior: "smooth", block: "start" });
    toast(`Booked. Reference ${ref}.`);
  }

  function playVideo(box) {
    const id = box.dataset.video;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = box.querySelector("strong").textContent;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    box.replaceChildren(iframe);
  }

  function toggleNav(btn) {
    const nav = $("#site-nav");
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function markToday() {
    const day = new Date().getDay();
    const row = $(`#hours-table tr[data-day="${day}"]`);
    if (!row) return;
    row.classList.add("today");
    const hours = row.children[1].textContent;
    $("#today-hours").textContent = day === SATURDAY ? "Today: groups and families only" : `Open today ${hours}`;
  }

  /* Hero film: the museum's own walkthrough, muted, behind the title.
     Loads only when the tab is visible and motion is allowed; the still stays otherwise. */
  function heroFilm() {
    const box = $("#hero-film");
    const iframe = $("#hero-iframe");
    document.documentElement.classList.add("anim");
    setTimeout(() => document.documentElement.classList.remove("anim"), 2500);
    if (!box || !iframe) return;
    const toggle = $("#sound-toggle");
    let muted = true;
    const show = () => { if (!box.classList.contains("playing")) { box.classList.add("playing"); toggle.hidden = false; } };
    const send = (func) => iframe.contentWindow && iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: "" }), "*");
    let ready = false;
    window.addEventListener("message", (e) => {
      if (e.origin !== "https://www.youtube-nocookie.com") return;
      let data; try { data = JSON.parse(e.data); } catch (err) { return; }
      if (data.event === "onReady") { ready = true; send("playVideo"); }
      if (data.event === "infoDelivery" && data.info && data.info.playerState === 1) show();
      if (data.event === "onStateChange" && data.info === 1) show();
    });
    // The player may finish loading before this script runs, so keep asking to listen until it answers.
    const listen = () => iframe.contentWindow && iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
    const poll = setInterval(() => { if (ready) clearInterval(poll); else listen(); }, 300);
    iframe.addEventListener("load", listen);
    listen();
    setTimeout(() => clearInterval(poll), 15000);
    setTimeout(show, 8000);
    toggle.addEventListener("click", () => {
      muted = !muted;
      send(muted ? "mute" : "unMute");
      toggle.setAttribute("aria-pressed", String(!muted));
      toggle.querySelector("span").textContent = muted ? "Sound on" : "Sound off";
    });
  }

  function headerOnScroll() {
    const header = $("#site-header");
    const hero = $(".hero");
    if (!header || !hero) return;
    const update = () => header.classList.toggle("solid", window.scrollY > hero.offsetHeight - 80);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ---------- v3 interface: progress line, chapter index, reveals, wings gallery, week strip ---------- */
  function scrollChrome() {
    const bar = $("#progress");
    const cta = $("#float-cta");
    const hero = $(".hero");
    let ticketsInView = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
      if (cta && hero) cta.classList.toggle("show", scrollY > hero.offsetHeight - 100 && !ticketsInView);
    };
    const tickets = $("#tickets");
    if (tickets && "IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { ticketsInView = entries[0].isIntersecting; update(); }, { rootMargin: "-20% 0px -20% 0px" }).observe(tickets);
    }
    update();
    addEventListener("scroll", update, { passive: true });
  }

  function chapterIndex() {
    const nav = $("#chapters");
    if (!nav || !("IntersectionObserver" in window)) return;
    const links = $$("a", nav);
    const dark = new Set(["watch", "plan"]);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${en.target.id}`));
        nav.classList.toggle("on-dark", dark.has(en.target.id));
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    links.forEach((a) => { const el = $(a.getAttribute("href")); if (el) io.observe(el); });
  }

  function reveals() {
    const els = $$("[data-reveal]");
    if (!els.length || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    els.forEach((el) => io.observe(el));
  }

  function wingsGallery() {
    const track = $("#walk-track");
    if (!track) return;
    const panels = $$(".wing-panel", track);
    const dots = $("#walk-dots");
    const prev = $("#walk-prev"), next = $("#walk-next");
    dots.innerHTML = panels.map(() => "<span></span>").join("");
    const step = () => panels[0].getBoundingClientRect().width + 18;
    const index = () => Math.round(track.scrollLeft / step());
    const update = () => {
      const i = Math.min(index(), panels.length - 1);
      $$("span", dots).forEach((d, k) => d.classList.toggle("active", k === i));
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    track.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  }

  function weekStrip() {
    const box = $("#week");
    if (!box) return;
    const today = new Date().getDay();
    const short = { 0: "8–21", 1: "8–21", 2: "8–21", 3: "8–21", 4: "8–21", 5: "16–21", 6: "Groups" };
    box.innerHTML = DAY_NAMES.map((d, i) => `<span class="${i === today ? "today" : ""}"><b>${d}</b>${short[i]}</span>`).join("");
  }

  markToday();
  heroFilm();
  headerOnScroll();
  scrollChrome();
  chapterIndex();
  reveals();
  wingsGallery();
  weekStrip();
  render();
})();
