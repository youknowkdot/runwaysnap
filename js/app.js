(function () {
  const cfg = window.RUNWAYSNAP_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    mode: "burn", // burn | income
    startingCash: "",
    monthlyBurn: "",
    monthlyIncome: "",
    monthlyExpenses: "",
  };

  function toast(msg) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function applyProUI() {
    const on = window.RSStorage.isPro();
    document.body.classList.toggle("is-pro", on);
    const status = $("#proStatus");
    if (status) {
      status.textContent = on ? "Pro unlocked" : "Free";
    }
  }

  function checkQueryPro() {
    const params = new URLSearchParams(location.search);
    if (params.get("pro") === "1") {
      window.RSStorage.setPro(true);
      // clean URL without reload noise
      params.delete("pro");
      const q = params.toString();
      history.replaceState(
        null,
        "",
        location.pathname + (q ? "?" + q : "") + location.hash
      );
      toast("Pro unlocked via link");
    }
  }

  function loadSaved() {
    const saved = window.RSStorage.getInputs();
    if (!saved) return;
    Object.assign(state, saved);
    $("#startingCash").value = state.startingCash ?? "";
    $("#monthlyBurn").value = state.monthlyBurn ?? "";
    $("#monthlyIncome").value = state.monthlyIncome ?? "";
    $("#monthlyExpenses").value = state.monthlyExpenses ?? "";
    setMode(state.mode || "burn", false);
  }

  function persist() {
    window.RSStorage.saveInputs({
      mode: state.mode,
      startingCash: state.startingCash,
      monthlyBurn: state.monthlyBurn,
      monthlyIncome: state.monthlyIncome,
      monthlyExpenses: state.monthlyExpenses,
    });
  }

  function setMode(mode, recalc = true) {
    state.mode = mode;
    $$(".segmented button").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.mode === mode ? "true" : "false");
    });
    $("#burnFields").hidden = mode !== "burn";
    $("#incomeFields").hidden = mode !== "income";
    if (recalc) {
      persist();
      recalculate();
    }
  }

  function readInputs() {
    state.startingCash = $("#startingCash").value;
    state.monthlyBurn = $("#monthlyBurn").value;
    state.monthlyIncome = $("#monthlyIncome").value;
    state.monthlyExpenses = $("#monthlyExpenses").value;
  }

  function hasUsefulInput() {
    const cash = parseFloat(state.startingCash);
    if (!isFinite(cash)) return false;
    if (state.mode === "burn") {
      return state.monthlyBurn !== "" && isFinite(parseFloat(state.monthlyBurn));
    }
    return (
      (state.monthlyIncome !== "" || state.monthlyExpenses !== "") &&
      (isFinite(parseFloat(state.monthlyIncome)) ||
        isFinite(parseFloat(state.monthlyExpenses)))
    );
  }

  function recalculate() {
    readInputs();
    persist();

    const empty = $("#emptyResults");
    const filled = $("#filledResults");

    if (!hasUsefulInput()) {
      empty.hidden = false;
      filled.hidden = true;
      window.RSChart.render($("#runwayChart"), [], []);
      updatePrintBrief(null);
      return;
    }

    empty.hidden = true;
    filled.hidden = false;

    const norm = window.RSCalc.normalize({
      startingCash: parseFloat(state.startingCash),
      monthlyBurn: parseFloat(state.monthlyBurn),
      monthlyIncome: parseFloat(state.monthlyIncome),
      monthlyExpenses: parseFloat(state.monthlyExpenses),
      mode: state.mode,
    });

    const months = window.RSCalc.monthsOfRunway(
      norm.startingCash,
      norm.netBurn
    );
    const zero = window.RSCalc.zeroCashDate(norm.startingCash, norm.netBurn);
    const sev = window.RSCalc.severity(months);

    const runwayEl = $("#outRunway");
    runwayEl.textContent = window.RSCalc.formatMonths(months);
    runwayEl.className = "value " + sev;

    $("#outZero").textContent = window.RSCalc.formatDate(zero);
    $("#outZero").className = "value " + sev;

    const burnLabel =
      norm.netBurn > 0
        ? window.RSCalc.formatMoney(norm.netBurn) + " / mo burn"
        : norm.netBurn < 0
          ? window.RSCalc.formatMoney(-norm.netBurn) + " / mo surplus"
          : "Break-even";
    $("#outBurn").textContent = burnLabel;

    $("#outCash").textContent = window.RSCalc.formatMoney(norm.startingCash);

    const series = window.RSCalc.projectionSeries(
      norm.startingCash,
      norm.netBurn
    );
    window.RSChart.render($("#runwayChart"), series.labels, series.values);

    updatePrintBrief({
      norm,
      months,
      zero,
      series,
    });

    // hero preview if present
    const heroRunway = $("#heroRunway");
    if (heroRunway) {
      heroRunway.textContent = window.RSCalc.formatMonths(months);
      heroRunway.className = "value " + sev;
    }
    const heroZero = $("#heroZero");
    if (heroZero) heroZero.textContent = window.RSCalc.formatDate(zero);
  }

  function updatePrintBrief(data) {
    const root = $("#printBrief");
    if (!root) return;
    if (!data) {
      root.innerHTML = "";
      return;
    }
    const { norm, months, zero, series } = data;
    const name =
      ($("#scenarioName") && $("#scenarioName").value) || "Current scenario";
    const rows = series.labels
      .map(
        (l, i) =>
          `<tr><td>${l}</td><td>${window.RSCalc.formatMoney(series.values[i])}</td></tr>`
      )
      .slice(0, 13)
      .join("");

    root.innerHTML = `
      <div class="print-brief">
        <h1>RunwaySnap Brief</h1>
        <p class="meta">${escapeHtml(name)} · Generated ${new Date().toLocaleString()} · Not financial advice</p>
        <div class="grid">
          <div class="box"><div class="l">Starting cash</div><div class="v">${window.RSCalc.formatMoney(norm.startingCash)}</div></div>
          <div class="box"><div class="l">Net monthly burn</div><div class="v">${window.RSCalc.formatMoney(norm.netBurn)}</div></div>
          <div class="box"><div class="l">Runway</div><div class="v">${window.RSCalc.formatMonths(months)}</div></div>
        </div>
        <p><strong>Projected zero-cash date:</strong> ${window.RSCalc.formatDate(zero)}</p>
        <h2 style="font-size:12pt;margin:16pt 0 8pt">Cash projection</h2>
        <table>
          <thead><tr><th>Month</th><th>Projected cash</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>RunwaySnap · Client-side estimate for planning only. Verify with your books.</footer>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* —— Pro unlock —— */
  function openUnlockModal() {
    $("#unlockModal").classList.add("open");
    $("#demoCode").focus();
  }
  function closeUnlockModal() {
    $("#unlockModal").classList.remove("open");
  }

  function tryDemoCode() {
    const code = ($("#demoCode").value || "").trim().toUpperCase();
    if (code === cfg.DEMO_CODE) {
      window.RSStorage.setPro(true);
      applyProUI();
      closeUnlockModal();
      toast("Pro unlocked — welcome aboard");
      renderScenarios();
    } else {
      toast("That code didn’t work. Try RUNWAY-PRO for the demo.");
    }
  }

  function goCheckout() {
    const url = cfg.YOUR_CHECKOUT_URL;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /* —— Scenarios (Pro) —— */
  function renderScenarios() {
    const list = $("#scenarioList");
    if (!list) return;
    const scenarios = window.RSStorage.getScenarios();
    if (!scenarios.length) {
      list.innerHTML =
        '<li style="color:var(--ink-faint);justify-content:center">No saved scenarios yet</li>';
      return;
    }
    list.innerHTML = scenarios
      .map(
        (s, i) => `
      <li>
        <span>${escapeHtml(s.name)}</span>
        <span class="actions">
          <button type="button" class="btn btn-ghost btn-sm" data-load="${i}">Load</button>
          <button type="button" class="btn btn-ghost btn-sm" data-del="${i}" aria-label="Delete">✕</button>
        </span>
      </li>`
      )
      .join("");
  }

  function saveScenario() {
    if (!window.RSStorage.isPro()) {
      openUnlockModal();
      return;
    }
    readInputs();
    const name = ($("#scenarioName").value || "").trim() || "Untitled";
    const scenarios = window.RSStorage.getScenarios();
    scenarios.push({
      name,
      mode: state.mode,
      startingCash: state.startingCash,
      monthlyBurn: state.monthlyBurn,
      monthlyIncome: state.monthlyIncome,
      monthlyExpenses: state.monthlyExpenses,
      savedAt: new Date().toISOString(),
    });
    window.RSStorage.saveScenarios(scenarios);
    renderScenarios();
    toast("Scenario saved");
  }

  function loadScenario(i) {
    const scenarios = window.RSStorage.getScenarios();
    const s = scenarios[i];
    if (!s) return;
    state.mode = s.mode;
    state.startingCash = s.startingCash;
    state.monthlyBurn = s.monthlyBurn;
    state.monthlyIncome = s.monthlyIncome;
    state.monthlyExpenses = s.monthlyExpenses;
    $("#startingCash").value = s.startingCash ?? "";
    $("#monthlyBurn").value = s.monthlyBurn ?? "";
    $("#monthlyIncome").value = s.monthlyIncome ?? "";
    $("#monthlyExpenses").value = s.monthlyExpenses ?? "";
    if ($("#scenarioName")) $("#scenarioName").value = s.name;
    setMode(s.mode);
    toast("Loaded “" + s.name + "”");
  }

  function deleteScenario(i) {
    const scenarios = window.RSStorage.getScenarios();
    scenarios.splice(i, 1);
    window.RSStorage.saveScenarios(scenarios);
    renderScenarios();
  }

  /* —— CSV import (Pro) —— */
  function handleCsvFile(file) {
    if (!window.RSStorage.isPro()) {
      openUnlockModal();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = window.RSCalc.parseCsv(String(reader.result));
        if (result.startingCash != null) {
          $("#startingCash").value = String(Math.round(result.startingCash));
        }
        if (result.monthlyBurn != null) {
          setMode("burn", false);
          $("#monthlyBurn").value = String(
            Math.round(Math.abs(result.monthlyBurn))
          );
        }
        recalculate();
        toast("CSV imported — review the numbers");
      } catch (e) {
        toast(e.message || "Could not parse CSV");
      }
    };
    reader.readAsText(file);
  }

  function printBrief() {
    if (!window.RSStorage.isPro()) {
      openUnlockModal();
      return;
    }
    if (!hasUsefulInput()) {
      toast("Enter cash and burn first");
      return;
    }
    window.print();
  }

  function fillExample() {
    setMode("burn", false);
    $("#startingCash").value = "85000";
    $("#monthlyBurn").value = "12000";
    $("#monthlyIncome").value = "";
    $("#monthlyExpenses").value = "";
    recalculate();
    toast("Loaded example numbers");
  }

  function clearAll() {
    $("#startingCash").value = "";
    $("#monthlyBurn").value = "";
    $("#monthlyIncome").value = "";
    $("#monthlyExpenses").value = "";
    if ($("#scenarioName")) $("#scenarioName").value = "";
    recalculate();
    toast("Cleared");
  }

  function bind() {
    $$(".segmented button").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    ["startingCash", "monthlyBurn", "monthlyIncome", "monthlyExpenses"].forEach(
      (id) => {
        const el = $("#" + id);
        if (el) {
          el.addEventListener("input", recalculate);
          el.addEventListener("change", recalculate);
        }
      }
    );

    $("#btnExample")?.addEventListener("click", fillExample);
    $("#btnClear")?.addEventListener("click", clearAll);

    $$("[data-unlock]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openUnlockModal();
      })
    );

    $("#btnCheckout")?.addEventListener("click", goCheckout);
    $("#btnDemoUnlock")?.addEventListener("click", tryDemoCode);
    $("#demoCode")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryDemoCode();
    });
    $("#btnCloseModal")?.addEventListener("click", closeUnlockModal);
    $("#unlockModal")?.addEventListener("click", (e) => {
      if (e.target.id === "unlockModal") closeUnlockModal();
    });

    $("#btnSaveScenario")?.addEventListener("click", saveScenario);
    $("#scenarioList")?.addEventListener("click", (e) => {
      const load = e.target.closest("[data-load]");
      const del = e.target.closest("[data-del]");
      if (load) loadScenario(Number(load.dataset.load));
      if (del) deleteScenario(Number(del.dataset.del));
    });

    $("#csvInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) handleCsvFile(file);
      e.target.value = "";
    });

    $("#btnPrint")?.addEventListener("click", printBrief);

    $("#btnLockPro")?.addEventListener("click", () => {
      window.RSStorage.setPro(false);
      applyProUI();
      toast("Back to Free tier (demo)");
    });
  }

  function init() {
    checkQueryPro();
    applyProUI();
    bind();
    loadSaved();
    recalculate();
    renderScenarios();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
