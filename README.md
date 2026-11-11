# PhoenixFrame 1.0

A browser-based studio companion for animation planning, timeline organization, and lip-sync cue sheets.

## Current status

**Alpha 0.1 — initial web interface**

- Responsive studio dashboard
- Browser-local project creation
- Timeline planning prototype with add-track and marker controls
- Lip-sync cue sheet with add/remove controls
- Blender and Godot integration roadmap
- GitHub Pages deployment workflow

## Development branches

- `main` — stable releases
- `ndev` — active development

## Run locally

This is a static website. Open `index.html` in a browser, or serve the repository folder with any static HTTP server.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the site when changes are pushed to `ndev`. In repository Settings → Pages, set the build and deployment source to **GitHub Actions** if it is not already selected.

## Roadmap

1. Save and load project data.
2. Build a draggable, frame-accurate timeline with playback and scrubbing.
3. Add audio import and waveform visualization.
4. Define a documented project interchange format.
5. Implement and test Blender and Godot integrations.
6. Connect lip-sync cue data to Eagle Animation's real project/frame data.

## Important

Blender, Godot, and Eagle Animation connections are planned, not currently implemented. The current project and cue data are held in browser memory and are not yet persisted or exported. No integration or benchmark is described as working until it has been tested.

## License

See [LICENSE](LICENSE).