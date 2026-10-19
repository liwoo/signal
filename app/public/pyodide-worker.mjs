// ── SIGNAL · Python worker ──
// A module worker: loads Pyodide's ES-module build from the CDN once, then runs
// each program with the driver sent in "init" (source: src/lib/python/driver.ts).
// Lives in public/ so nothing here goes through the bundler.

let runner = null;

self.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type === "init") {
    try {
      const { loadPyodide } = await import(msg.indexURL + "pyodide.mjs");
      const pyodide = await loadPyodide({ indexURL: msg.indexURL });
      pyodide.runPython(msg.driver);
      runner = pyodide.globals.get("__signal_run");
      // Strip the network from the player's reach once Pyodide is loaded.
      self.fetch = undefined;
      self.XMLHttpRequest = undefined;
      self.WebSocket = undefined;
      self.postMessage({ type: "ready", ok: true });
    } catch (err) {
      self.postMessage({ type: "ready", ok: false, error: String(err) });
    }
    return;
  }
  if (msg.type === "run") {
    if (!runner) {
      self.postMessage({ type: "result", id: msg.id, stdout: "", stderr: "", error: "main.py:0:0: RuntimeError: python isn't loaded yet." });
      return;
    }
    try {
      const raw = runner(msg.main, msg.harness || "", JSON.stringify(msg.files || []));
      const out = JSON.parse(raw);
      self.postMessage({ type: "result", id: msg.id, stdout: out.stdout, stderr: out.stderr, error: out.error });
    } catch (err) {
      self.postMessage({ type: "result", id: msg.id, stdout: "", stderr: "", error: "main.py:0:0: RuntimeError: " + String(err) });
    }
  }
};
