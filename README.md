# PhoenixFrame 1.0 — Animation Production Studio

PhoenixFrame is an independent, browser-based production companion for stop-motion and other frame-based animation workflows. It is designed to complement Eagle Animation while remaining useful as a standalone studio.

## Product direction

- **PhoenixFrame:** production planning, scenes, shots, takes, timing, frame organization and interchange.
- **Eagle Animation:** animation editing, playback and finishing.
- **Toucan Camera Server:** optional camera connection through its local API.
- **Python companion:** optional local image processing and production automation.

The PhoenixFrame website is intended to run as static HTML, CSS and JavaScript on GitHub Pages. Toucan and Python are separate optional local services; GitHub Pages does not run those services.

## Current status

**Alpha 0.1 — initial web interface**

- Responsive studio dashboard
- Browser-session project creation
- Timeline planning prototype with add-track and marker controls
- Lip-sync cue sheet with add/remove controls
- Integration roadmap for Eagle Animation, Toucan, Blender, Godot and optional Python tools

The current interface is a prototype. Project persistence, portable project files, camera capture and external application integrations are not yet implemented.

## Development branches

- `main` — stable releases
- `ndev` — active development

## Run locally

This is a static website. Open `index.html` in a browser, or serve the repository folder with any static HTTP server.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the site when changes are pushed to `ndev`. In repository Settings → Pages, set the build and deployment source to **GitHub Actions** if it is not already selected.

## Roadmap

1. Define and implement a versioned PhoenixFrame project manifest.
2. Add project save/load and portable export/import.
3. Inspect Eagle Animation's real project and interchange formats; build a tested file-based bridge.
4. Connect to Toucan Camera Server through its documented API, subject to browser security and network compatibility.
5. Add an optional Python companion for local image processing and production automation.
6. Evaluate Blender and Godot integrations.
7. Add automated tests and publish compatibility notes.

## Integration and licensing boundaries

PhoenixFrame should integrate with Eagle Animation and Toucan through documented APIs and portable file formats. This repository must not copy their source code or assets. Eagle Animation and Toucan Camera Server are GPL-3.0 projects, while this repository currently declares MIT; review licensing before distributing combined or derivative software. See [the integration architecture](docs/INTEGRATION-ARCHITECTURE.md).

## Important

Eagle Animation, Toucan, Python, Blender and Godot integrations are planned, not currently working features. No automatic synchronization, camera control or benchmark is claimed until implemented and tested.

## License

See [LICENSE](LICENSE).
