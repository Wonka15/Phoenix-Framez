/**
 * PhoenixFrame application entry point.
 * Feature behavior is delegated to small domain modules under this directory.
 */
import { $, $$, escapeHTML, makeId } from "./core/dom.js";
import { createStorage } from "./core/storage.js";
import { makeCoverThumbnail, createProject } from "./projects/project-store.js";
import { normalizeTimeline, createTrack, createMarker, moveClip, reorderTrack } from "./timeline/timeline-model.js";
import { createOnionSkin } from "./camera/onion-skin.js";
import { createFrameSequence } from "./animation/frame-sequence.js";
import { createAudioEngine } from "./audio/audio-engine.js";
import { buildProjectArchive, validateProjectArchive, downloadJson } from "./export/project-archive.js";
import { normalizeFps, nextFrameIndex, previousFrameSource, frameLabel } from "./animation/stop-motion.js";
import { createAnimationTools, normalizeFrameEdits } from "./animation/animation-tools.js";

/**
 * PhoenixFrame 1.0 — browser studio controller
 * ------------------------------------------------------------
 * This file composes the studio UI from feature modules:
 * - Domain rules and browser services live in their own folders.
 * - This entry point owns workspace state, rendering and event wiring.
 * - Project data is persisted locally and exported as a versioned archive.
 *
 * GitHub Pages is a static host. Camera access uses browser APIs;
 * native desktop integrations must go through the separate local bridge.
 */
