import * as THREE from 'three';
import { SceneManager } from '../engine/render/scene_manager';
import { MechanicalRaycaster } from '../engine/math/raycaster';
import type { JournalEntry, PuzzleHint, VaultMetadata } from './types';
import { sound } from '../engine/audio/sound_engine';
import { haptics } from '../engine/haptics/haptics_manager';

export interface InteractivePart {
  mesh: THREE.Object3D;
  type: 'dial' | 'slider' | 'button' | 'keyhole' | 'toggle' | 'gear';
  name: string;
  focusTarget?: THREE.Vector3;
  focusDistance?: number;
  onDrag?: (deltaX: number, deltaY: number, pointerNDC: THREE.Vector2) => void;
  onClick?: () => void;
  cursor?: string;
}

export abstract class VaultBase {
  public root: THREE.Group;
  public sceneManager: SceneManager;
  public metadata: VaultMetadata;
  public journal: JournalEntry[] = [];
  public hints: PuzzleHint[] = [];

  public currentStage: number = 1;
  public isSolved: boolean = false;
  public moveCount: number = 0;
  public elapsedTime: number = 0;

  protected interactiveParts: Map<string, InteractivePart> = new Map();
  protected hitObjects: THREE.Object3D[] = [];
  protected activeDraggedPart: InteractivePart | null = null;
  protected raycaster: MechanicalRaycaster;

  private isDraggingPart: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private pointerDownTime: number = 0;
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };

  public onStageAdvance?: (stage: number) => void;
  public onVaultSolved?: () => void;

  constructor(sceneManager: SceneManager, metadata: VaultMetadata) {
    this.sceneManager = sceneManager;
    this.metadata = metadata;
    this.root = new THREE.Group();
    this.sceneManager.scene.add(this.root);

    this.raycaster = new MechanicalRaycaster(this.sceneManager.camera);
    this.setupInputHandlers();
  }

  public abstract buildModel(): void;
  public abstract update(dt: number): void;
  public abstract checkStageCompletion(): void;

  protected registerInteractivePart(part: InteractivePart): void {
    this.interactiveParts.set(part.name, part);
    this.hitObjects.push(part.mesh);
  }

  private setupInputHandlers(): void {
    const dom = this.sceneManager.renderer.domElement;

    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.pointerDownTime = performance.now();

      const hits = this.raycaster.intersectObjects(
        this.hitObjects,
        e.clientX,
        e.clientY,
        dom.clientWidth,
        dom.clientHeight
      );

      if (hits.length > 0) {
        // Find corresponding interactive part
        let matched: InteractivePart | null = null;
        let curr: THREE.Object3D | null = hits[0].object;

        while (curr && !matched) {
          for (const p of this.interactiveParts.values()) {
            if (p.mesh === curr) {
              matched = p;
              break;
            }
          }
          curr = curr.parent;
        }

        if (matched) {
          this.activeDraggedPart = matched;
          this.isDraggingPart = true;
          this.sceneManager.cameraController.isInteractionLocked = true;
        }
      }
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isDraggingPart && this.activeDraggedPart) {
        const deltaX = e.clientX - this.lastPointerX;
        const deltaY = e.clientY - this.lastPointerY;
        const ndc = this.raycaster.toNDC(e.clientX, e.clientY, dom.clientWidth, dom.clientHeight);

        if (this.activeDraggedPart.onDrag) {
          this.activeDraggedPart.onDrag(deltaX, deltaY, ndc);
          this.checkStageCompletion();
        }

        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (this.activeDraggedPart) {
        const elapsed = performance.now() - this.pointerDownTime;
        const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);

        // Tap/click detection: short duration and minimal motion
        if (elapsed < 300 && dist < 12) {
          this.incrementMoves();
          if (this.activeDraggedPart.onClick) {
            this.activeDraggedPart.onClick();
            this.checkStageCompletion();
          }

          // If part has a camera focus target, zoom camera in to inspect
          if (this.activeDraggedPart.focusTarget) {
            const worldFocus = this.activeDraggedPart.focusTarget.clone();
            this.sceneManager.cameraController.focusOn(worldFocus, this.activeDraggedPart.focusDistance || 2.2);
            sound.playTick(0.85);
            haptics.tick();
          }
        }
      }

      this.isDraggingPart = false;
      this.activeDraggedPart = null;
      this.sceneManager.cameraController.isInteractionLocked = false;
    });
  }

  public incrementMoves(): void {
    this.moveCount++;
  }

  public advanceStage(): void {
    this.currentStage++;
    sound.playUnlockChime();
    haptics.success();
    if (this.onStageAdvance) {
      this.onStageAdvance(this.currentStage);
    }
  }

  public solveVault(): void {
    if (this.isSolved) return;
    this.isSolved = true;
    sound.playUnlockChime();
    sound.playHeavyThud();
    haptics.success();
    this.sceneManager.particleSystem.emitCoreBurst(new THREE.Vector3(0, 0, 0), 80);

    if (this.onVaultSolved) {
      this.onVaultSolved();
    }
  }

  public destroy(): void {
    this.sceneManager.scene.remove(this.root);
  }
}
