// ── Python driver ──
// The Python side of a run, executed inside Pyodide. One source of truth for
// both the browser worker (public/pyodide-worker.mjs) and the Node test backend.
// `__signal_run(main, harness, files_json)` returns a JSON string:
//   { stdout, stderr, error }  where error is "" or "file:line:col: Name: message".
//
// Async programs (Act III) run on a virtual clock, like the Go playground:
// main and harness may use top-level `await`, and their coroutines run on
// `_SignalLoop`, an event loop whose "waiting" just moves the clock forward.
// `await asyncio.sleep(0.45)` returns instantly with loop.time() 0.45s later,
// so concurrency is measurable and every run prints the same thing. A program
// where every task waits on something that can never happen is a deadlock.

export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export const PY_DRIVER = String.raw`
import sys, io, json, os, importlib, traceback, ast, asyncio, contextvars
from asyncio import events as _signal_events

_SIGNAL_DIR = "/home/pyodide/signal"
_SIGNAL_MAX_CHARS = 200_000

class _SignalOutputLimit(Exception):
    pass

# True while the player's own top-level code runs under a harness. Tasks copy
# the context they're created in, so work main schedules stays muted even when
# it runs later, during the harness.
_signal_muted = contextvars.ContextVar("_signal_muted", default=False)

class _SignalCapture(io.StringIO):
    def __init__(self, mute=False, follows_main=True):
        super().__init__()
        self.mute = mute
        self.follows_main = follows_main
        self.count = 0
    def write(self, s):
        if self.mute or (self.follows_main and _signal_muted.get()):
            return len(s)
        self.count += len(s)
        if self.count > _SIGNAL_MAX_CHARS:
            raise _SignalOutputLimit("too much output — is a loop running forever?")
        return super().write(s)

_SIGNAL_MAX_VIRTUAL_SECONDS = 3600
_SIGNAL_FLAGS = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT

class _SignalLoop(asyncio.BaseEventLoop):
    """An event loop on a virtual clock: blocking for a timeout advances time."""
    def __init__(self):
        super().__init__()
        self._signal_now = 0.0
        self._selector = self
    def time(self):
        return self._signal_now
    def select(self, timeout):
        if timeout is None:
            raise RuntimeError("deadlock: every task is waiting and nothing can wake them")
        self._signal_now += timeout
        if self._signal_now > _SIGNAL_MAX_VIRTUAL_SECONDS:
            raise TimeoutError("your program waited for over an hour — is something sleeping in a loop?")
        return []
    def _process_events(self, event_list):
        pass
    def _write_to_self(self):
        pass

# A blocking time.sleep inside the virtual loop blocks everything, as it really
# would: the clock moves forward and no other task runs meanwhile.
import time as _signal_time
_signal_real_sleep = getattr(_signal_time, "_signal_real_sleep", _signal_time.sleep)
_signal_time._signal_real_sleep = _signal_real_sleep

def _signal_blocking_sleep(seconds):
    loop = _signal_events._get_running_loop()
    if isinstance(loop, _SignalLoop):
        loop._signal_now += max(0.0, float(seconds))
        return None
    return _signal_real_sleep(seconds)

_signal_time.sleep = _signal_blocking_sleep

def _signal_exec(loop, code, g, muted=False):
    """Run compiled main/harness code with the virtual loop as the running loop
    (so create_task never escapes to Pyodide's own loop), then drive a
    top-level-await coroutine to completion on it."""
    outer = _signal_events._get_running_loop()
    token = _signal_muted.set(muted)
    try:
        _signal_events._set_running_loop(loop)
        try:
            result = eval(code, g)
        finally:
            _signal_events._set_running_loop(outer)
        if not asyncio.iscoroutine(result):
            return
        _signal_events._set_running_loop(None)
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(result)
        finally:
            _signal_events._set_running_loop(outer)
    finally:
        _signal_muted.reset(token)

def _signal_shutdown(loop):
    """Like asyncio.run: tasks nobody awaited are cancelled, never finished."""
    try:
        pending = [t for t in asyncio.all_tasks(loop) if not t.done()]
        if pending:
            for t in pending:
                t.cancel()
            outer = _signal_events._get_running_loop()
            _signal_events._set_running_loop(None)
            try:
                loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            except BaseException:
                pass
            finally:
                _signal_events._set_running_loop(outer)
    finally:
        loop.close()

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
    err = _SignalCapture(follows_main=False)
    g = {"__name__": "__main__", "__builtins__": __builtins__}
    saved = (sys.stdout, sys.stderr, sys.stdin)
    error = ""
    loop = _SignalLoop()
    try:
        sys.stderr = err
        sys.stdin = io.StringIO("")
        sys.stdout = out
        try:
            code = compile(main_src, "main.py", "exec", flags=_SIGNAL_FLAGS)
        except SyntaxError as e:
            fname = e.filename if e.filename in shipped_names else "main.py"
            error = f"{fname}:{e.lineno or 0}:{e.offset or 0}: {type(e).__name__}: {e.msg}"
            code = None
        if code is not None:
            _signal_exec(loop, code, g, muted=bool(harness_src))
            if harness_src:
                _signal_exec(loop, compile(harness_src, "harness.py", "exec", flags=_SIGNAL_FLAGS), g)
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
        try:
            _signal_shutdown(loop)
        except BaseException:
            pass
        sys.stdout, sys.stderr, sys.stdin = saved
    return json.dumps({"stdout": out.getvalue(), "stderr": err.getvalue(), "error": error})
`;
