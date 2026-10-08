import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class ParticleSystem {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles: number = 400;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  constructor() {
    this.group = new THREE.Group();

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Create soft circular particle texture procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,230,180,0.8)');
    grad.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.12,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);

    // Seed ambient dust motes
    this.seedAmbientMotes();
  }

  private seedAmbientMotes(): void {
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          (Math.random() * 0.05) + 0.01,
          (Math.random() - 0.5) * 0.05
        ),
        life: 999999, // Infinite ambient motes
        maxLife: 999999,
        size: 0.03 + Math.random() * 0.04,
        color: new THREE.Color(0xffe29a)
      });
    }
  }

  /**
   * Spawns an explosion of sparks from metal friction or gear contact
   */
  public emitSparks(origin: THREE.Vector3, count: number = 24): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const speed = 1.2 + Math.random() * 2.5;

      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 1.2,
        Math.sin(angle) * Math.cos(elevation) * speed
      );

      this.particles.push({
        pos: origin.clone(),
        vel: vel,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        size: 0.08 + Math.random() * 0.08,
        color: new THREE.Color(0xffbb33)
      });
    }
  }

  /**
   * Spawns expanding steam vapor puff
   */
  public emitSteam(origin: THREE.Vector3, dir: THREE.Vector3 = new THREE.Vector3(0, 1, 0), count: number = 20): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const spread = 0.4;
      const vel = dir.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      )).multiplyScalar(1.5 + Math.random() * 1.5);

      this.particles.push({
        pos: origin.clone(),
        vel: vel,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1.1,
        size: 0.15 + Math.random() * 0.15,
        color: new THREE.Color(0xddffff)
      });
    }
  }

  /**
   * Spawns radiant energy burst when vault core solves
   */
  public emitCoreBurst(origin: THREE.Vector3, count: number = 60): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize().multiplyScalar(2.0 + Math.random() * 3.0);

      this.particles.push({
        pos: origin.clone(),
        vel: dir,
        life: 1.2 + Math.random() * 0.8,
        maxLife: 2.0,
        size: 0.18 + Math.random() * 0.12,
        color: new THREE.Color(Math.random() > 0.5 ? 0x00f0ff : 0xffd700)
      });
    }
  }

  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.05);

    let activeCount = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.life < 900000) {
        p.life -= clampedDt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        // Gravity on sparks, drag on steam
        p.vel.y -= 3.8 * clampedDt;
        p.vel.multiplyScalar(0.96);
      } else {
        // Wrap ambient dust motes within box
        if (p.pos.y > 4) p.pos.y = -4;
        if (p.pos.x > 4) p.pos.x = -4;
        if (p.pos.x < -4) p.pos.x = 4;
        if (p.pos.z > 4) p.pos.z = -4;
        if (p.pos.z < -4) p.pos.z = 4;
      }

      p.pos.addScaledVector(p.vel, clampedDt);

      // Write to buffer
      const idx = activeCount;
      this.positions[idx * 3] = p.pos.x;
      this.positions[idx * 3 + 1] = p.pos.y;
      this.positions[idx * 3 + 2] = p.pos.z;

      const alpha = p.life < 900000 ? Math.min(1.0, p.life / p.maxLife) : 0.4;
      this.colors[idx * 3] = p.color.r * alpha;
      this.colors[idx * 3 + 1] = p.color.g * alpha;
      this.colors[idx * 3 + 2] = p.color.b * alpha;

      this.sizes[idx] = p.size;
      activeCount++;
      if (activeCount >= this.maxParticles) break;
    }

    this.geometry.setDrawRange(0, activeCount);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}
