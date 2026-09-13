/**
 * Core runway math — pure functions, easy to test.
 */
window.RSCalc = {
  /**
   * @param {{ startingCash: number, monthlyBurn: number, monthlyIncome?: number, monthlyExpenses?: number, mode: 'burn'|'income' }} input
   */
  normalize(input) {
    const startingCash = Number(input.startingCash) || 0;
    let monthlyBurn = 0;
    let monthlyIncome = Number(input.monthlyIncome) || 0;
    let monthlyExpenses = Number(input.monthlyExpenses) || 0;

    if (input.mode === "income") {
      monthlyBurn = monthlyExpenses - monthlyIncome;
    } else {
      monthlyBurn = Number(input.monthlyBurn) || 0;
      monthlyIncome = 0;
      monthlyExpenses = monthlyBurn;
    }

    // Net burn: positive = burning cash; negative = profitable (runway infinite)
    return {
      startingCash,
      monthlyBurn,
      monthlyIncome,
      monthlyExpenses,
      mode: input.mode,
      netBurn: monthlyBurn,
    };
  },

  /**
   * Months of runway. Infinity when not burning.
   */
  monthsOfRunway(startingCash, monthlyBurn) {
    if (startingCash <= 0) return 0;
    if (monthlyBurn <= 0) return Infinity;
    return startingCash / monthlyBurn;
  },

  /**
   * Projected zero-cash date from today, or null if never.
   */
  zeroCashDate(startingCash, monthlyBurn, fromDate = new Date()) {
    const months = this.monthsOfRunway(startingCash, monthlyBurn);
    if (!isFinite(months)) return null;
    if (months <= 0) return new Date(fromDate);
    const d = new Date(fromDate);
    const whole = Math.floor(months);
    const frac = months - whole;
    d.setMonth(d.getMonth() + whole);
    d.setDate(d.getDate() + Math.round(frac * 30.44));
    return d;
  },

  /**
   * Series of remaining cash by month for charting.
   * @returns {{ labels: string[], values: number[], months: number }}
   */
  projectionSeries(startingCash, monthlyBurn, maxMonths = 24) {
    const labels = [];
    const values = [];
    let cash = startingCash;
    const months =
      monthlyBurn <= 0
        ? Math.min(12, maxMonths)
        : Math.min(maxMonths, Math.ceil(startingCash / monthlyBurn) + 1);

    const now = new Date();
    for (let i = 0; i <= months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      labels.push(
        d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
      );
      values.push(Math.max(0, cash));
      if (monthlyBurn > 0) cash -= monthlyBurn;
      else if (monthlyBurn < 0) cash -= monthlyBurn; // growing
      else cash = startingCash;
      if (cash < 0 && monthlyBurn > 0) {
        // push one more zero point then stop
        if (i < months) {
          // already added current; next loop will clamp
        }
      }
    }
    return { labels, values, months };
  },

  formatMoney(n, currency = "USD") {
    if (!isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return "$" + Math.round(n).toLocaleString();
    }
  },

  formatMonths(m) {
    if (!isFinite(m)) return "∞ (profitable)";
    if (m <= 0) return "0 months";
    if (m < 1) return (m * 30).toFixed(0) + " days";
    const rounded = Math.round(m * 10) / 10;
    return rounded + (rounded === 1 ? " month" : " months");
  },

  formatDate(d) {
    if (!d) return "Not projected";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },

  severity(months) {
    if (!isFinite(months)) return "ok";
    if (months < 3) return "danger";
    if (months < 6) return "warn";
    return "ok";
  },

  /**
   * Parse simple CSV: either
   *  month,cash  OR  date,amount,memo
   * Returns { startingCash?, monthlyBurn?, points: [{label, cash|amount}] }
   */
  parseCsv(text) {
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) throw new Error("CSV needs a header and at least one row.");

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      // simple split (no quoted commas for MVP)
      return line.split(",").map((c) => c.trim());
    });

    const hasCash = header.includes("cash") || header.includes("balance");
    const hasAmount = header.includes("amount") || header.includes("burn");

    if (hasCash) {
      const cashIdx = header.findIndex((h) => h === "cash" || h === "balance");
      const labelIdx = header.findIndex(
        (h) => h === "month" || h === "date" || h === "label"
      );
      const points = rows.map((r) => ({
        label: labelIdx >= 0 ? r[labelIdx] : "",
        cash: parseFloat(r[cashIdx].replace(/[$,]/g, "")),
      })).filter((p) => isFinite(p.cash));

      if (points.length < 2) {
        return {
          startingCash: points[0]?.cash,
          monthlyBurn: null,
          points,
        };
      }
      // estimate burn from successive cash deltas
      const deltas = [];
      for (let i = 1; i < points.length; i++) {
        deltas.push(points[i - 1].cash - points[i].cash);
      }
      const avgBurn = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      return {
        startingCash: points[points.length - 1].cash,
        monthlyBurn: Math.max(0, avgBurn),
        points,
        mode: "burn",
      };
    }

    if (hasAmount) {
      const amtIdx = header.findIndex((h) => h === "amount" || h === "burn");
      const amounts = rows
        .map((r) => parseFloat(String(r[amtIdx]).replace(/[$,]/g, "")))
        .filter((n) => isFinite(n));
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      // positive amounts treated as burn; negative as income netting
      return {
        monthlyBurn: avg,
        points: amounts.map((a, i) => ({ label: "Row " + (i + 1), amount: a })),
        mode: "burn",
      };
    }

    throw new Error(
      "Unrecognized CSV. Use headers like: month,cash  or  date,amount"
    );
  },
};
