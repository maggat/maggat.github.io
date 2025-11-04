(function(){
  // Lightweight pooled explosion system to avoid per-kill allocations and disposal hitches
  const POOL_SIZE = 24; // more concurrent explosions for reliability
  const PARTICLES = 24; // number of points per explosion (kept small for perf)

  let _scene = null;
  let _trailTexture = null;
  let _cleanupQueue = null;
  let _playSfx = null;

  const pool = [];
  const active = [];

  function createExplosionObject(){
    const positions = new Float32Array(PARTICLES * 3);
    const colors = new Float32Array(PARTICLES * 3);
    const velocities = new Float32Array(PARTICLES * 3);
    const initialColors = new Float32Array(PARTICLES * 3);
    // Initialize to zero
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      map: _trailTexture,
      size: 5,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      color: 0xffffff
    });
    const points = new THREE.Points(geom, mat);
    points.visible = false;
    _scene.add(points);
    return {
      points,
      positions,
      colors,
      velocities,
      initialColors,
      life: 0,
      maxLife: 0
    };
  }

  function ensurePool(){
    if (!_scene || !_trailTexture || !_cleanupQueue) return;
    if (pool.length) return;
    for (let i = 0; i < POOL_SIZE; i++) {
      pool.push(createExplosionObject());
    }
  }

  function resetExplosion(obj, pos){
    // Fill positions at origin and random velocities/colors
    for (let i = 0; i < PARTICLES; i++){
      const off = i * 3;
      obj.positions[off] = pos.x;
      obj.positions[off+1] = pos.y;
      obj.positions[off+2] = pos.z;
      // random direction on sphere
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const sx = Math.sin(phi) * Math.cos(theta);
      const sy = Math.sin(phi) * Math.sin(theta);
      const sz = Math.cos(phi);
      const speed = 40 + Math.random()*80;
      obj.velocities[off] = sx * speed;
      obj.velocities[off+1] = sy * speed;
      obj.velocities[off+2] = sz * speed;
      // varied colors: bright white-yellow core, orange-red embers, some dark smoke
      const rand = Math.random();
      let c;
      if (rand < 0.3) {
        c = new THREE.Color(0xffffff); // bright white flash
      } else if (rand < 0.6) {
        c = new THREE.Color(0xffaa22); // orange fire
      } else if (rand < 0.85) {
        c = new THREE.Color(0xff4422); // red embers
      } else {
        c = new THREE.Color(0x664422); // dark smoke/debris
      }
      obj.initialColors[off] = c.r; obj.initialColors[off+1] = c.g; obj.initialColors[off+2] = c.b;
      obj.colors[off] = c.r; obj.colors[off+1] = c.g; obj.colors[off+2] = c.b;
    }
    obj.points.geometry.getAttribute('position').needsUpdate = true;
    obj.points.geometry.getAttribute('color').needsUpdate = true;
    obj.life = 0.8;
    obj.maxLife = 0.8;
    obj.points.material.size = 5;
    obj.points.material.opacity = 1.0;
    obj.points.visible = true;
  }

  function spawn(pos){
    ensurePool();
    // Reuse from pool or recycle the oldest active
    let obj = pool.pop();
    if (!obj) {
      obj = active.shift();
      if (obj) {
        // Hide and reuse
        obj.points.visible = false;
      } else {
        obj = createExplosionObject();
      }
    }
    resetExplosion(obj, pos);
    active.push(obj);
  if (typeof _playSfx === 'function') _playSfx('explosion', 1.15);
  }

  function update(dt){
    const gravity = -20; // downward acceleration
    const drag = 0.92; // air resistance per second (exponential decay)
    const dragFactor = Math.pow(drag, dt);

    for (let i = active.length - 1; i >= 0; i--){
      const ex = active[i];
      const posAttr = ex.points.geometry.getAttribute('position');
      const colorAttr = ex.points.geometry.getAttribute('color');

      for (let j = 0; j < PARTICLES; j++){
        const off = j*3;
        // Apply gravity
        ex.velocities[off+1] += gravity * dt;
        // Apply drag
        ex.velocities[off] *= dragFactor;
        ex.velocities[off+1] *= dragFactor;
        ex.velocities[off+2] *= dragFactor;
        // Update position
        posAttr.array[off]   += ex.velocities[off] * dt;
        posAttr.array[off+1] += ex.velocities[off+1] * dt;
        posAttr.array[off+2] += ex.velocities[off+2] * dt;
      }

      posAttr.needsUpdate = true;
      ex.life -= dt;
      const t = Math.max(0, ex.life / ex.maxLife);

      // Fade colors from bright to dark over lifetime
      for (let j = 0; j < PARTICLES; j++){
        const off = j*3;
        // Fade to darker/cooler colors
        const fadeToBlack = 1 - Math.pow(t, 0.5); // faster fade
        colorAttr.array[off]   = ex.initialColors[off] * (1 - fadeToBlack * 0.7);
        colorAttr.array[off+1] = ex.initialColors[off+1] * (1 - fadeToBlack * 0.85);
        colorAttr.array[off+2] = ex.initialColors[off+2] * (1 - fadeToBlack * 0.95);
      }
      colorAttr.needsUpdate = true;

      // Particles expand and fade
      ex.points.material.size = 2 + 6 * (1 - t);
      ex.points.material.opacity = 0.1 + 0.9 * Math.pow(t, 1.5);

      if (ex.life <= 0){
        ex.points.visible = false;
        // Return to pool
        active.splice(i, 1);
        pool.push(ex);
      }
    }
  }

  function init(scene, trailTexture, cleanupQueue, playSfx){
    _scene = scene;
    _trailTexture = trailTexture;
    _cleanupQueue = cleanupQueue;
    _playSfx = playSfx;
    ensurePool();
  }

  window.ExplosionSystem = { init, spawn, update };
})();
