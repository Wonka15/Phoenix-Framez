/**
 * Browser audio preview helper.
 * This does not perform a final mix or export; it provides a local preview
 * player and deterministic cleanup for the imported audio asset.
 */
export function createAudioEngine(audioElement) {
  let objectUrl = null;
  return {
    load(file) {
      if (!file || !file.type.startsWith("audio/")) throw new TypeError("Choose a supported audio file.");
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      audioElement.src = objectUrl;
      audioElement.load();
      return { name: file.name, size: file.size };
    },
    clear() {
      audioElement.pause();
      audioElement.removeAttribute("src");
      audioElement.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    },
    dispose() { this.clear(); }
  };
}
