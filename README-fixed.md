# my-splat-viewer (fixed)

This version removes the `<base>` tag and adds an **import map** so the bare imports:
- `import * as THREE from 'three'`
- `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'`

load directly in the browser from a CDN (unpkg). No bundler required.

## How to run
Open `index.html` in a modern browser (or serve the folder with a simple HTTP server).
