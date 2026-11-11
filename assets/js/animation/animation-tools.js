/**
 * Non-destructive stop-motion drawing and motion-path tools.
 *
 * Coordinates are normalized (0..1), so artwork remains aligned when the
 * preview is resized on desktop, iPad or a different browser viewport.
 */
export function normalizeFrameEdits(value = {}) {
  const strokes = Array.isArray(value.strokes) ? value.strokes.filter(stroke =>
    stroke && ["pen", "line", "arrow"].includes(stroke.type) &&
    Array.isArray(stroke.points) && stroke.points.length > 0
  ).map(stroke => ({
    id: String(stroke.id || createId()),
    type: stroke.type,
    color: safeColor(stroke.color),
    width: clamp(stroke.width, 1, 32, 4),
    points: stroke.points.slice(0, 5000).map(point => ({
      x: clamp(point.x, 0, 1, 0),
      y: clamp(point.y, 0, 1, 0)
    }))
  })) : [];

  const motionPath = Array.isArray(value.motionPath)
    ? value.motionPath.slice(0, 1000).map(point => ({
        x: clamp(point.x, 0, 1, 0),
        y: clamp(point.y, 0, 1, 0)
      }))
    : [];

  return {
    strokes,
    motionPath,
    reference: typeof value.reference === "string" && value.reference.startsWith("data:image/") ? value.reference : "",
    referenceOpacity: clamp(value.referenceOpacity, 0, 1, 0.35)
  };
}

export function addAnnotationStroke(edit, stroke) {
  const next = normalizeFrameEdits(edit);
  if (!stroke || !["pen", "line", "arrow"].includes(stroke.type) || !Array.isArray(stroke.points) || !stroke.points.length) return next;
  next.strokes.push({
    id: String(stroke.id || createId()),
    type: stroke.type,
    color: safeColor(stroke.color),
    width: clamp(stroke.width, 1, 32, 4),
    points: stroke.points.map(point => ({ x: clamp(point.x, 0, 1, 0), y: clamp(point.y, 0, 1, 0) }))
  });
  return next;
}

export function addMotionPoint(edit, point) {
  const next = normalizeFrameEdits(edit);
  next.motionPath.push({ x: clamp(point.x, 0, 1, 0), y: clamp(point.y, 0, 1, 0) });
  return next;
}

export function undoFrameEdit(edit) {
  const next = normalizeFrameEdits(edit);
  if (next.strokes.length) next.strokes.pop();
  else next.motionPath.pop();
  return next;
}

export function clearFrameEdit(edit) {
  const next = normalizeFrameEdits(edit);
  next.strokes = [];
  next.motionPath = [];
  return next;
}

/**
 * Owns pointer input and drawing only; the caller owns frame data and persistence.
 * The canvas is an overlay, never a flattened edit to the captured photograph.
 */
export function createAnimationTools(canvas, { getEdit, onChange }) {
  const context = canvas.getContext("2d");
  let tool = "pen";
  let color = "#ffcf83";
  let width = 4;
  let drawing = false;
  let draft = null;

  function dimensions() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(rect.width * ratio));
    const pixelHeight = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width: rect.width, height: rect.height, rect };
  }

  function toPoint(event) {
    const { rect } = dimensions();
    return {
      x: clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1, 0),
      y: clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1, 0)
    };
  }

  function render(edit = getEdit()) {
    const { width: w, height: h } = dimensions();
    context.clearRect(0, 0, w, h);
    const data = normalizeFrameEdits(edit);
    data.strokes.forEach(stroke => drawStroke(stroke, w, h));
    drawMotionPath(data.motionPath, w, h);
    if (draft) drawStroke(draft, w, h);
  }

  function drawStroke(stroke, w, h) {
    if (!stroke.points.length) return;
    const points = stroke.points;
    context.save();
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(points[0].x * w, points[0].y * h);
    if (stroke.type === "pen") {
      points.slice(1).forEach(point => context.lineTo(point.x * w, point.y * h));
    } else {
      const start = points[0];
      const end = points[points.length - 1];
      context.lineTo(end.x * w, end.y * h);
      if (stroke.type === "arrow") {
        const angle = Math.atan2((end.y - start.y) * h, (end.x - start.x) * w);
        const head = Math.max(10, stroke.width * 3);
        context.moveTo(end.x * w, end.y * h);
        context.lineTo(end.x * w - head * Math.cos(angle - Math.PI / 6), end.y * h - head * Math.sin(angle - Math.PI / 6));
        context.moveTo(end.x * w, end.y * h);
        context.lineTo(end.x * w - head * Math.cos(angle + Math.PI / 6), end.y * h - head * Math.sin(angle + Math.PI / 6));
      }
    }
    context.stroke();
    context.restore();
  }

  function drawMotionPath(points, w, h) {
    if (!points.length) return;
    context.save();
    context.strokeStyle = "#8fe4d0";
    context.fillStyle = "#8fe4d0";
    context.lineWidth = 2;
    context.setLineDash([7, 6]);
    context.beginPath();
    context.moveTo(points[0].x * w, points[0].y * h);
    points.slice(1).forEach(point => context.lineTo(point.x * w, point.y * h));
    context.stroke();
    context.setLineDash([]);
    points.forEach((point, index) => {
      context.beginPath();
      context.arc(point.x * w, point.y * h, index === points.length - 1 ? 5 : 3, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  function commitStroke() {
    if (!draft?.points.length) return;
    const updated = addAnnotationStroke(getEdit(), draft);
    draft = null;
    onChange(updated);
    render(updated);
  }

  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    const point = toPoint(event);
    if (tool === "motion") {
      const updated = addMotionPoint(getEdit(), point);
      onChange(updated);
      render(updated);
      return;
    }
    if (tool === "eraser") {
      const edit = normalizeFrameEdits(getEdit());
      const threshold = 0.035;
      let nearest = -1;
      let distance = Infinity;
      edit.strokes.forEach((stroke, index) => stroke.points.forEach(p => {
        const d = Math.hypot(p.x - point.x, p.y - point.y);
        if (d < distance) { distance = d; nearest = index; }
      }));
      if (nearest >= 0 && distance <= threshold) {
        edit.strokes.splice(nearest, 1);
        onChange(edit);
        render(edit);
      }
      return;
    }
    drawing = true;
    canvas.setPointerCapture?.(event.pointerId);
    draft = { id: createId(), type: tool, color, width, points: [point] };
  });

  canvas.addEventListener("pointermove", event => {
    if (!drawing || !draft) return;
    const point = toPoint(event);
    if (tool === "pen") draft.points.push(point);
    else draft.points = [draft.points[0], point];
    render();
  });

  function finishPointer() {
    if (!drawing) return;
    drawing = false;
    commitStroke();
  }
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("lostpointercapture", finishPointer);

  const resizeObserver = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => render())
    : null;
  resizeObserver?.observe(canvas);

  return {
    setTool(value) { if (["pen", "line", "arrow", "eraser", "motion"].includes(value)) tool = value; },
    setColor(value) { color = safeColor(value); },
    setWidth(value) { width = clamp(value, 1, 32, 4); },
    render,
    undo() { const updated = undoFrameEdit(getEdit()); onChange(updated); render(updated); },
    clear() { const updated = clearFrameEdit(getEdit()); onChange(updated); render(updated); },
    dispose() { resizeObserver?.disconnect(); }
  };
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
function safeColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffcf83";
}
function createId() {
  return "edit-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
