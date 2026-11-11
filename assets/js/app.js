(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = { projects: [], cues: [], markers: 0, tracks: 0 };
  const dialog = $("#projectDialog");
  const toast = $("#toast");
  let toastTimer;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function showView(name) {
    $$(".view").forEach(view => view.classList.remove("active-view"));
    const target = document.getElementById(name + "View");
    if (target) target.classList.add("active-view");
    $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === name));
    const label = name === "overview" ? "Overview" : name === "lipsync" ? "Lip Sync" : name[0].toUpperCase() + name.slice(1);
    $("#pageName").textContent = label;
    $("#sidebar").classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function openProjectDialog() {
    $("#projectNameInput").value = "";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else notify("Project creation requires a modern browser.");
    $("#projectNameInput").focus();
  }

  function renderProjects() {
    $("#projectCount").textContent = state.projects.length;
    const list = $("#projectList");
    if (!state.projects.length) {
      list.className = "empty-state";
      list.innerHTML = '<div class="empty-icon">▱</div><strong>No projects yet</strong><p>Create a project to start organizing your scenes and animation work.</p><button class="secondary-btn" id="emptyCreateBtn">Create your first project</button>';
      $("#emptyCreateBtn").addEventListener("click", openProjectDialog);
      return;
    }
    list.className = "";
    list.innerHTML = state.projects.map((project, index) => `
      <div class="project-list-item">
        <div class="project-symbol">▣</div>
        <div><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.type)} · Created just now</small></div>
        <button class="project-open" data-project="${index}">Open</button>
      </div>`).join("");
    $$(".project-open").forEach(button => button.addEventListener("click", () => {
      const project = state.projects[Number(button.dataset.project)];
      $("#timelineProjectName").textContent = project.name;
      showView("timeline");
      notify("Workspace opened: " + project.name);
    }));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }

  function addCue() {
    const frame = Math.max(0, Number($("#cueFrame").value) || 0);
    const shape = $("#cueShape").value;
    const note = $("#cueNote").value.trim();
    state.cues.push({frame, shape, note});
    state.cues.sort((a,b) => a.frame - b.frame);
    $("#cueNote").value = "";
    renderCues();
    notify("Cue added at frame " + frame);
  }

  function renderCues() {
    $("#cueCount").textContent = state.cues.length;
    const list = $("#cueList");
    if (!state.cues.length) {
      list.innerHTML = '<div class="empty-state compact"><div class="empty-icon">◖</div><strong>No cues yet</strong><p>Add a cue to begin your mouth-shape sequence.</p></div>';
      return;
    }
    list.innerHTML = state.cues.map((cue,index) => `
      <div class="cue-item"><span class="cue-frame">FRAME ${cue.frame}</span><span class="cue-shape">${escapeHtml(cue.shape)} ${cue.note ? '<small class="cue-note">'+escapeHtml(cue.note)+'</small>' : ''}</span><button class="remove-cue" data-remove="${index}" aria-label="Remove cue">×</button></div>`).join("");
    $$("[data-remove]").forEach(button => button.addEventListener("click", () => {
      state.cues.splice(Number(button.dataset.remove),1);
      renderCues();
    }));
  }

  $$(".nav-item").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $$("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
  $("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#newProjectBtn").addEventListener("click", openProjectDialog);
  $("#addProjectLink").addEventListener("click", openProjectDialog);
  $("#emptyCreateBtn").addEventListener("click", openProjectDialog);
  $("#projectForm").addEventListener("submit", event => {
    if (event.submitter && event.submitter.value === "cancel") return;
    event.preventDefault();
    const name = $("#projectNameInput").value.trim();
    if (!name) return;
    state.projects.unshift({name,type:$("#projectTypeInput").value});
    renderProjects();
    dialog.close();
    notify("Project created.");
  });
  $("#addCueBtn").addEventListener("click", addCue);
  $("#cueFrame").addEventListener("keydown", event => { if(event.key === "Enter") addCue(); });
  $("#addMarkerBtn").addEventListener("click", () => {
    state.markers++;
    $("#markerLabel").textContent = state.markers + (state.markers === 1 ? " marker added" : " markers added");
    notify("Marker added to sequence.");
  });
  $("#addTrackBtn").addEventListener("click", () => {
    state.tracks++;
    const row = document.createElement("div");
    row.className = "track-row";
    row.innerHTML = '<div class="track-name">Track ' + (state.tracks + 3) + '</div><div class="track-lane"></div>';
    $("#tracks").appendChild(row);
    notify("Track added.");
  });
  renderProjects();
  renderCues();
})();