// ── Python driver ──
// The Python side of a run, executed inside Pyodide. One source of truth for
// both the browser worker (public/pyodide-worker.mjs) and the Node test backend.
// `__signal_run(main, harness, files_json)` returns a JSON string:
//   { stdout, stderr, error }  where error is "" or "file:line:col: Name: message".

export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export const PY_DRIVER = String.raw`
import sys, io, json, os, importlib, traceback

_SIGNAL_DIR = "/home/pyodide/signal"
_SIGNAL_MAX_CHARS = 200_000

class _SignalOutputLimit(Exception):
    pass

class _SignalCapture(io.StringIO):
    def __init__(self, mute=False):
        super().__init__()
        self.mute = mute
        self.count = 0
    def write(self, s):
        if self.mute:
            return len(s)
        self.count += len(s)
        if self.count > _SIGNAL_MAX_CHARS:
            raise _SignalOutputLimit("too much output — is a loop running forever?")
        return super().write(s)

def _signal_ship(files):
    os.makedirs(_SIGNAL_DIR, exist_ok=True)
    shipped = {f["path"][:-3] for f in files if f["path"].endswith(".py")}
    for name in list(sys.modules):
        mod = sys.modules[name]
        path = getattr(mod, "__file__", None) or ""
        if path.startswith(_SIGNAL_DIR) or name in shipped:
            del sys.modules[name]
    for entry in os.listdir(_SIGNAL_DIR):
        full = os.path.join(_SIGNAL_DIR, entry)
        if os.path.isfile(full):
            os.remove(full)
    for f in files:
        with open(os.path.join(_SIGNAL_DIR, f["path"]), "w") as fh:
            fh.write(f["content"])
    if _SIGNAL_DIR not in sys.path:
        sys.path.insert(0, _SIGNAL_DIR)
    importlib.invalidate_caches()

def _signal_where(exc, shipped_names):
    frames = traceback.extract_tb(exc.__traceback__)
    ours = [f for f in frames if f.filename == "main.py" or os.path.basename(f.filename) in shipped_names]
    if ours:
        f = ours[-1]
        name = "main.py" if f.filename == "main.py" else os.path.basename(f.filename)
        return name, f.lineno or 0, (f.colno or 0) + 1 if getattr(f, "colno", None) is not None else 0
    if any(f.filename == "harness.py" for f in frames):
        return "harness", 0, 0
    return "main.py", 0, 0

def __signal_run(main_src, harness_src, files_json):
    files = json.loads(files_json)
    shipped_names = {f["path"] for f in files}
    _signal_ship(files)
    out = _SignalCapture()
    sink = _SignalCapture(mute=True)
    err = _SignalCapture()
    g = {"__name__": "__main__", "__builtins__": __builtins__}
    saved = (sys.stdout, sys.stderr, sys.stdin)
    error = ""
    try:
        sys.stderr = err
        sys.stdin = io.StringIO("")
        sys.stdout = sink if harness_src else out
        try:
            code = compile(main_src, "main.py", "exec")
        except SyntaxError as e:
            fname = e.filename if e.filename in shipped_names else "main.py"
            error = f"{fname}:{e.lineno or 0}:{e.offset or 0}: {type(e).__name__}: {e.msg}"
            code = None
        if code is not None:
            exec(code, g)
            if harness_src:
                sys.stdout = out
                exec(compile(harness_src, "harness.py", "exec"), g)
    except SystemExit:
        pass
    except SyntaxError as e:
        # A syntax error inside a shipped module surfaces at import time.
        fname = os.path.basename(e.filename or "main.py")
        error = f"{fname}:{e.lineno or 0}:{e.offset or 0}: {type(e).__name__}: {e.msg}"
    except BaseException as e:
        fname, line, col = _signal_where(e, shipped_names)
        error = f"{fname}:{line}:{col}: {type(e).__name__}: {e}"
    finally:
        sys.stdout, sys.stderr, sys.stdin = saved
    return json.dumps({"stdout": out.getvalue(), "stderr": err.getvalue(), "error": error})
`;
