(function(){
  // Lightweight pooled explosion system to avoid per-kill allocations and disposal hitches
  const POOL_SIZE = 12;
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
    // Initialize to zero
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      map: _trailTexture,
      size: 10,
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
      // alternating hot/cool colors
      const c = (i & 1) === 0 ? new THREE.Color(0xff4422) : new THREE.Color(0xffff88);
      obj.colors[off] = c.r; obj.colors[off+1] = c.g; obj.colors[off+2] = c.b;
    }
    obj.points.geometry.getAttribute('position').needsUpdate = true;
    obj.points.geometry.getAttribute('color').needsUpdate = true;
    obj.life = 0.6;
    obj.maxLife = 0.6;
    obj.points.material.size = 10;
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
    if (typeof _playSfx === 'function') _playSfx('explosion', 0.75);
  }

  function update(dt){
    for (let i = active.length - 1; i >= 0; i--){
      const ex = active[i];
      const posAttr = ex.points.geometry.getAttribute('position');
      for (let j = 0; j < PARTICLES; j++){
        const off = j*3;
        posAttr.array[off]   += ex.velocities[off] * dt;
        posAttr.array[off+1] += ex.velocities[off+1] * dt;
        posAttr.array[off+2] += ex.velocities[off+2] * dt;
      }
      posAttr.needsUpdate = true;
      ex.life -= dt;
      const t = Math.max(0, ex.life / ex.maxLife);
      ex.points.material.size = 6 + 18 * (1 - t);
      ex.points.material.opacity = 0.15 + 0.85 * t;
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
