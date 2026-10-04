export type Theme = "light";

export function readTheme(): Theme {
  return "light";
}

export function applyTheme(_theme: Theme = "light") {
  document.documentElement.dataset.theme = "light";
  try {
    localStorage.removeItem("markaz_theme");
  } catch {
    /* ignore */
  }
}
