import * as THREE from 'three';
import type { InventoryItem } from './inventory_manager';
import { sound } from '../audio/sound_engine';
import { haptics } from '../haptics/haptics_manager';

export class Inspector3D {
  private overlay: HTMLElement;
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private currentItemMesh: THREE.Object3D | null = null;
  private currentItem: InventoryItem | null = null;
  private animId: number | null = null;

  // Orbit rotation
  private rotX: number = 0;
  private rotY: number = 0;
  private targetRotX: number = 0;
  private targetRotY: number = 0;
  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.overlay = document.createElement('div');
    this.overlay.className = 'inspector-overlay';
    this.overlay.style.display = 'none';

    this.overlay.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-title" id="inspectorItemName">ITEM INSPECTION</div>
        <button class="inspector-close-btn" id="inspectorCloseBtn" aria-label="Close">✕</button>
      </div>
      <div class="inspector-viewport-container" id="inspectorViewport"></div>
      <div class="inspector-footer">
        <p class="inspector-desc" id="inspectorItemDesc"></p>
        <span class="inspector-hint">Drag to rotate 360° • Tap mechanism to interact</span>
      </div>
    `;

    document.body.appendChild(this.overlay);

    const viewport = this.overlay.querySelector('#inspectorViewport') as HTMLElement;
    this.canvas = document.createElement('canvas');
    viewport.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    this.camera.position.set(0, 0, 4);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Studio Lighting for Item Inspection
    const keyLight = new THREE.DirectionalLight(0xffecd0, 3.5);
    keyLight.position.set(3, 4, 3);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x70aaff, 2.5);
    rimLight.position.set(-3, -2, -3);
    this.scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x404555, 1.5);
    this.scene.add(ambientLight);

    this.setupEvents();
  }

  private setupEvents(): void {
    const closeBtn = this.overlay.querySelector('#inspectorCloseBtn');
    closeBtn?.addEventListener('click', () => this.close());

    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      // Check click on interactive part of item
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);

      if (this.currentItemMesh && this.currentItem && this.currentItem.onInspectManipulate) {
        const hits = this.raycaster.intersectObjects(this.currentItemMesh.children, true);
        if (hits.length > 0) {
          const clickedPart = hits[0].object.name;
          const changed = this.currentItem.onInspectManipulate(this.currentItem, clickedPart);
          if (changed) {
            sound.playLatch();
            haptics.latch();
          }
        }
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = (e.clientX - this.lastPointerX) * 0.01;
      const dy = (e.clientY - this.lastPointerY) * 0.01;

      this.targetRotY += dx;
      this.targetRotX = Math.min(Math.max(this.targetRotX + dy, -Math.PI / 2.2), Math.PI / 2.2);

      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });
  }

  public open(item: InventoryItem): void {
    this.currentItem = item;
    const nameEl = this.overlay.querySelector('#inspectorItemName') as HTMLElement;
    const descEl = this.overlay.querySelector('#inspectorItemDesc') as HTMLElement;

    if (nameEl) nameEl.textContent = item.name.toUpperCase();
    if (descEl) descEl.textContent = item.description;

    // Clear previous mesh
    if (this.currentItemMesh) {
      this.scene.remove(this.currentItemMesh);
      this.currentItemMesh = null;
    }

    // Build fresh item mesh
    this.currentItemMesh = item.meshGenerator();
    this.scene.add(this.currentItemMesh);

    this.targetRotX = 0;
    this.targetRotY = 0;
    this.rotX = 0;
    this.rotY = 0;

    this.overlay.style.display = 'flex';
    this.resize();

    sound.playTick(1.2);
    haptics.tick();

    this.animate = this.animate.bind(this);
    this.animId = requestAnimationFrame(this.animate);
  }

  public close(): void {
    this.overlay.style.display = 'none';
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private resize(): void {
    const vp = this.overlay.querySelector('#inspectorViewport') as HTMLElement;
    if (!vp) return;
    const w = vp.clientWidth || 300;
    const h = vp.clientHeight || 300;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate(): void {
    this.rotX += (this.targetRotX - this.rotX) * 0.15;
    this.rotY += (this.targetRotY - this.rotY) * 0.15;

    if (this.currentItemMesh) {
      this.currentItemMesh.rotation.x = this.rotX;
      this.currentItemMesh.rotation.y = this.rotY;
    }

    this.renderer.render(this.scene, this.camera);
    this.animId = requestAnimationFrame(this.animate);
  }
}
