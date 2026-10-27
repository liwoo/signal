/** Join class names, dropping falsy ones (a dependency-free `clsx`). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
