(() => {
  const stored = localStorage.getItem("markaz_theme");
  const system = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = stored === "light" || stored === "dark" ? stored : system;
})();
