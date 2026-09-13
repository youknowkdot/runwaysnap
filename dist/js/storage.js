(function () {
  const keys = () => window.RUNWAYSNAP_CONFIG.STORAGE_KEYS;

  window.RSStorage = {
    getInputs() {
      try {
        const raw = localStorage.getItem(keys().inputs);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    saveInputs(data) {
      localStorage.setItem(keys().inputs, JSON.stringify(data));
    },
    isPro() {
      return localStorage.getItem(keys().pro) === "1";
    },
    setPro(on) {
      if (on) localStorage.setItem(keys().pro, "1");
      else localStorage.removeItem(keys().pro);
    },
    getScenarios() {
      try {
        const raw = localStorage.getItem(keys().scenarios);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
    saveScenarios(list) {
      localStorage.setItem(keys().scenarios, JSON.stringify(list));
    },
  };
})();
