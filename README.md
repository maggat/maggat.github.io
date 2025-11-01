# ArmaHeaven X195 — Earth + Orbiting Ships

A minimal Three.js scene that renders:

- A realistic Earth with a diffuse texture.
- Emission driven by the Earth specular map (the spec map is used as `emissiveMap`).
- Placeholder "ships" (colored cubes) flying in randomized circular orbits with different inclinations and speeds.

## Run locally (macOS / zsh)

You can open `index.html` directly in a modern browser, but some browsers block cross-origin texture loading from file://. To avoid that, serve it with a tiny local server:

```bash
# Option A: Python 3 built-in server (recommended)
python3 -m http.server 5173
# Then open http://localhost:5173 in your browser

# Option B: Node http-server (if you have Node/npm)
npm -g install http-server
http-server -p 5173
# Then open http://localhost:5173
```

Once open:
- Drag to orbit the camera.
- Scroll to zoom.

## Notes

- Textures are loaded from the Three.js examples CDN:
  - Diffuse: https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg
  - Specular (also used as emissiveMap): https://threejs.org/examples/textures/planets/earth_specular_2048.jpg
- Material used for Earth is `THREE.MeshPhongMaterial`, so we can use `specularMap`. We also plug the same map into `emissiveMap` to meet the requirement that the specular map controls emission.
- Ships are simple boxes on circular orbits. Each orbit is defined by a random normal, radius, speed, and phase. Orientation is approximated by looking along the tangential direction.

## Tweaks

- Change the number of ships in `createShips(20)`.
- Adjust Earth size by changing the sphere radius (currently `20`).
- Tune emissive brightness via `emissiveIntensity` in the Earth material.
