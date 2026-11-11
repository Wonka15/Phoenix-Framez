/** Real onion-skin overlay for the camera monitor. */
export function createOnionSkin(viewfinder) {
  let image = viewfinder.querySelector(".onion-skin-image");
  let hasSource = false;
  if (!image) {
    image = document.createElement("img");
    image.className = "onion-skin-image";
    image.alt = "Previous animation frame overlay";
    image.setAttribute("aria-hidden", "true");
    viewfinder.append(image);
  }
  return {
    setSource(source) {
      hasSource = Boolean(source);
      if (hasSource) image.src = source; else image.removeAttribute("src");
      image.hidden = !hasSource || !viewfinder.classList.contains("onion-enabled");
    },
    setEnabled(enabled) {
      viewfinder.classList.toggle("onion-enabled", enabled);
      image.hidden = !enabled || !hasSource;
    },
    setOpacity(value) { image.style.opacity = String(Math.max(0, Math.min(1, Number(value) / 100))); }
  };
}
