/* =========================================================
   ส่วนกลางของหน้าแบบฝึกหัดทุกชุด — ไม่มีตรรกะสร้างโจทย์/เฉลย ขอจาก API เท่านั้น
   ใช้: Exercise.start({ id: "รหัสชุดโจทย์", title: "ชื่อที่แสดง" })
   ========================================================= */
(function () {
  "use strict";

  function el(tag, cls, ...kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    kids.forEach((k) => e.append(k));
    return e;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- KaTeX (ไม่ใช้ innerHTML กับข้อมูลจาก API) ---------- */
  function mathSpan(latex, cls) {
    const s = el("span", cls);
    if (window.katex) katex.render(latex, s, { throwOnError: false });
    else s.textContent = latex;
    return s;
  }
  function fixNumbers(root) {
    root.querySelectorAll(".katex-html .mord").forEach((node) => {
      if (node.children.length === 0 && /^\d+$/.test(node.textContent.trim()) &&
          !node.closest(".mfrac, .msupsub, .sqrt, .mroot, .sizing, .mtight")) node.classList.add("ordinary-number");
    });
  }
  // ส่วนของข้อความ: สตริง = ข้อความ, {m: tex} = สูตร   (รูป/กราฟ {fig: ...} จะรองรับภายหลัง — ตอนนี้ข้าม)
  function appendSegs(parent, segs, mathCls) {
    (segs || []).forEach((seg) => {
      if (typeof seg === "string") parent.append(seg);
      else if (seg && typeof seg.m === "string") parent.append(mathSpan(seg.m, mathCls));
    });
  }

  /* ---------- เปลือกหน้าจอ ---------- */
  function buildShell(title) {
    document.title = title;
    const body = document.body;
    body.replaceChildren(
      el("div", "blob blob-1"), el("div", "blob blob-2"),
      Object.assign(el("div", "eyebrow"), { textContent: title }),
      el("div", "stage",
        Object.assign(el("div", "expr"), { id: "exprEl" }),
        Object.assign(el("div", "answer-wrap", Object.assign(el("div", "answer-line"), { id: "answerLine" })), { id: "answerWrap" }),
        Object.assign(el("div", "prompt"), { id: "promptEl" })),
      el("div", "controls",
        Object.assign(el("button", "btn-next"), { id: "nextBtn", textContent: "ข้อต่อไป" }),
        Object.assign(el("button", "btn-toggle"), { id: "toggleBtn", textContent: "ดูเฉลย" }),
        Object.assign(el("button", "btn-end"), { id: "endBtn", textContent: "จบ" })),
      el("div", "end-screen",
        Object.assign(el("div", "headline"), { textContent: "ความพยายามต้องใช้ให้ถูกที่จึงมีประโยชน์" }),
        Object.assign(el("button", "btn-restart"), { id: "restartBtn", textContent: "เริ่มใหม่" })));
    body.querySelector(".end-screen").id = "endScreen";
    document.getElementById("answerWrap").style.display = "none";
  }

  function start(opts) {
    const base = (window.APP_CONFIG && window.APP_CONFIG.apiBase) || "";
    const API = `${base}/api/${encodeURIComponent(opts.id)}`;
    buildShell(opts.title);

    const $ = (id) => document.getElementById(id);
    const exprEl = $("exprEl"), answerWrap = $("answerWrap"), answerLine = $("answerLine"), promptEl = $("promptEl");
    const nextBtn = $("nextBtn"), toggleBtn = $("toggleBtn"), endBtn = $("endBtn"), endScreen = $("endScreen"), restartBtn = $("restartBtn");

    let current = null, showingAnswer = false, busy = false;

    function renderProblem(P) {
      exprEl.replaceChildren(...P.problem.rows.flatMap((row) => {
        const out = [];
        if (row.text) { const d = el("div", "lbl"); appendSegs(d, row.text, "mm"); out.push(d); }
        if (row.math) out.push(el("div", "m", mathSpan(row.math)));
        return out;
      }));
      fixNumbers(exprEl);
    }
    function renderSolution(S) {
      const steps = el("div", "steps");
      S.steps.forEach((segs) => { const row = el("div", "st"); appendSegs(row, segs, "mm"); steps.append(row); });
      const lbl = el("span", "lbl"); lbl.textContent = "คำตอบ";
      answerLine.replaceChildren(steps, el("div", "final", lbl, " ", mathSpan(S.answer)));
      fixNumbers(answerLine);
    }

    async function api(path, init) {
      const res = await fetch(API + path, { cache: "no-store", ...init });
      let data = null; try { data = await res.json(); } catch (e) {}
      return { status: res.status, data };
    }
    async function fetchProblem() {
      for (let i = 0; i < 3; i++) {
        const { status, data } = await api("/problem");
        if (status === 200 && data && data.token && data.problem) return data;
        if (status === 429) { await sleep(((data && data.retry) || 5) * 1000); continue; }
        break;
      }
      throw new Error("problem");
    }
    async function fetchSolution(P) {
      const w = P.readyAt - Date.now();
      if (w > 0) await sleep(w);
      for (let i = 0; i < 3; i++) {
        const { status, data } = await api("/solution", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ token: P.token }) });
        if (status === 200 && data && Array.isArray(data.steps)) return data;
        if (status === 425) { await sleep(Math.ceil(((data && data.wait) || 1) * 1000) + 100); continue; }
        if (status === 429) { await sleep(((data && data.retry) || 5) * 1000); continue; }
        break;
      }
      throw new Error("solution");
    }

    const setMsg = (t) => { promptEl.textContent = t || ""; };
    function displayProblem() { exprEl.style.display = ""; answerWrap.style.display = "none"; toggleBtn.textContent = "ดูเฉลย"; showingAnswer = false; }
    function displayAnswer() { exprEl.style.display = "none"; answerWrap.style.display = ""; toggleBtn.textContent = "ดูโจทย์"; showingAnswer = true; }

    async function showNext() {
      if (busy) return;
      busy = true;
      exprEl.classList.add("swap"); answerWrap.classList.add("swap"); setMsg("");
      try {
        const [P] = await Promise.all([fetchProblem(), sleep(150)]);
        current = { ...P, solution: null, readyAt: Date.now() + (P.wait || 2) * 1000 + 400 };
        renderProblem(current); displayProblem();
      } catch (e) {
        setMsg("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองกด “ข้อต่อไป” อีกครั้ง");
      } finally {
        exprEl.classList.remove("swap"); answerWrap.classList.remove("swap"); busy = false;
      }
    }
    async function toggleAnswer() {
      if (busy || !current) return;
      if (showingAnswer) { displayProblem(); setMsg(""); return; }
      busy = true;
      try {
        if (!current.solution) {
          setMsg("กำลังโหลดเฉลย…");
          current.solution = await fetchSolution(current);
          renderSolution(current.solution);
        }
        setMsg(""); displayAnswer();
      } catch (e) {
        setMsg("โหลดเฉลยไม่สำเร็จ ลองกดอีกครั้ง");
      } finally { busy = false; }
    }

    nextBtn.addEventListener("click", showNext);
    toggleBtn.addEventListener("click", toggleAnswer);
    endBtn.addEventListener("click", () => endScreen.classList.add("show"));
    restartBtn.addEventListener("click", () => { endScreen.classList.remove("show"); showNext(); });

    if (window.katex) showNext(); else window.addEventListener("load", showNext);
  }

  window.Exercise = { start };
})();
