(() => {
  document.documentElement.dataset.theme = "light";
  try {
    localStorage.removeItem("markaz_theme");
  } catch {
    /* ignore */
  }
})();
