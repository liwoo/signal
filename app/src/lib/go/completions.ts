// ── Go Autocomplete ──
// Provides method completions for known stdlib packages.
// Powered by the same registry used in diagnostics.

import { KNOWN_PKG_METHODS } from "./diagnostics";

export interface Completion {
  label: string;
  detail: string;
}

const METHOD_SIGNATURES: Record<string, Record<string, string>> = {
  fmt: {
    Print: "func Print(a ...any) (n int, err error)",
    Println: "func Println(a ...any) (n int, err error)",
    Printf: "func Printf(format string, a ...any) (n int, err error)",
    Sprint: "func Sprint(a ...any) string",
    Sprintf: "func Sprintf(format string, a ...any) string",
    Sprintln: "func Sprintln(a ...any) string",
    Fprint: "func Fprint(w io.Writer, a ...any) (n int, err error)",
    Fprintf: "func Fprintf(w io.Writer, format string, a ...any) (n int, err error)",
    Fprintln: "func Fprintln(w io.Writer, a ...any) (n int, err error)",
    Scan: "func Scan(a ...any) (n int, err error)",
    Scanf: "func Scanf(format string, a ...any) (n int, err error)",
    Scanln: "func Scanln(a ...any) (n int, err error)",
    Sscan: "func Sscan(str string, a ...any) (n int, err error)",
    Sscanf: "func Sscanf(str string, format string, a ...any) (n int, err error)",
    Sscanln: "func Sscanln(str string, a ...any) (n int, err error)",
    Errorf: "func Errorf(format string, a ...any) error",
  },
  strings: {
    Contains: "func Contains(s, substr string) bool",
    HasPrefix: "func HasPrefix(s, prefix string) bool",
    HasSuffix: "func HasSuffix(s, suffix string) bool",
    Index: "func Index(s, substr string) int",
    Join: "func Join(elems []string, sep string) string",
    Replace: "func Replace(s, old, new string, n int) string",
    ReplaceAll: "func ReplaceAll(s, old, new string) string",
    Split: "func Split(s, sep string) []string",
    ToLower: "func ToLower(s string) string",
    ToUpper: "func ToUpper(s string) string",
    TrimSpace: "func TrimSpace(s string) string",
    Count: "func Count(s, substr string) int",
    Repeat: "func Repeat(s string, count int) string",
    Fields: "func Fields(s string) []string",
    EqualFold: "func EqualFold(s, t string) bool",
  },
  strconv: {
    Atoi: "func Atoi(s string) (int, error)",
    Itoa: "func Itoa(i int) string",
    FormatInt: "func FormatInt(i int64, base int) string",
    FormatFloat: "func FormatFloat(f float64, fmt byte, prec, bitSize int) string",
    ParseInt: "func ParseInt(s string, base int, bitSize int) (int64, error)",
    ParseFloat: "func ParseFloat(s string, bitSize int) (float64, error)",
    ParseBool: "func ParseBool(str string) (bool, error)",
  },
  math: {
    Abs: "func Abs(x float64) float64",
    Max: "func Max(x, y float64) float64",
    Min: "func Min(x, y float64) float64",
    Sqrt: "func Sqrt(x float64) float64",
    Pow: "func Pow(x, y float64) float64",
    Floor: "func Floor(x float64) float64",
    Ceil: "func Ceil(x float64) float64",
    Round: "func Round(x float64) float64",
    Log: "func Log(x float64) float64",
  },
  os: {
    Exit: "func Exit(code int)",
    Getenv: "func Getenv(key string) string",
    Args: "var Args []string",
    Open: "func Open(name string) (*File, error)",
    Create: "func Create(name string) (*File, error)",
    ReadFile: "func ReadFile(name string) ([]byte, error)",
    WriteFile: "func WriteFile(name string, data []byte, perm FileMode) error",
  },
};

export function getCompletions(pkg: string): Completion[] {
  const methods = KNOWN_PKG_METHODS[pkg];
  if (!methods) return [];

  const sigs = METHOD_SIGNATURES[pkg] || {};
  return Array.from(methods)
    .sort()
    .map((m) => ({
      label: m,
      detail: sigs[m] || `${pkg}.${m}`,
    }));
}

export function getKnownPackages(): string[] {
  return Object.keys(KNOWN_PKG_METHODS);
}
