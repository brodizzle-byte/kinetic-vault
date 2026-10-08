import * as THREE from 'three';
import { CameraController } from './camera_controller';
import { ParticleSystem } from './particles';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cameraController: CameraController;
  public particleSystem: ParticleSystem;

  private keyLight: THREE.SpotLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.PointLight;
  private container: HTMLElement;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;
  private onUpdateCallbacks: Array<(dt: number) => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c10);
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.08);

    // Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Camera controller
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    // Lighting setup
    this.keyLight = new THREE.SpotLight(0xfff1cf, 55, 20, Math.PI / 4, 0.35, 1.2);
    this.keyLight.position.set(4, 7, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 15;
    this.keyLight.shadow.bias = -0.0008;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x7599c7, 3.2);
    this.rimLight.position.set(-6, 3, -5);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.PointLight(0xffaa55, 12, 10);
    this.fillLight.position.set(0, -3, 3);
    this.scene.add(this.fillLight);

    const ambientLight = new THREE.AmbientLight(0x1b2230, 1.4);
    this.scene.add(ambientLight);

    // Pedestal floor
    this.buildPedestal();

    // Particle system
    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.group);

    // Resize handler
    window.addEventListener('resize', this.onResize.bind(this));

    // Start loop
    this.animate = this.animate.bind(this);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  private buildPedestal(): void {
    // Elegant workshop turntable floor
    const pedestalGeo = new THREE.CylinderGeometry(3.2, 3.5, 0.4, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x12151c,
      roughness: 0.6,
      metalness: 0.5
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -1.6;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);

    // Inset brass ring
    const ringGeo = new THREE.TorusGeometry(3.1, 0.04, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.4;
    this.scene.add(ring);
  }

  public registerUpdateCallback(cb: (dt: number) => void): void {
    this.onUpdateCallbacks.push(cb);
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    const dt = this.clock.getDelta();

    this.cameraController.update(dt);
    this.particleSystem.update(dt);

    for (const cb of this.onUpdateCallbacks) {
      cb(dt);
    }

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  public destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
