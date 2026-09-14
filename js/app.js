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
    el._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function applyProUI() {
    const on = window.RSStorage.isPro();
    const debug = new URLSearchParams(location.search).has("debug");
    document.body.classList.toggle("is-pro", on);
    document.body.classList.toggle("debug-mode", debug);
    const status = $("#proStatus");
    if (status) {
      status.textContent = on ? "Pro unlocked" : "Free";
    }
    // Hide unlock CTAs in nav when already Pro
    $$("[data-unlock]").forEach((el) => {
      if (el.closest(".nav")) {
        el.hidden = on;
      }
    });
    // Lock Pro (testing): only when already Pro AND ?debug=1
    const lockWrap = $(".lock-pro-wrap");
    if (lockWrap) {
      lockWrap.hidden = !(on && debug);
    }
    // Demo unlock UI: only when ?debug=1 (same pattern as Lock Pro)
    const demoUi = $(".demo-unlock-ui");
    if (demoUi) {
      demoUi.hidden = !debug;
    }
  }

  function checkQueryPro() {
    const params = new URLSearchParams(location.search);
    if (params.get("pro") === "1") {
      window.RSStorage.setPro(true);
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
    const cashRaw = state.startingCash;
    if (cashRaw === "" || cashRaw == null) return false;
    const cash = parseFloat(cashRaw);
    if (!isFinite(cash)) return false;
    if (state.mode === "burn") {
      return state.monthlyBurn !== "" && isFinite(parseFloat(state.monthlyBurn));
    }
    return (
      (state.monthlyIncome !== "" || state.monthlyExpenses !== "") &&
      (isFinite(parseFloat(state.monthlyIncome || "0")) ||
        isFinite(parseFloat(state.monthlyExpenses || "0")))
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
      updateProTeaser(false);
      return;
    }

    empty.hidden = true;
    filled.hidden = false;
    updateProTeaser(true);

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

    const zeroEl = $("#outZero");
    zeroEl.textContent = window.RSCalc.formatDate(zero);
    zeroEl.className = "value " + sev;

    let burnLabel;
    if (norm.netBurn > 0) {
      burnLabel = window.RSCalc.formatMoney(norm.netBurn) + " / mo burn";
    } else if (norm.netBurn < 0) {
      burnLabel = window.RSCalc.formatMoney(-norm.netBurn) + " / mo surplus";
    } else {
      burnLabel = "Break-even";
    }
    $("#outBurn").textContent = burnLabel;

    $("#outCash").textContent = window.RSCalc.formatMoney(norm.startingCash);

    // Clarify zero-cash subcopy when infinite
    const zeroSub = $("#outZeroSub");
    if (zeroSub) {
      zeroSub.textContent = isFinite(months)
        ? "Projected from today"
        : "Cash not projected to hit zero";
    }

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
      ($("#scenarioName") && $("#scenarioName").value.trim()) ||
      "Current scenario";

    const netLabel =
      norm.netBurn > 0
        ? "Net monthly burn"
        : norm.netBurn < 0
          ? "Net monthly surplus"
          : "Net monthly (break-even)";
    const netValue =
      norm.netBurn === 0
        ? "Break-even"
        : window.RSCalc.formatMoney(Math.abs(norm.netBurn));

    const rows = series.labels
      .map(
        (l, i) =>
          `<tr><td>${escapeHtml(l)}</td><td>${window.RSCalc.formatMoney(series.values[i])}</td></tr>`
      )
      .slice(0, 13)
      .join("");

    const note =
      norm.netBurn <= 0
        ? "At current burn you are not projected to run out of cash (break-even or surplus)."
        : "Rough estimate assuming constant monthly burn. Verify with your books.";

    root.innerHTML = `
      <div class="print-brief">
        <header class="print-header">
          <div class="print-brand">RunwaySnap</div>
          <div class="print-title">One-page runway brief</div>
        </header>
        <p class="meta">${escapeHtml(name)} · Generated ${new Date().toLocaleString()} · Planning estimate only — not financial advice</p>
        <div class="grid">
          <div class="box"><div class="l">Starting cash</div><div class="v">${window.RSCalc.formatMoney(norm.startingCash)}</div></div>
          <div class="box"><div class="l">${netLabel}</div><div class="v">${netValue}</div></div>
          <div class="box"><div class="l">Runway</div><div class="v">${window.RSCalc.formatMonths(months)}</div></div>
          <div class="box"><div class="l">Zero-cash date</div><div class="v">${window.RSCalc.formatDate(zero)}</div></div>
        </div>
        <p class="print-note">${escapeHtml(note)}</p>
        <h2>Cash projection (next months)</h2>
        <table>
          <thead><tr><th>Month</th><th>Projected cash</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>RunwaySnap · Client-side estimate. Data was not uploaded. © ${new Date().getFullYear()}</footer>
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

  function updateProTeaser(hasResult) {
    const el = $("#proLocked") || $(".pro-locked");
    if (!el) return;
    // Defer Pro teaser until after first successful calc; CSS still hides when is-pro
    el.hidden = !hasResult;
  }

  /* —— Pro unlock —— */
  let lastFocus = null;

  function openUnlockModal() {
    lastFocus = document.activeElement;
    const modal = $("#unlockModal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    // Reflect placeholder status on checkout button
    const checkoutBtn = $("#btnCheckout");
    if (checkoutBtn && cfg.isCheckoutPlaceholder && cfg.isCheckoutPlaceholder()) {
      checkoutBtn.textContent = "Buy on Gumroad — $19 (checkout URL not set)";
      checkoutBtn.title =
        "Replace YOUR_CHECKOUT_URL in js/config.js with your Gumroad or Lemon Squeezy link";
    } else if (checkoutBtn) {
      checkoutBtn.textContent = "Buy on Gumroad — $19";
      checkoutBtn.removeAttribute("title");
    }
    const debug = new URLSearchParams(location.search).has("debug");
    if (debug) {
      $("#demoCode")?.focus();
    } else {
      checkoutBtn?.focus();
    }
  }

  function closeUnlockModal() {
    const modal = $("#unlockModal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  }

  function tryDemoCode() {
    const code = ($("#demoCode").value || "").trim().toUpperCase();
    if (code === cfg.DEMO_CODE) {
      window.RSStorage.setPro(true);
      applyProUI();
      closeUnlockModal();
      toast("Pro unlocked — welcome aboard");
      renderScenarios();
    } else if (!code) {
      toast("Enter the demo code RUNWAY-PRO, or use ?pro=1");
    } else {
      toast("That code didn’t work. Try RUNWAY-PRO for the demo.");
    }
  }

  function goCheckout() {
    if (cfg.isCheckoutPlaceholder && cfg.isCheckoutPlaceholder()) {
      toast(
        "Checkout URL is still a placeholder. Set YOUR_CHECKOUT_URL in js/config.js"
      );
      return;
    }
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
        '<li class="scenario-empty">No saved scenarios yet — name one above and save</li>';
      return;
    }
    list.innerHTML = scenarios
      .map(
        (s, i) => `
      <li>
        <span class="scenario-name">${escapeHtml(s.name)}</span>
        <span class="actions">
          <button type="button" class="btn btn-ghost btn-sm" data-load="${i}">Load</button>
          <button type="button" class="btn btn-ghost btn-sm" data-del="${i}" aria-label="Delete ${escapeHtml(s.name)}">Delete</button>
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
    if (!hasUsefulInput()) {
      toast("Enter cash and burn before saving a scenario");
      return;
    }
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
    const name = scenarios[i]?.name || "scenario";
    scenarios.splice(i, 1);
    window.RSStorage.saveScenarios(scenarios);
    renderScenarios();
    toast("Deleted “" + name + "”");
  }

  /* —— CSV import (Pro) —— */
  function handleCsvFile(file) {
    if (!window.RSStorage.isPro()) {
      openUnlockModal();
      return;
    }
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("CSV is too large (max 2 MB)");
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
        } else if (result.startingCash != null) {
          toast("Imported cash balance — enter monthly burn to finish");
          recalculate();
          return;
        }
        recalculate();
        toast("CSV imported — review the numbers");
      } catch (e) {
        toast(e.message || "Could not parse CSV");
      }
    };
    reader.onerror = () => toast("Could not read that file");
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
    // Ensure brief is fresh
    recalculate();
    window.print();
  }

  function fillExample() {
    setMode("burn", false);
    $("#startingCash").value = "85000";
    $("#monthlyBurn").value = "12000";
    $("#monthlyIncome").value = "";
    $("#monthlyExpenses").value = "";
    recalculate();
    toast("Loaded example: $85k cash · $12k/mo burn");
  }

  function clearAll() {
    $("#startingCash").value = "";
    $("#monthlyBurn").value = "";
    $("#monthlyIncome").value = "";
    $("#monthlyExpenses").value = "";
    if ($("#scenarioName")) $("#scenarioName").value = "";
    if ($("#csvInput")) $("#csvInput").value = "";
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
        if (window.RSStorage.isPro()) {
          toast("Pro is already unlocked");
          return;
        }
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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#unlockModal")?.classList.contains("open")) {
        closeUnlockModal();
      }
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
