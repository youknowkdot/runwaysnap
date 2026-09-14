/**
 * Core runway math — pure functions, easy to test.
 */
window.RSCalc = {
  /** Soft cap so UI/dates stay sane with pasted mega-numbers */
  MAX_CASH: 1e15,

  /**
   * Coerce to a finite number; clamp to [min, max]. Non-finite → fallback.
   */
  sanitize(n, { min = 0, max = 1e15, fallback = 0 } = {}) {
    let v = typeof n === "string" ? parseFloat(String(n).replace(/[$,\s]/g, "")) : Number(n);
    if (!isFinite(v)) return fallback;
    if (v < min) v = min;
    if (v > max) v = max;
    return v;
  },

  /**
   * @param {{ startingCash: number, monthlyBurn: number, monthlyIncome?: number, monthlyExpenses?: number, mode: 'burn'|'income' }} input
   */
  normalize(input) {
    const startingCash = this.sanitize(input.startingCash, {
      min: 0,
      max: this.MAX_CASH,
    });
    let monthlyBurn = 0;
    let monthlyIncome = this.sanitize(input.monthlyIncome, {
      min: 0,
      max: this.MAX_CASH,
    });
    let monthlyExpenses = this.sanitize(input.monthlyExpenses, {
      min: 0,
      max: this.MAX_CASH,
    });

    if (input.mode === "income") {
      monthlyBurn = monthlyExpenses - monthlyIncome;
    } else {
      // Burn mode: allow 0 (break-even / infinite runway). Negative UI input → 0.
      monthlyBurn = this.sanitize(input.monthlyBurn, {
        min: 0,
        max: this.MAX_CASH,
      });
      monthlyIncome = 0;
      monthlyExpenses = monthlyBurn;
    }

    // Net burn: positive = burning cash; negative = surplus (runway infinite)
    return {
      startingCash,
      monthlyBurn,
      monthlyIncome,
      monthlyExpenses,
      mode: input.mode === "income" ? "income" : "burn",
      netBurn: monthlyBurn,
    };
  },

  /**
   * Months of runway. Infinity when not burning (zero or surplus).
   */
  monthsOfRunway(startingCash, monthlyBurn) {
    const cash = this.sanitize(startingCash, { min: 0, max: this.MAX_CASH });
    const burn = Number(monthlyBurn);
    if (!isFinite(cash) || cash <= 0) return 0;
    if (!isFinite(burn) || burn <= 0) return Infinity;
    const months = cash / burn;
    // Cap absurd ratios so date math / UI don't explode
    if (months > 1200) return Infinity; // > 100 years ≈ "effectively infinite"
    return months;
  },

  /**
   * Projected zero-cash date from today, or null if never.
   */
  zeroCashDate(startingCash, monthlyBurn, fromDate = new Date()) {
    const months = this.monthsOfRunway(startingCash, monthlyBurn);
    if (!isFinite(months)) return null;
    if (months <= 0) return new Date(fromDate);
    const d = new Date(fromDate.getTime());
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
    const cash0 = this.sanitize(startingCash, { min: 0, max: this.MAX_CASH });
    const burn = isFinite(Number(monthlyBurn)) ? Number(monthlyBurn) : 0;
    const labels = [];
    const values = [];
    let cash = cash0;

    let months;
    if (burn <= 0) {
      months = Math.min(12, maxMonths);
    } else if (cash0 <= 0) {
      months = 1;
    } else {
      months = Math.min(maxMonths, Math.ceil(cash0 / burn) + 1);
    }

    const now = new Date();
    for (let i = 0; i <= months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      labels.push(
        d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
      );
      values.push(Math.max(0, cash));
      if (burn > 0) cash -= burn;
      else if (burn < 0) cash -= burn; // surplus → grows
      else cash = cash0;
    }
    return { labels, values, months };
  },

  formatMoney(n, currency = "USD") {
    if (!isFinite(n)) return "—";
    const abs = Math.abs(n);
    // Compact for very large values
    if (abs >= 1e12) {
      return (n < 0 ? "-" : "") + "$" + (abs / 1e12).toFixed(2) + "T";
    }
    if (abs >= 1e9) {
      return (n < 0 ? "-" : "") + "$" + (abs / 1e9).toFixed(2) + "B";
    }
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
    if (!isFinite(m)) return "∞ (not burning)";
    if (m <= 0) return "0 months";
    if (m < 1) return Math.max(1, Math.round(m * 30)) + " days";
    const rounded = Math.round(m * 10) / 10;
    return rounded + (rounded === 1 ? " month" : " months");
  },

  formatDate(d) {
    if (!d) return "Not projected";
    if (!(d instanceof Date) || isNaN(d.getTime())) return "Not projected";
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
   * Parse one CSV line with optional double-quoted fields.
   * Handles "" escapes inside quotes.
   */
  splitCsvLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  },

  /**
   * Parse simple CSV: either
   *  month,cash  OR  date,amount,memo
   * Supports quoted fields. Returns estimated cash / burn when possible.
   */
  parseCsv(text) {
    const lines = String(text || "")
      .replace(/^\uFEFF/, "") // BOM
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      throw new Error("CSV needs a header and at least one data row.");
    }

    const header = this.splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const rows = lines.slice(1).map((line) => this.splitCsvLine(line));

    const hasCash = header.includes("cash") || header.includes("balance");
    const hasAmount = header.includes("amount") || header.includes("burn");

    if (hasCash) {
      const cashIdx = header.findIndex((h) => h === "cash" || h === "balance");
      const labelIdx = header.findIndex(
        (h) => h === "month" || h === "date" || h === "label"
      );
      const points = rows
        .map((r) => ({
          label: labelIdx >= 0 ? r[labelIdx] || "" : "",
          cash: this.sanitize(r[cashIdx], {
            min: -this.MAX_CASH,
            max: this.MAX_CASH,
            fallback: NaN,
          }),
        }))
        .filter((p) => isFinite(p.cash));

      if (!points.length) {
        throw new Error("No valid cash/balance values found in CSV.");
      }

      if (points.length < 2) {
        return {
          startingCash: Math.max(0, points[0].cash),
          monthlyBurn: null,
          points,
        };
      }

      const deltas = [];
      for (let i = 1; i < points.length; i++) {
        deltas.push(points[i - 1].cash - points[i].cash);
      }
      const avgBurn = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      return {
        startingCash: Math.max(0, points[points.length - 1].cash),
        // Negative avg = cash growing → treat as 0 burn for free runway calc
        monthlyBurn: Math.max(0, avgBurn),
        points,
        mode: "burn",
      };
    }

    if (hasAmount) {
      const amtIdx = header.findIndex((h) => h === "amount" || h === "burn");
      const amounts = rows
        .map((r) =>
          this.sanitize(r[amtIdx], {
            min: -this.MAX_CASH,
            max: this.MAX_CASH,
            fallback: NaN,
          })
        )
        .filter((n) => isFinite(n));
      if (!amounts.length) {
        throw new Error("No valid amount values found in CSV.");
      }
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
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