(() => {
  "use strict";

  // ---------- Application state ----------
  const STORAGE_KEYS = { projects: "phoenixframe.projects", cues: "phoenixframe.cues", timeline: "phoenixframe.timeline", frames: "phoenixframe.frames", animationEdits: "phoenixframe.animationEdits" };
  const storage = createStorage((error, operation) => {
    console.warn("[PhoenixFrame] Storage " + operation + " failed:", error);
    if (operation === "write") window.setTimeout(() => notify("Browser storage is full or unavailable. Export your project data."), 0);
  });

  const savedTimeline = normalizeTimeline(storage.read(STORAGE_KEYS.timeline, {}));
  const storedProjects = storage.read(STORAGE_KEYS.projects, []);
  const storedCues = storage.read(STORAGE_KEYS.cues, []);
  const storedFrames = storage.read(STORAGE_KEYS.frames, []);
  const storedAnimationEdits = storage.read(STORAGE_KEYS.animationEdits, {});
  const state = {
    projects: Array.isArray(storedProjects) ? storedProjects : [],
    cues: Array.isArray(storedCues) ? storedCues : [],
    frames: Array.isArray(storedFrames) ? storedFrames : [],
    animationEdits: storedAnimationEdits && typeof storedAnimationEdits === "object" && !Array.isArray(storedAnimationEdits) ? storedAnimationEdits : {},
    markers: savedTimeline.markers,
    tracks: savedTimeline.tracks,
    frame: 1,
    playing: false,
    playTimer: null,
    projectLayout: "grid",
    cameraStream: null,
    activeProjectId: null,
    selectedExportProjectId: null,
    selectedFrameIndex: -1,
    playbackFps: 24,
    loopPlayback: true,
    intervalTimer: null,
    intervalRunning: false
  };

  const dialog = $("#projectDialog");
  const toast = $("#toast");
  let toastTimer = null;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  const onionSkin = createOnionSkin($("#cameraViewfinder"));
  const animationPreview = document.createElement("img");
  animationPreview.id = "animationPreviewFrame";
  animationPreview.alt = "Selected stop-motion exposure";
  animationPreview.hidden = true;
  $("#cameraViewfinder").insertBefore(animationPreview, $(".viewfinder-meta"));
  const frameSequence = createFrameSequence(state.frames);
  const audioEngine = createAudioEngine($("#audioPreview"));
  const annotationCanvas = $("#annotationCanvas");
  const animationTools = createAnimationTools(annotationCanvas, {
    getEdit: () => getCurrentFrameEdit(),
    onChange: edit => {
      state.animationEdits[getCurrentFrameKey()] = normalizeFrameEdits(edit);
      persistAnimationEdits();
      renderAnimationWorkspace();
    }
  });
  let referenceLoadToken = 0;

  function getCurrentFrameKey() {
    const frame = state.frames[state.selectedFrameIndex];
    return frame ? String(frame.id || "frame-" + state.selectedFrameIndex) : "frame-empty";
  }

  function getCurrentFrameEdit() {
    return normalizeFrameEdits(state.animationEdits[getCurrentFrameKey()] || {});
  }

  function persistAnimationEdits() {
    storage.write(STORAGE_KEYS.animationEdits, state.animationEdits);
  }

  function renderAnimationWorkspace() {
    const frame = state.frames[state.selectedFrameIndex];
    const edit = getCurrentFrameEdit();
    const currentImage = $("#toolsFrameImage");
    const previousImage = $("#toolsPreviousImage");
    const referenceImage = $("#toolsReferenceImage");
    const hasFrame = Boolean(frame?.src);
    currentImage.hidden = !hasFrame;
    annotationCanvas.style.pointerEvents = hasFrame ? "auto" : "none";
    $("#animationStageEmpty").hidden = hasFrame;
    if (hasFrame && currentImage.src !== frame.src) {
      currentImage.onload = () => {
        const stage = $("#animationStage");
        if (currentImage.naturalWidth && currentImage.naturalHeight) stage.style.aspectRatio = currentImage.naturalWidth + " / " + currentImage.naturalHeight;
      };
      currentImage.src = frame.src;
    }
    if (!hasFrame) $("#animationStage").style.aspectRatio = "16 / 9";
    const previous = state.frames[state.selectedFrameIndex - 1];
    previousImage.hidden = !previous?.src || !$("#differenceModeToggle").checked;
    if (previous?.src && previousImage.src !== previous.src) previousImage.src = previous.src;
    referenceImage.hidden = !edit.reference;
    if (edit.reference && referenceImage.src !== edit.reference) referenceImage.src = edit.reference;
    referenceImage.style.opacity = String(edit.referenceOpacity);
    $("#referenceOpacity").value = String(Math.round(edit.referenceOpacity * 100));
    $("#toolsFrameLabel").textContent = "FRAME " + String(state.frame).padStart(3, "0");
    $("#annotationStatus").textContent = "Drawing layer · Frame " + String(state.frame).padStart(3, "0");
    $("#differenceModeToggle").disabled = !previous?.src;
    animationTools.render(edit);
  }

  function persistTimeline() {
    storage.write(STORAGE_KEYS.timeline, {
      markers: state.markers,
      tracks: state.tracks
    });
  }

  // ---------- Navigation and workspace ----------
  function showView(name) {
    $$(".view").forEach(view => view.classList.toggle("active-view", view.id === name + "View"));
    $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === name));
    $$(".dock-tool[data-dock-view]").forEach(button => button.classList.toggle("active", button.dataset.dockView === name));

    const labels = { overview: "Overview", lipsync: "Lip Sync", camera: "Camera station", projects: "Projects", "animation-tools": "Animation tools" };
    $("#pageName").textContent = name === "camera" && $("#cameraView").classList.contains("lego-mode") ? "LEGO Brick Mode" : (labels[name] || name[0].toUpperCase() + name.slice(1));
    $("#sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "animation-tools") window.requestAnimationFrame(() => animationTools.render(getCurrentFrameEdit()));
  }

  function openProjectDialog() {
    $("#projectNameInput").value = "";
    $("#projectCoverInput").value = "";
    if (dialog?.showModal) dialog.showModal();
    else notify("Project creation requires a modern browser.");
  }

  function createProjectCard(project, index) {
    const palette = ["thumb-violet", "thumb-blue", "thumb-amber", "thumb-rose"];
    const coverStyle = project.cover
      ? ' style="background-image:linear-gradient(180deg,#090d1833,#090d1877),url(&quot;' + project.cover + '&quot;);background-size:cover;background-position:center"'
      : "";
    return `<article class="project-card">
      <div class="project-thumb ${palette[index % palette.length]}"${coverStyle}>
        <span class="thumb-index">PROJECT ${String(index + 1).padStart(2, "0")}</span>
        ${project.cover ? "" : '<span class="thumb-glyph" aria-hidden="true">✦</span>'}
      </div>
      <div class="project-card-body">
        <h3>${escapeHTML(project.name)}</h3>
        <p>${escapeHTML(project.type)} · ${escapeHTML(project.date || "New production")}</p>
        <div class="project-card-foot"><small>LOCAL PROJECT</small>
          <div class="project-card-actions"><button type="button" data-open-project="${index}">Open project</button><button type="button" data-export-project="${index}" aria-label="Export ${escapeHTML(project.name)}">Export ↓</button></div>
        </div>
      </div>
    </article>`;
  }

  function renderProjects() {
    $("#projectCount").textContent = state.projects.length;
    const recent = $("#projectList");
    if (!state.projects.length) {
      recent.className = "empty-state";
      recent.innerHTML = '<div class="empty-icon">▱</div><strong>No projects yet</strong><p>Create a project to start organizing your scenes and animation work.</p><button class="secondary-btn" id="emptyCreateBtn">Create your first project</button>';
      $("#emptyCreateBtn").addEventListener("click", openProjectDialog);
    } else {
      recent.className = "recent-project-list";
      recent.innerHTML = state.projects.slice(0, 3).map((project, index) =>
        `<div class="project-list-item"><div class="project-symbol">✦</div><div><strong>${escapeHTML(project.name)}</strong><small>${escapeHTML(project.type)} · ${escapeHTML(project.date || "New production")}</small></div><button class="project-open" type="button" data-recent-open="${index}">Open</button></div>`
      ).join("");
      $$("[data-recent-open]").forEach(button => button.addEventListener("click", () => openProject(+button.dataset.recentOpen)));
    }
    renderProjectBrowser();
  }

  function renderProjectBrowser() {
    const browser = $("#projectBrowserGrid");
    const query = ($("#projectSearch").value || "").trim().toLowerCase();
    const matches = state.projects
      .map((project, index) => ({ project, index }))
      .filter(item => (item.project.name + " " + item.project.type).toLowerCase().includes(query));

    browser.classList.toggle("list-layout", state.projectLayout === "list");
    if (!matches.length) {
      browser.innerHTML = query
        ? '<div class="browser-empty"><span>⌕</span><strong>No matching projects</strong><p>Try another project name or type.</p></div>'
        : '<div class="browser-empty"><span>▧</span><strong>Your next production starts here.</strong><p>Create a project to see it appear in your library.</p><button class="secondary-btn" id="browserEmptyCreate">Create project</button></div>';
      $("#browserEmptyCreate")?.addEventListener("click", openProjectDialog);
      return;
    }

    browser.innerHTML = matches.map(item => createProjectCard(item.project, item.index)).join("");
    $$("[data-open-project]").forEach(button => button.addEventListener("click", () => openProject(+button.dataset.openProject)));
    $$("[data-export-project]").forEach(button => button.addEventListener("click", () => openProjectExport(+button.dataset.exportProject)));
  }

  function setLegoMode(enabled) {
    const active = Boolean(enabled);
    $("#cameraView").classList.toggle("lego-mode", active);
    $("#legoBeginnerGuide").hidden = !active;
    if (active) {
      $("#pageName").textContent = "LEGO Brick Mode";
      $("#cameraPermissionStatus").textContent = "Build your scene, turn on the camera, then capture one frame at a time.";
    }
  }

  function openProjectExport(index) {
    const project = state.projects[index];
    if (!project) return;
    state.selectedExportProjectId = project.id;
    $("#projectExportTitle").textContent = "Export: " + project.name;
    $("#projectExportDescription").textContent = "Save your " + project.type.toLowerCase() + " project or download its captured images.";
    $("#projectExportPanel").hidden = false;
    showView("projects");
    $("#projectExportPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function getExportFrames(project) {
    return state.frames.filter(frame => frame.projectId === project.id || (!frame.projectId && state.activeProjectId === project.id));
  }

  function exportSelectedProjectArchive() {
    const project = state.projects.find(item => item.id === state.selectedExportProjectId);
    if (!project) return notify("Choose a project to export first.");
    const frames = getExportFrames(project);
    const payload = buildProjectArchive({ ...state, projects: [project], frames });
    downloadJson(payload, project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-phoenixframez.json");
    notify("Project file downloaded.");
  }

  function exportSelectedProjectFrames() {
    const project = state.projects.find(item => item.id === state.selectedExportProjectId);
    if (!project) return notify("Choose a project to export first.");
    const frames = getExportFrames(project).filter(frame => frame.src && !frame.blank);
    if (!frames.length) return notify("This project has no captured images yet.");
    frames.forEach((frame, index) => {
      window.setTimeout(() => {
        const link = document.createElement("a");
        link.href = frame.src;
        link.download = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-frame-" + String(index + 1).padStart(4, "0") + ".jpg";
        link.click();
      }, index * 180);
    });
    notify("Downloading " + frames.length + " frame images.");
  }

  function openProject(index) {
    const project = state.projects[index];
    if (!project) return;
    state.activeProjectId = project.id;
    $("#timelineProjectName").textContent = project.name;
    if (/lego/i.test(project.type)) {
      setLegoMode(true);
      showView("camera");
      notify("LEGO Brick Mode ready. Capture your first frame!");
    } else {
      setLegoMode(false);
      showView("timeline");
      notify("Workspace opened: " + project.name);
    }
  }

  // ---------- Timeline model and rendering ----------
  function setMonitorMode(mode) {
    state.monitorMode = mode === "animation" ? "animation" : "live";
    $("#cameraViewfinder").classList.toggle("show-animation-frame", state.monitorMode === "animation");
    $("#liveViewModeBtn").classList.toggle("active", state.monitorMode === "live");
    $("#animationViewModeBtn").classList.toggle("active", state.monitorMode === "animation");
  }

  function setFrame(value) {
    // Animator-facing frame numbers are 1-based; array indices remain 0-based.
    const maxFrame = state.frames.length || 120;
    state.frame = Math.max(1, Math.min(maxFrame, Math.round(Number(value) || 1)));
    state.selectedFrameIndex = state.frames.length ? Math.min(state.frames.length - 1, state.frame - 1) : -1;
    $("#frameScrubber").max = maxFrame;
    $("#frameScrubber").value = state.frame;
    $("#currentFrameLabel").textContent = frameLabel(state.frame);
    $("#scrubberValue").textContent = String(state.frame).padStart(3, "0");
    $("#captureFrameReadout").textContent = "FRAME " + String(state.frame).padStart(3, "0");
    const selected = state.frames[state.selectedFrameIndex];
    if (selected?.src) { animationPreview.src = selected.src; animationPreview.hidden = false; }
    else { animationPreview.removeAttribute("src"); animationPreview.hidden = true; }
    syncFrameSelection();
    renderAnimationWorkspace();
  }

  function stopPlayback() {
    state.playing = false;
    window.clearInterval(state.playTimer);
    state.playTimer = null;
    $("#playTimeline").textContent = "▶";
    $("#playTimeline").setAttribute("aria-label", "Play timeline");
  }

  function togglePlayback(startAt = null, endAt = null, loopOverride = null) {
    if (state.playing) return stopPlayback();
    if (startAt !== null) setFrame(startAt);
    setMonitorMode("animation");
    const finalFrame = endAt ?? Math.max(1, state.frames.length || 120);
    state.playing = true;
    $("#playTimeline").textContent = "Ⅱ";
    $("#playTimeline").setAttribute("aria-label", "Pause animation");
    state.playTimer = window.setInterval(() => {
      const next = nextFrameIndex(state.frame, finalFrame, loopOverride ?? state.loopPlayback);
      if (next === null) return stopPlayback();
      setFrame(next);
    }, 1000 / state.playbackFps);
  }

  function renderTimeline() {
    const host = $("#tracks");
    host.innerHTML = state.tracks.map((track, trackIndex) => `
      <div class="track-row" draggable="true" data-track-id="${escapeHTML(track.id)}">
        <div class="track-name"><span class="track-grip" aria-hidden="true">⠿</span>${escapeHTML(track.name)}</div>
        <div class="track-lane" data-lane-id="${escapeHTML(track.id)}">
          ${track.clips.map(clip => `<button type="button" class="clip clip-${escapeHTML(clip.color)}" data-clip-id="${escapeHTML(clip.id)}" style="left:${clip.start / 120 * 100}%;width:${clip.duration / 120 * 100}%" aria-label="${escapeHTML(clip.label)}, starts at frame ${clip.start}">${escapeHTML(clip.label)}</button>`).join("")}
          ${state.markers.map(marker => `<span class="timeline-marker" style="left:${marker.frame / 120 * 100}%" title="${escapeHTML(marker.name)} · frame ${marker.frame}"></span>`).join("")}
        </div>
      </div>`).join("");

    // Pointer events support both mouse and touch; clips remain within their lane.
    $$(".clip", host).forEach(clip => {
      clip.addEventListener("pointerdown", event => {
        event.stopPropagation(); // Keep clip drags separate from whole-track reordering.
        if (event.button !== 0) return;
        const lane = clip.closest(".track-lane");
        const bounds = lane.getBoundingClientRect();
        const startX = event.clientX;
        const originalLeft = parseFloat(clip.style.left) || 0;
        clip.setPointerCapture(event.pointerId);
        clip.classList.add("dragging");

        const move = moveEvent => {
          const width = parseFloat(clip.style.width) || 10;
          const delta = (moveEvent.clientX - startX) / bounds.width * 100;
          const next = Math.max(0, Math.min(100 - width, originalLeft + delta));
          clip.style.left = next + "%";
        };
        const finish = () => {
          const track = state.tracks.find(item => item.id === lane.dataset.laneId);
          const model = track?.clips.find(item => item.id === clip.dataset.clipId);
          if (model) moveClip(state.tracks, lane.dataset.laneId, clip.dataset.clipId, Math.round(parseFloat(clip.style.left) / 100 * 120));
          clip.classList.remove("dragging");
          clip.removeEventListener("pointermove", move);
          clip.removeEventListener("pointerup", finish);
          clip.removeEventListener("pointercancel", finish);
          persistTimeline();
        };
        clip.addEventListener("pointermove", move);
        clip.addEventListener("pointerup", finish);
        clip.addEventListener("pointercancel", finish);
      });
    });

    // Drag a whole track by its row to reorder the production layers.
    let draggedTrackId = null;
    $$(".track-row", host).forEach(row => {
      row.addEventListener("dragstart", event => {
        draggedTrackId = row.dataset.trackId;
        row.classList.add("track-dragging");
        event.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragover", event => {
        event.preventDefault();
        row.classList.add("track-drop-target");
      });
      row.addEventListener("dragleave", () => row.classList.remove("track-drop-target"));
      row.addEventListener("drop", event => {
        event.preventDefault();
        if (!reorderTrack(state.tracks, draggedTrackId, row.dataset.trackId)) return;
        persistTimeline();
        renderTimeline();
      });
      row.addEventListener("dragend", () => {
        draggedTrackId = null;
        $$(".track-row", host).forEach(item => item.classList.remove("track-dragging", "track-drop-target"));
      });
    });

    $("#markerLabel").textContent = state.markers.length
      ? state.markers.length + (state.markers.length === 1 ? " marker" : " markers")
      : "No markers yet";
  }

  function addTrack() {
    const name = window.prompt("Name this track:", "New track");
    if (!name?.trim()) return;
    state.tracks.push(createTrack(name));
    persistTimeline();
    renderTimeline();
    notify("Track added.");
  }

  function addMarker() {
    const name = window.prompt("Marker name:", "Shot marker");
    if (!name?.trim()) return;
    state.markers.push(createMarker(name, state.frame));
    persistTimeline();
    renderTimeline();
    notify("Marker added at frame " + state.frame + ".");
  }

  // ---------- Lip-sync cue sheet ----------
  function renderCues() {
    $("#cueCount").textContent = state.cues.length;
    const list = $("#cueList");
    if (!state.cues.length) {
      list.innerHTML = '<div class="empty-state compact"><div class="empty-icon">◖</div><strong>No cues yet</strong><p>Add a cue to begin your mouth-shape sequence.</p></div>';
      return;
    }
    list.innerHTML = state.cues.map((cue, index) => `
      <div class="cue-item"><span class="cue-frame">FRAME ${cue.frame}</span>
        <span class="cue-shape">${escapeHTML(cue.shape)} ${cue.note ? '<small class="cue-note">' + escapeHTML(cue.note) + '</small>' : ""}</span>
        <button class="remove-cue" type="button" data-remove-cue="${index}" aria-label="Remove cue">×</button>
      </div>`).join("");
    $$("[data-remove-cue]").forEach(button => button.addEventListener("click", () => {
      state.cues.splice(+button.dataset.removeCue, 1);
      storage.write(STORAGE_KEYS.cues, state.cues);
      renderCues();
    }));
  }

  // ---------- Camera station ----------
  function syncCameraPowerSwitch(mode = "off") {
    const control = $("#cameraConnectBtn");
    if (!control) return;
    const live = mode === "on";
    const pending = mode === "pending";
    control.classList.toggle("is-on", live);
    control.classList.toggle("is-pending", pending);
    control.setAttribute("role", "switch");
    control.setAttribute("aria-checked", String(live));
    control.setAttribute("aria-pressed", String(live));
    control.setAttribute("aria-label", pending ? "Waiting for camera permission" : live ? "Turn camera off" : "Turn camera on");
    control.title = pending ? "Waiting for camera permission" : live ? "Camera on — tap to turn off" : "Camera off — tap to turn on";
  }

  function setCameraStatus(message, live = false) {
    const badge = $("#cameraStateBadge");
    const pill = $(".preview-pill");
    if (badge) {
      badge.classList.toggle("is-live", live);
      badge.innerHTML = "<i></i> " + (live ? "Camera on" : "Camera off");
    }
    if (pill) {
      pill.classList.toggle("live", live);
      pill.innerHTML = "<i></i> " + (live ? "LIVE CAMERA" : "CAMERA OFF");
    }
    if ($("#cameraPermissionStatus")) $("#cameraPermissionStatus").textContent = message;
  }

  async function connectCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Camera access needs HTTPS or localhost and a supported browser.", false);
      notify("Camera access needs HTTPS or localhost and a supported browser.");
      return;
    }
    // This function is called only by the user's explicit button press.
    $("#cameraConnectBtn").disabled = true;
    syncCameraPowerSwitch("pending");
    $("#cameraPrivacyStatus").textContent = "Waiting for your browser's camera permission decision.";
    $("#cameraPermissionStatus").textContent = "Your browser should now ask whether PhoenixFramez may use the camera.";
    try {
      state.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      let video = $("#cameraVideo");
      if (!video) {
        video = document.createElement("video");
        video.id = "cameraVideo";
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.setAttribute("aria-label", "Local live camera preview");
        $("#cameraViewfinder").prepend(video);
      }
      video.srcObject = state.cameraStream;
      await video.play().catch(() => {});
      $("#cameraViewfinder").classList.add("has-camera");
      syncCameraPowerSwitch("on");
      $("#cameraSource").value = "Local camera (browser permission)";
      $("#cameraPrivacyStatus").textContent = "Camera is active locally in this browser. No camera video or audio is sent to PhoenixFramez servers or used for analytics.";
      setCameraStatus("Live preview active. Turn the camera off whenever you like.", true);
      state.cameraStream.getVideoTracks().forEach(track => {
        track.addEventListener("ended", () => {
          if (state.cameraStream) disconnectCamera(false);
        }, { once: true });
      });
      notify("Camera connected. Your live feed stays in this browser.");
    } catch (error) {
      state.cameraStream = null;
      syncCameraPowerSwitch("off");
      $("#cameraPrivacyStatus").textContent = error.name === "NotAllowedError"
        ? "Camera permission was denied or blocked. You can change this in your browser's site settings."
        : "No camera feed was started. No camera frames were received.";
      setCameraStatus(error.name === "NotAllowedError" ? "Permission denied. Check browser site settings to allow camera access." : "Could not start the camera. Check that a camera is connected and not being used by another app.", false);
      notify(error.name === "NotAllowedError" ? "Camera permission was denied." : "Could not connect to a camera.");
    } finally {
      $("#cameraConnectBtn").disabled = false;
    }
  }

  function disconnectCamera(showNotice = true) {
    // Stop every media track immediately and stop interval capture before removing the preview.
    if (state.intervalTimer) {
      window.clearInterval(state.intervalTimer);
      state.intervalTimer = null;
      state.intervalRunning = false;
      $("#intervalCaptureBtn").textContent = "Start interval";
    }
    state.cameraStream?.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
    const video = $("#cameraVideo");
    if (video) {
      video.pause();
      video.srcObject = null;
      video.remove();
    }
    $("#cameraViewfinder").classList.remove("has-camera");
    syncCameraPowerSwitch("off");
    $("#cameraSource").value = "Not connected";
    $("#cameraPrivacyStatus").textContent = "Camera is off. PhoenixFramez has stopped the camera tracks; no live feed is active.";
    setCameraStatus("Camera is off. No live camera feed is active.", false);
    if (showNotice) notify("Camera off. Camera access has stopped.");
  }

  function syncFrameSelection() {
    // Highlight the current exposure without rebuilding thumbnails on every playback tick.
    $$(".frame-select, .exposure-cell").forEach(button => {
      button.classList.toggle("selected", Number(button.dataset.frameIndex) === state.selectedFrameIndex);
    });
    onionSkin.setSource(previousFrameSource(state.frames, state.selectedFrameIndex));
    $("#exposureCount").textContent = state.frames.length + " exposures";
  }

  function renderFrames() {
    frameSequence.replace(state.frames);
    $("#frameCount").textContent = state.frames.length + " FRAMES";
    const renderCell = (frame, index, exposure = false) => {
      const image = frame.blank ? '<span class="frame-thumb blank-frame">BLANK</span>' : '<img class="frame-thumb" src="' + frame.src + '" alt="" loading="lazy">';
      return '<button type="button" class="' + (exposure ? "exposure-cell" : "frame-select") + (index === state.selectedFrameIndex ? " selected" : "") + '" data-frame-index="' + index + '" aria-label="Select exposure ' + (index + 1) + '">' + image + '<small>' + String(index + 1).padStart(3, "0") + '</small></button>';
    };
    $("#frameLibrary").innerHTML = state.frames.length
      ? state.frames.map((frame, index) => renderCell(frame, index)).join("")
      : '<div class="frame-empty">Capture or import your first still.</div>';
    $("#exposureSheet").innerHTML = state.frames.length
      ? state.frames.map((frame, index) => renderCell(frame, index, true)).join("")
      : '<span class="muted tiny">Capture or import stills to build your exposure sheet.</span>';
    $("[data-frame-index]").forEach(button => button.addEventListener("click", () => { setMonitorMode("animation"); setFrame(Number(button.dataset.frameIndex) + 1); }));
    syncFrameSelection();
    renderAnimationWorkspace();
    storage.write(STORAGE_KEYS.frames, state.frames);
    $("#frameScrubber").max = state.frames.length || 120;
  }

  function captureFrame() {
    const video = $("#cameraVideo");
    if (!video || !video.videoWidth) return notify("Connect a camera or import a still to add a frame.");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    state.frames.push({ id: makeId("frame"), projectId: state.activeProjectId, src: canvas.toDataURL("image/jpeg", 0.86), createdAt: new Date().toISOString() });
    setFrame(state.frames.length);
    renderFrames();
    setMonitorMode("live");
    notify("Frame " + String(state.frames.length).padStart(3, "0") + " captured.");
  }

  async function importFrames(files) {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        state.frames.push({ id: makeId("frame"), projectId: state.activeProjectId, src: canvas.toDataURL("image/jpeg", 0.86), createdAt: new Date().toISOString(), source: file.name });
      } catch (error) {
        console.warn("[PhoenixFrame] Skipped an unreadable image:", error);
      }
    }
    if (state.frames.length) setFrame(state.frames.length);
    renderFrames();
    if (state.frames.length) setMonitorMode("animation");
  }

  function toggleIntervalCapture() {
    if (state.intervalRunning) {
      window.clearInterval(state.intervalTimer);
      state.intervalTimer = null;
      state.intervalRunning = false;
      $("#intervalCaptureBtn").textContent = "Start interval";
      notify("Interval capture stopped.");
      return;
    }
    if (!state.cameraStream) return notify("Connect a camera before starting interval capture.");
    const seconds = Math.max(1, Math.min(3600, Number($("#intervalSeconds").value) || 5));
    state.intervalRunning = true;
    $("#intervalCaptureBtn").textContent = "Stop interval";
    captureFrame();
    state.intervalTimer = window.setInterval(captureFrame, seconds * 1000);
    notify("Interval capture started: every " + seconds + " seconds.");
  }

  // ---------- Portable project snapshot ----------
  function exportProject() {
    const payload = buildProjectArchive(state);
    downloadJson(payload, "phoenixframe-project.json");
    notify("Project archive exported.");
  }

  // ---------- Event wiring ----------
  $$(".nav-item").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $$("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
  $$("[data-dock-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.dockView)));
  $$("[data-quick-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.quickView)));
  $("#quickExport").addEventListener("click", exportProject);
  $("#dockCreate").addEventListener("click", openProjectDialog);
  $("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  ["#newProjectBtn", "#addProjectLink", "#browserNewProject"].forEach(selector => {
    $(selector)?.addEventListener("click", openProjectDialog);
  });

  $("#projectForm").addEventListener("submit", async event => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const name = $("#projectNameInput").value.trim();
    if (!name) return;
    const saveButton = $("#saveProjectBtn");
    saveButton.disabled = true;
    let cover = "";
    try {
      // Thumbnail failure must never prevent the creator from saving the project.
      cover = await makeCoverThumbnail($("#projectCoverInput").files[0]);
    } catch (error) {
      console.warn("[PhoenixFrame] Project thumbnail could not be processed:", error);
      notify("The project will be created without a cover thumbnail.");
    }
    state.projects.unshift(createProject({ name, type: $("#projectTypeInput").value, cover }));
    storage.write(STORAGE_KEYS.projects, state.projects);
    renderProjects();
    dialog.close();
    showView("projects");
    saveButton.disabled = false;
    notify("Project created.");
  });

  $("#projectSearch").addEventListener("input", renderProjectBrowser);
  $("#closeProjectExportBtn").addEventListener("click", () => { $("#projectExportPanel").hidden = true; });
  $("#exportSelectedArchiveBtn").addEventListener("click", exportSelectedProjectArchive);
  $("#exportSelectedFramesBtn").addEventListener("click", exportSelectedProjectFrames);
  $$(".view-toggle-btn").forEach(button => button.addEventListener("click", () => {
    $$(".view-toggle-btn").forEach(item => item.classList.toggle("active", item === button));
    state.projectLayout = button.dataset.projectLayout;
    renderProjectBrowser();
  }));

  $("#addCueBtn").addEventListener("click", () => {
    const frame = Math.max(0, Number($("#cueFrame").value) || 0);
    state.cues.push({ id: makeId("cue"), frame, shape: $("#cueShape").value, note: $("#cueNote").value.trim() });
    state.cues.sort((a, b) => a.frame - b.frame);
    $("#cueNote").value = "";
    storage.write(STORAGE_KEYS.cues, state.cues);
    renderCues();
    notify("Cue added at frame " + frame + ".");
  });
  $("#cueFrame").addEventListener("keydown", event => {
    if (event.key === "Enter") $("#addCueBtn").click();
  });

  $("#addMarkerBtn").addEventListener("click", addMarker);
  $("#addTrackBtn").addEventListener("click", addTrack);
  $("#frameScrubber").addEventListener("input", event => {
    stopPlayback();
    setMonitorMode("animation");
    setFrame(event.target.value);
  });
  $("#playTimeline").addEventListener("click", () => togglePlayback());

  // Animation-tool controls edit per-frame overlay data, never the source still.
  $("[data-animation-tool]").forEach(button => button.addEventListener("click", () => {
    $("[data-animation-tool]").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    animationTools.setTool(button.dataset.animationTool);
  }));
  $("#annotationColor").addEventListener("input", event => animationTools.setColor(event.target.value));
  $("#annotationWidth").addEventListener("input", event => {
    animationTools.setWidth(event.target.value);
    $("#brushSizeValue").textContent = event.target.value + " px";
  });
  $("#undoAnnotationBtn").addEventListener("click", () => animationTools.undo());
  $("#clearAnnotationBtn").addEventListener("click", () => {
    if (!window.confirm("Clear drawings and motion guides on this frame?")) return;
    animationTools.clear();
  });
  $("#clearMotionPathBtn").addEventListener("click", () => {
    const edit = getCurrentFrameEdit();
    edit.motionPath = [];
    state.animationEdits[getCurrentFrameKey()] = edit;
    persistAnimationEdits();
    animationTools.render(edit);
  });
  $("#differenceModeToggle").addEventListener("change", renderAnimationWorkspace);
  $("#referenceOpacity").addEventListener("input", event => {
    const edit = getCurrentFrameEdit();
    edit.referenceOpacity = Number(event.target.value) / 100;
    state.animationEdits[getCurrentFrameKey()] = edit;
    persistAnimationEdits();
    renderAnimationWorkspace();
  });
  $("#referenceImageChoose").addEventListener("click", () => $("#referenceImageInput").click());
  $("#referenceImageInput").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const token = ++referenceLoadToken;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const referenceCanvas = document.createElement("canvas");
      referenceCanvas.width = Math.max(1, Math.round(bitmap.width * scale));
      referenceCanvas.height = Math.max(1, Math.round(bitmap.height * scale));
      referenceCanvas.getContext("2d").drawImage(bitmap, 0, 0, referenceCanvas.width, referenceCanvas.height);
      bitmap.close?.();
      if (token !== referenceLoadToken) return;
      const edit = getCurrentFrameEdit();
      edit.reference = referenceCanvas.toDataURL("image/png");
      edit.referenceOpacity = Number($("#referenceOpacity").value) / 100;
      state.animationEdits[getCurrentFrameKey()] = edit;
      persistAnimationEdits();
      renderAnimationWorkspace();
      notify("Reference overlay added to this frame.");
    } catch (error) {
      console.warn("[PhoenixFrame] Reference image could not be loaded:", error);
      notify("Could not load that reference image.");
    } finally {
      event.target.value = "";
    }
  });
  $("#removeReferenceBtn").addEventListener("click", () => {
    const edit = getCurrentFrameEdit();
    edit.reference = "";
    state.animationEdits[getCurrentFrameKey()] = edit;
    persistAnimationEdits();
    renderAnimationWorkspace();
  });
  $("#liveViewModeBtn").addEventListener("click", () => setMonitorMode("live"));
  $("#animationViewModeBtn").addEventListener("click", () => setMonitorMode("animation"));
  $("#stepBackBtn").addEventListener("click", () => { stopPlayback(); setMonitorMode("animation"); setFrame(Math.max(1, state.frame - 1)); });
  $("#stepForwardBtn").addEventListener("click", () => { stopPlayback(); setMonitorMode("animation"); setFrame(Math.min(Math.max(1, state.frames.length), state.frame + 1)); });
  $("#shortPlayBtn").addEventListener("click", () => togglePlayback(Math.max(1, state.frame - 11), state.frame, false));
  $("#playbackFps").addEventListener("change", event => { state.playbackFps = normalizeFps(event.target.value); if (state.playing) { stopPlayback(); togglePlayback(); } });
  $("#loopPlayback").addEventListener("change", event => { state.loopPlayback = event.target.checked; });

  $("#copyFrameBtn").addEventListener("click", () => {
    if (!frameSequence.copy(state.selectedFrameIndex)) return notify("Select a frame to copy first.");
    notify("Frame copied.");
  });
  $("#pasteFrameBtn").addEventListener("click", () => {
    if (!frameSequence.paste(state.selectedFrameIndex + 1)) return notify("Copy a frame before pasting.");
    state.frames = frameSequence.frames; state.selectedFrameIndex += 1; setFrame(state.selectedFrameIndex + 1); renderFrames(); notify("Frame pasted.");
  });
  $("#insertBlankFrameBtn").addEventListener("click", () => {
    frameSequence.insertBlank(state.selectedFrameIndex < 0 ? state.frames.length : state.selectedFrameIndex + 1);
    state.frames = frameSequence.frames; state.selectedFrameIndex = Math.max(0, state.selectedFrameIndex + 1); setFrame(state.selectedFrameIndex + 1); renderFrames(); notify("Blank frame inserted.");
  });
  $("#deleteFrameBtn").addEventListener("click", () => {
    if (!frameSequence.remove(state.selectedFrameIndex)) return notify("Select a frame to delete first.");
    state.frames = frameSequence.frames; state.selectedFrameIndex = Math.min(state.selectedFrameIndex, state.frames.length - 1); if (state.selectedFrameIndex >= 0) setFrame(state.selectedFrameIndex + 1); else state.frame = 1; renderFrames(); notify("Frame deleted.");
  });
  $("#audioImportBtn").addEventListener("click", () => $("#audioFileInput").click());
  $("#audioFileInput").addEventListener("change", event => {
    const file = event.target.files[0]; if (!file) return;
    try { const info = audioEngine.load(file); $("#audioFileName").textContent = info.name; $("#audioPreview").hidden = false; notify("Audio ready for local preview."); }
    catch (error) { notify(error.message); }
    event.target.value = "";
  });
  $("#audioClearBtn").addEventListener("click", () => {
    audioEngine.clear(); $("#audioPreview").hidden = true; $("#audioFileName").textContent = "No audio loaded";
  });
  $("#importProjectBtn").addEventListener("click", () => $("#projectArchiveInput").click());
  $("#projectArchiveInput").addEventListener("change", async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const archive = validateProjectArchive(JSON.parse(await file.text()));
      if (!window.confirm("Import this archive and replace the current PhoenixFrame browser workspace?")) return;
      state.projects = archive.projects; state.cues = archive.cues; state.frames = archive.frames; state.animationEdits = archive.animationEdits || {}; state.selectedFrameIndex = state.frames.length ? state.frames.length - 1 : -1;
      const timeline = normalizeTimeline(archive.timeline);
      state.markers = timeline.markers; state.tracks = timeline.tracks;
      storage.write(STORAGE_KEYS.projects, state.projects); storage.write(STORAGE_KEYS.cues, state.cues);
      storage.write(STORAGE_KEYS.frames, state.frames); persistAnimationEdits(); persistTimeline();
      renderProjects(); renderCues(); renderTimeline(); if (state.frames.length) setFrame(state.frames.length); renderFrames(); notify("Project archive imported.");
    } catch (error) { console.warn("[PhoenixFrame] Archive import failed:", error); notify(error.message || "Could not import this project archive."); }
    finally { event.target.value = ""; }
  });
  $("#cameraConnectBtn").addEventListener("click", () => state.cameraStream ? disconnectCamera() : connectCamera());
  $("#shutterBtn").addEventListener("click", captureFrame);
  $("#cameraImportBtn").addEventListener("click", () => $("#cameraFileInput").click());
  $("#cameraFileInput").addEventListener("change", event => {
    importFrames([...event.target.files]);
    event.target.value = "";
  });
  $("#onionToggle").addEventListener("change", event => onionSkin.setEnabled(event.target.checked));
  $("#captureFps").addEventListener("change", event => { state.playbackFps = normalizeFps(event.target.value); $("#playbackFps").value = String(state.playbackFps); $("#cameraFpsReadout").textContent = state.playbackFps + " FPS"; $("#timelineFpsLabel").textContent = state.playbackFps + " FPS"; });
  $("#aspectRatioSelect").addEventListener("change", event => { $("#cameraViewfinder").dataset.aspect = event.target.value; $("#cameraAspectReadout").textContent = event.target.value; });
  $("#gridGuideToggle").addEventListener("change", event => $("#cameraViewfinder").classList.toggle("guide-grid", event.target.checked));
  $("#safeGuideToggle").addEventListener("change", event => $("#cameraViewfinder").classList.toggle("guide-safe", event.target.checked));
  $("#maskGuideToggle").addEventListener("change", event => $("#cameraViewfinder").classList.toggle("guide-mask", event.target.checked));
  $("#captureBlackoutToggle").addEventListener("change", event => $("#cameraViewfinder").classList.toggle("capture-blackout", event.target.checked));
  $("#intervalCaptureBtn").addEventListener("click", toggleIntervalCapture);
  $("#onionOpacity").addEventListener("input", event => {
    onionSkin.setOpacity(event.target.value);
    $("#onionOpacityValue").textContent = event.target.value + "%";
  });
  $("#expandCameraBtn").addEventListener("click", () => {
    const expanded = $("#cameraViewfinder").classList.toggle("is-expanded");
    $("#expandCameraBtn").setAttribute("aria-pressed", String(expanded));
    $("#expandCameraBtn").textContent = expanded ? "⤢ Fit view" : "⛶ Expand view";
  });
  onionSkin.setEnabled($("#onionToggle").checked);
  onionSkin.setOpacity($("#onionOpacity").value);
  $("#onionOpacityValue").textContent = $("#onionOpacity").value + "%";
  setCameraStatus("Camera is off. Turn it on when you're ready.", false);
  window.addEventListener("pagehide", () => {
    state.cameraStream?.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  });
  $("#cameraViewfinder").classList.toggle("guide-grid", $("#gridGuideToggle").checked);
  $("#cameraViewfinder").classList.toggle("guide-safe", $("#safeGuideToggle").checked);
  $("#cameraViewfinder").classList.toggle("guide-mask", $("#maskGuideToggle").checked);
  $("#cameraViewfinder").dataset.aspect = $("#aspectRatioSelect").value;
  $("#cameraFpsReadout").textContent = state.playbackFps + " FPS";
  $("#timelineFpsLabel").textContent = state.playbackFps + " FPS";

  // Keyboard shortcuts mirror the essential one-key animator controls.
  document.addEventListener("keydown", event => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stopPlayback();
      setMonitorMode("animation");
      setFrame(Math.max(1, state.frame - 1));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stopPlayback();
      setMonitorMode("animation");
      setFrame(Math.min(state.frames.length || 120, state.frame + 1));
    } else if (event.key.toLowerCase() === "c" && $("#cameraView").classList.contains("active-view")) {
      captureFrame();
    } else if (event.key === "Delete" && $("#cameraView").classList.contains("active-view")) {
      if (frameSequence.remove(state.selectedFrameIndex)) {
        state.frames = frameSequence.frames;
        state.selectedFrameIndex = Math.min(state.selectedFrameIndex, state.frames.length - 1);
        if (state.selectedFrameIndex >= 0) setFrame(state.selectedFrameIndex + 1);
        else state.frame = 1;
        renderFrames();
      }
    }
  });

  window.addEventListener("pagehide", () => {
    stopPlayback();
    state.cameraStream?.getTracks().forEach(track => track.stop());
    audioEngine.dispose();
    animationTools.dispose();
    window.clearInterval(state.intervalTimer);
  });

  // ---------- Initial render ----------
  renderProjects();
  renderCues();
  renderTimeline();
  renderFrames();
  setFrame(1);
  renderAnimationWorkspace();
})();