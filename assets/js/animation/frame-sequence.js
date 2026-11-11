/** Small, testable frame-sequence operations for stop-motion stills. */
export function createFrameSequence(initialFrames = []) {
  let frames = [...initialFrames];
  let clipboard = null;

  return {
    get frames() { return frames; },
    replace(nextFrames) { frames = [...nextFrames]; },
    copy(index) {
      if (!frames[index]) return false;
      clipboard = { ...frames[index] };
      return true;
    },
    paste(index) {
      if (!clipboard) return false;
      frames.splice(Math.max(0, Math.min(frames.length, index)), 0, {
        ...clipboard,
        id: "frame-copy-" + Date.now().toString(36),
        createdAt: new Date().toISOString()
      });
      return true;
    },
    insertBlank(index) {
      frames.splice(Math.max(0, Math.min(frames.length, index)), 0, {
        id: "blank-" + Date.now().toString(36),
        blank: true,
        createdAt: new Date().toISOString()
      });
    },
    remove(index) {
      if (index < 0 || index >= frames.length) return false;
      frames.splice(index, 1);
      return true;
    }
  };
}
