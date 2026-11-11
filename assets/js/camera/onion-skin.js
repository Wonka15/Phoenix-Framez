/**
 * Real onion-skin overlay for the camera monitor.
 * The most recently captured/imported still is shown as a translucent overlay
 * over the live feed. The opacity control is owned by the UI.
 */
export function createOnionSkin(viewfinder) {
  let image = viewfinder.querySelector(".onion-skin-image");
  if (!image) {
    image = document.createElement("img");
    image.className = "onion-skin-image";
    image.alt = "Previous animation frame overlay";
    image.setAttribute("aria-hidden", "true");
    viewfinder.append(image);
  }

  return {
    setSource(source) {
      image.src = source || "";
      image.hidden = !source || !viewfinder.classList.contains("onion-enabled");
    },
    setEnabled(enabled) {
      viewfinder.classList.toggle("onion-enabled", enabled);
      image.hidden = !enabled || !image.src;
    },
    setOpacity(value) {
      image.style.opacity = String(Math.max(0, Math.min(1, Number(value) / 100)));
    }
  };
}
