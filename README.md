# Shalini Bansal — Portfolio

Single-page portfolio site with interactive 3D viewers for CAD projects.
Plain HTML / CSS / JavaScript — no build step.

## Local preview

The 3D viewer loads `.glb` files over `fetch`, so you need to serve the
folder over HTTP (opening `index.html` with `file://` will fail to load
the models due to browser security).

From inside this folder:

```bash
# Python 3 (already on macOS)
python3 -m http.server 8000

# or, if you have Node
npx serve .
```

Then open <http://localhost:8000> in your browser.

## File structure

```
shalini portfolio/
├── index.html                  # Main page (all sections)
├── README.md                   # This file
├── assets/
│   ├── styles.css              # All styling
│   ├── viewer.js               # Three.js 3D viewer (ES module)
│   ├── photo-placeholder.svg   # Monogram placeholder for the hero photo
│   ├── ShaliniBansal_Resume.pdf
│   └── models/                 # CAD models served to the 3D viewer
│       ├── ds30y_test_cut.glb
│       ├── g234_test_cut.glb
│       ├── umc750ss_test_cut.glb
│       ├── accelerometer_base.glb
│       ├── chess_queen.glb
│       └── vmt_test_cut.glb
└── fusion_glb_models/          # Original Fusion 360 exports (not used by site)
```

## Editing content

All text is in `index.html`. Sections are commented with `<!-- ============ … -->`
banners — search for "About", "Experience", "Projects", etc.

### Swap the hero photo

Replace `assets/photo-placeholder.svg` with a real headshot (PNG or JPG).
Either rename the file to `photo-placeholder.svg` (lazy) or update the
`<img src="…">` inside the `.hero-photo` block in `index.html`.

### Add a new CAD project

1. Export the part from Fusion 360 / SolidWorks as **GLB** (preferred) or
   **STL**. In Fusion 360: *File → Export… → glTF Binary (.glb)*.
2. Drop the file in `assets/models/`.
3. In `index.html`, copy one of the existing `<article class="project-card">`
   blocks at the bottom of the Projects section, change the `data-project`
   id, title, description, and tool chips.
4. At the bottom of `index.html`, add the matching entry to the
   `initProjectViewers([…])` array:

   ```js
   { id: 'my-new-id', url: 'assets/models/my-new-file.glb' },
   ```

### Update the resume PDF

Replace `assets/ShaliniBansal_Resume.pdf` with the latest version. The hero
download button and contact section both link to it.

## Deploying to GitHub Pages

The site uses **relative paths** throughout, so it works whether you deploy
to `shalinibansal.github.io` (root user site) or
`shalinibansal.github.io/portfolio` (project page).

### Option A — Root user site (recommended)

1. Create a new GitHub repo named exactly `YOUR_USERNAME.github.io`
   (e.g., `shalinibansal.github.io`).
2. Push everything **except** `fusion_glb_models/` (the working folder is
   already kept smaller by serving only `assets/models/`).
3. In the repo settings → Pages → set source to `main` branch, `/ (root)`.
4. Open `https://YOUR_USERNAME.github.io`.

### Option B — Project page

1. Push to any repo (e.g., `portfolio`).
2. Settings → Pages → source `main` / `(root)`.
3. Open `https://YOUR_USERNAME.github.io/portfolio/`.

### Suggested .gitignore

```
.DS_Store
fusion_glb_models/
```

The `fusion_glb_models/` folder holds the original Fusion exports (with
STEP + FBX siblings) and is only used as a source for the GLB files in
`assets/models/`. No need to ship the heavier formats.

### Sanity check before publishing

- Run `python3 -m http.server 8000` and open all six 3D viewers — confirm
  they load and the controls work.
- Visit the page on a phone-sized window to confirm the layout adapts.
- Click the **Download resume** button and confirm the PDF opens.
- Verify the LinkedIn link points to the right profile.

## Notes on the tech

- **Three.js** is pulled from the unpkg CDN via an import map in
  `index.html` (`three@0.160.1`). No bundler required.
- Each project viewer is **lazy-initialized** when scrolled into view, so
  the page stays light on first paint.
- The viewer **auto-fits** the camera to the model bounds, so new parts
  drop in cleanly without needing per-model tuning.
- Auto-rotate pauses on hover. Drag to orbit, scroll to zoom.

## Known limitations

- `.step` and `.fbx` files in `fusion_glb_models/` are not used by the
  browser — Three.js can't render them natively. Export to `.glb` from
  Fusion 360 to add new projects.
- The photo placeholder is an SVG monogram. Swap in a real photo before
  publishing.

