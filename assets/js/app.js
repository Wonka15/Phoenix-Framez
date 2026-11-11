/**
 * PhoenixFrame 1.0 — browser studio controller
 * ------------------------------------------------------------
 * This file deliberately keeps the first alpha dependency-free:
 * - DOM helpers and safe storage live at the top.
 * - State is kept in one object and persisted through Storage.
 * - Rendering functions only update their own UI regions.
 * - Event wiring is grouped at the bottom for easy auditing.
 *
 * GitHub Pages is a static host. Camera access uses browser APIs;
 * native desktop integrations must go through the separate local bridge.
 */
(() => {
  "use strict";

  // ---------- DOM and storage helpers ----------
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEYS = {
    projects: "phoenixframe.projects",
    cues: "phoenixframe.cues",
    timeline: "phoenixframe.timeline",
    frames: "phoenixframe.frames"
  };

  const storage = {
    read(key, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
      } catch (error) {
        console.warn("[PhoenixFrame] Could not read local data:", error);
        return fallback;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("[PhoenixFrame] Could not save local data:", error);
        notify("Browser storage is full or unavailable. Export your project data.");
        return false;
      }
    }
  };

  // ---------- Application state ----------
  const savedTimeline = storage.read(STORAGE_KEYS.timeline, {});
  const state = {
    projects: storage.read(STORAGE_KEYS.projects, []),
    cues: storage.read(STORAGE_KEYS.cues, []),
    frames: storage.read(STORAGE_KEYS.frames, []),
    markers: Array.isArray(savedTimeline.markers) ? savedTimeline.markers : [],
    tracks: Array.isArray(savedTimeline.tracks) ? savedTimeline.tracks : [
      { id: "camera", name: "Camera", clips: [{ id: "opening", label: "Opening shot", start: 2, duration: 30, color: "purple" }] },
      { id: "animation", name: "Animation", clips: [{ id: "blocking", label: "Character blocking", start: 18, duration: 38, color: "blue" }] },
      { id: "audio", name: "Audio", clips: [{ id: "scratch-audio", label: "Scratch audio", start: 3, duration: 65, color: "amber" }] }
    ],
    frame: 1,
    playing: false,
    playTimer: null,
    projectLayout: "grid",
    cameraStream: null,
    activeProjectId: null
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

  // Escape user-entered text before inserting it into HTML templates.
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function makeId(prefix = "item") {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
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

    const labels = { overview: "Overview", lipsync: "Lip Sync", camera: "Camera station", projects: "Projects" };
    $("#pageName").textContent = labels[name] || name[0].toUpperCase() + name.slice(1);
    $("#sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProjectDialog() {
    $("#projectNameInput").value = "";
    $("#projectCoverInput").value = "";
    if (dialog?.showModal) dialog.showModal();
    else notify("Project creation requires a modern browser.");
  }

  // Convert an uploaded cover into a small JPEG thumbnail so the browser
  // stores a lightweight preview rather than the full-resolution original.
  async function readCoverThumbnail(file) {
    if (!file || !file.type.startsWith("image/")) return "";
    const source = await createImageBitmap(file);
    const scale = Math.min(1, 640 / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
    source.close?.();
    return canvas.toDataURL("image/jpeg", 0.78);
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
          <button type="button" data-open-project="${index}">Open project ↗</button>
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
  }

  function openProject(index) {
    const project = state.projects[index];
    if (!project) return;
    state.activeProjectId = project.id;
    $("#timelineProjectName").textContent = project.name;
    showView("timeline");
    notify("Workspace opened: " + project.name);
  }

  // ---------- Timeline model and rendering ----------
  function setFrame(value) {
    state.frame = Math.max(0, Math.min(120, Math.round(Number(value) || 0)));
    $("#frameScrubber").value = state.frame;
    $("#currentFrameLabel").textContent = "Frame " + String(state.frame).padStart(3, "0");
    $("#scrubberValue").textContent = String(state.frame).padStart(3, "0");
  }

  function stopPlayback() {
    state.playing = false;
    window.clearInterval(state.playTimer);
    state.playTimer = null;
    $("#playTimeline").textContent = "▶";
    $("#playTimeline").setAttribute("aria-label", "Play timeline");
  }

  function togglePlayback() {
    if (state.playing) return stopPlayback();
    state.playing = true;
    $("#playTimeline").textContent = "Ⅱ";
    $("#playTimeline").setAttribute("aria-label", "Pause timeline");
    state.playTimer = window.setInterval(() => setFrame(state.frame >= 120 ? 0 : state.frame + 1), 1000 / 24);
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
          if (model) model.start = Math.round(parseFloat(clip.style.left) / 100 * 120);
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
        const from = state.tracks.findIndex(track => track.id === draggedTrackId);
        const to = state.tracks.findIndex(track => track.id === row.dataset.trackId);
        if (from < 0 || to < 0 || from === to) return;
        const [moved] = state.tracks.splice(from, 1);
        state.tracks.splice(to, 0, moved);
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
    state.tracks.push({ id: makeId("track"), name: name.trim(), clips: [] });
    persistTimeline();
    renderTimeline();
    notify("Track added.");
  }

  function addMarker() {
    const name = window.prompt("Marker name:", "Shot marker");
    if (!name?.trim()) return;
    state.markers.push({ id: makeId("marker"), name: name.trim(), frame: state.frame });
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
  async function connectCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      notify("Camera access needs HTTPS or localhost and a supported browser.");
      return;
    }
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
        $("#cameraViewfinder").prepend(video);
      }
      video.srcObject = state.cameraStream;
      $("#cameraViewfinder").classList.add("has-camera");
      $("#cameraConnectBtn").textContent = "Disconnect camera";
      $("#cameraSource").value = "Local camera (browser permission)";
      $(".preview-pill").innerHTML = "<i></i> LIVE CAMERA";
      notify("Camera connected.");
    } catch (error) {
      notify(error.name === "NotAllowedError" ? "Camera permission was denied." : "Could not connect to a camera.");
    }
  }

  function disconnectCamera() {
    state.cameraStream?.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
    $("#cameraVideo")?.remove();
    $("#cameraViewfinder").classList.remove("has-camera");
    $("#cameraConnectBtn").textContent = "Connect camera";
    $(".preview-pill").innerHTML = "<i></i> PREVIEW MOCKUP";
    $("#cameraSource").value = "Not connected";
    notify("Camera disconnected.");
  }

  function renderFrames() {
    $("#frameCount").textContent = state.frames.length + " FRAMES";
    $("#frameLibrary").innerHTML = state.frames.length
      ? state.frames.map((frame, index) => `<img class="frame-thumb" src="${frame.src}" alt="Captured frame ${index + 1}" loading="lazy">`).join("")
      : '<div class="frame-empty">Your captured frames will appear here.</div>';
    storage.write(STORAGE_KEYS.frames, state.frames);
  }

  function captureFrame() {
    const video = $("#cameraVideo");
    if (!video || !video.videoWidth) return notify("Connect a camera or import a still to add a frame.");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    state.frames.unshift({ src: canvas.toDataURL("image/jpeg", 0.78), createdAt: new Date().toISOString() });
    renderFrames();
    notify("Still captured.");
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
        state.frames.unshift({ src: canvas.toDataURL("image/jpeg", 0.78), createdAt: new Date().toISOString() });
      } catch (error) {
        console.warn("[PhoenixFrame] Skipped an unreadable image:", error);
      }
    }
    renderFrames();
  }

  // ---------- Portable project snapshot ----------
  function exportProject() {
    const payload = {
      format: "phoenixframe-project",
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: state.projects,
      cues: state.cues,
      timeline: { markers: state.markers, tracks: state.tracks },
      frames: state.frames
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "phoenixframe-project.json";
    link.click();
    URL.revokeObjectURL(url);
    notify("Project manifest exported.");
  }

  // ---------- Event wiring ----------
  $$(".nav-item").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $$("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
  $$("[data-dock-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.dockView)));
  $$("[data-quick-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.quickView)));
  $("#quickExport").addEventListener("click", exportProject);
  $("#dockCreate").addEventListener("click", openProjectDialog);
  $("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  ["#newProjectBtn", "#addProjectLink", "#browserNewProject", "#browserEmptyCreate"].forEach(selector => {
    $(selector)?.addEventListener("click", openProjectDialog);
  });

  $("#projectForm").addEventListener("submit", async event => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const name = $("#projectNameInput").value.trim();
    if (!name) return;
    const saveButton = $("#saveProjectBtn");
    saveButton.disabled = true;
    try {
      const cover = await readCoverThumbnail($("#projectCoverInput").files[0]);
      state.projects.unshift({
        id: makeId("project"),
        name,
        type: $("#projectTypeInput").value,
        date: new Date().toLocaleDateString(),
        cover
      });
      storage.write(STORAGE_KEYS.projects, state.projects);
      renderProjects();
      dialog.close();
      showView("projects");
      notify("Project created.");
    } catch (error) {
      console.warn("[PhoenixFrame] Project thumbnail could not be processed:", error);
      notify("Project created without its thumbnail.");
    } finally {
      saveButton.disabled = false;
    }
  });

  $("#projectSearch").addEventListener("input", renderProjectBrowser);
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
    setFrame(event.target.value);
  });
  $("#playTimeline").addEventListener("click", togglePlayback);

  $("#cameraConnectBtn").addEventListener("click", () => state.cameraStream ? disconnectCamera() : connectCamera());
  $("#shutterBtn").addEventListener("click", captureFrame);
  $("#cameraImportBtn").addEventListener("click", () => $("#cameraFileInput").click());
  $("#cameraFileInput").addEventListener("change", event => {
    importFrames([...event.target.files]);
    event.target.value = "";
  });
  $("#onionToggle").addEventListener("change", event => $("#cameraViewfinder").classList.toggle("onion-enabled", event.target.checked));
  $("#onionOpacity").addEventListener("input", event => $("#cameraViewfinder").style.setProperty("--onion-opacity", Number(event.target.value) / 100));

  window.addEventListener("pagehide", () => {
    stopPlayback();
    state.cameraStream?.getTracks().forEach(track => track.stop());
  });

  // ---------- Initial render ----------
  renderProjects();
  renderCues();
  renderTimeline();
  renderFrames();
  setFrame(1);
})();