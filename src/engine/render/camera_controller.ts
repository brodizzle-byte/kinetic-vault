import * as THREE from 'three';

export interface CameraFocusTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  distance: number;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  // Spherical orbit parameters
  public azimuth: number = 0.5;
  public polar: number = 1.1; // rad from zenith
  public distance: number = 5.5;

  private targetAzimuth: number = 0.5;
  private targetPolar: number = 1.1;
  private targetDistance: number = 5.5;

  public center: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Focus state
  private isFocusMode: boolean = false;
  private defaultFocus: CameraFocusTarget;

  // Limits
  public minDistance: number = 2.0;
  public maxDistance: number = 9.0;
  public minPolar: number = 0.2;
  public maxPolar: number = Math.PI - 0.2;

  // Touch & Drag state
  private isDragging: boolean = false;
  private previousPointerX: number = 0;
  private previousPointerY: number = 0;
  private initialPinchDist: number = 0;
  private activePointers: Map<number, { x: number; y: number }> = new Map();

  // Settings
  public sensitivity: number = 1.0;
  public invertPitch: boolean = false;
  public isInteractionLocked: boolean = false; // Lock orbit when interacting with 3D mechanism

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.defaultFocus = {
      position: new THREE.Vector3(0, 0, 0),
      lookAt: new THREE.Vector3(0, 0, 0),
      distance: 5.5
    };

    this.setupListeners();
    this.updateCameraInstant();
  }

  private setupListeners(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.isInteractionLocked) return;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size === 1) {
      this.isDragging = true;
      this.previousPointerX = e.clientX;
      this.previousPointerY = e.clientY;
    } else if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      this.initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.activePointers.has(e.pointerId)) return;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.isInteractionLocked) return;

    if (this.activePointers.size === 1 && this.isDragging) {
      const deltaX = (e.clientX - this.previousPointerX) * 0.005 * this.sensitivity;
      const deltaY = (e.clientY - this.previousPointerY) * 0.005 * this.sensitivity * (this.invertPitch ? -1 : 1);

      this.targetAzimuth -= deltaX;
      this.targetPolar = Math.min(Math.max(this.targetPolar - deltaY, this.minPolar), this.maxPolar);

      this.previousPointerX = e.clientX;
      this.previousPointerY = e.clientY;
    } else if (this.activePointers.size === 2) {
      // Pinch to zoom
      const pts = Array.from(this.activePointers.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const pinchDelta = (this.initialPinchDist - currentDist) * 0.01;
      this.targetDistance = Math.min(Math.max(this.targetDistance + pinchDelta, this.minDistance), this.maxDistance);
      this.initialPinchDist = currentDist;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size === 0) {
      this.isDragging = false;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (this.isInteractionLocked) return;
    const zoomDelta = e.deltaY * 0.002;
    this.targetDistance = Math.min(Math.max(this.targetDistance + zoomDelta, this.minDistance), this.maxDistance);
  }

  public zoomBy(delta: number): void {
    this.targetDistance = Math.min(Math.max(this.targetDistance + delta, this.minDistance), this.maxDistance);
  }

  /**
   * Smoothly frame and focus on a specific sub-assembly
   */
  public focusOn(targetLookAt: THREE.Vector3, focusDistance: number = 2.4): void {
    this.isFocusMode = true;
    this.targetCenter.copy(targetLookAt);
    this.targetDistance = Math.max(this.minDistance, focusDistance);

    // Compute pleasant framing angles
    const dir = this.camera.position.clone().sub(targetLookAt).normalize();
    this.targetPolar = Math.acos(Math.min(Math.max(dir.y, -1), 1));
    this.targetAzimuth = Math.atan2(dir.x, dir.z);
  }

  /**
   * Smoothly zoom back out to full vault overview
   */
  public resetToOverview(): void {
    this.isFocusMode = false;
    this.targetCenter.set(0, 0, 0);
    this.targetDistance = this.defaultFocus.distance;
  }

  public getIsFocusMode(): boolean {
    return this.isFocusMode;
  }

  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.05);
    const lerpFactor = 1.0 - Math.exp(-12 * clampedDt);

    this.azimuth += (this.targetAzimuth - this.azimuth) * lerpFactor;
    this.polar += (this.targetPolar - this.polar) * lerpFactor;
    this.distance += (this.targetDistance - this.distance) * lerpFactor;
    this.center.lerp(this.targetCenter, lerpFactor);

    this.updateCameraInstant();
  }

  private updateCameraInstant(): void {
    // Spherical to Cartesian coordinates
    const sinPolar = Math.sin(this.polar);
    const x = this.center.x + this.distance * sinPolar * Math.sin(this.azimuth);
    const y = this.center.y + this.distance * Math.cos(this.polar);
    const z = this.center.z + this.distance * sinPolar * Math.cos(this.azimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.center);
  }
}
