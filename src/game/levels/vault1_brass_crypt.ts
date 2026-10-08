import * as THREE from 'three';
import { VaultBase } from '../vault_base';
import { SceneManager } from '../../engine/render/scene_manager';
import { RotationalConstraint, LinearConstraint, SpringDamper } from '../../engine/math/kinematics';
import { MaterialFactory } from '../../engine/render/materials';
import { inventory } from '../../engine/inventory/inventory_manager';
import type { InventoryItem } from '../../engine/inventory/inventory_manager';
import { sound } from '../../engine/audio/sound_engine';
import { haptics } from '../../engine/haptics/haptics_manager';

export class Vault1BrassCrypt extends VaultBase {
  // Constraints
  private outerDialRot: RotationalConstraint;
  private innerDialRot: RotationalConstraint;
  private topSafetySlider: LinearConstraint;
  private keyTurnRot: RotationalConstraint;

  // Spring animation values
  private drawerSpring: SpringDamper;
  private panelSpring: SpringDamper;
  private coreFloatSpring: SpringDamper;

  // Meshes
  private outerDialMesh!: THREE.Mesh;
  private innerDialMesh!: THREE.Mesh;
  private safetySliderMesh!: THREE.Mesh;
  private drawerMesh!: THREE.Group;
  private keyInDrawerMesh!: THREE.Group;
  private crankKeyholeMesh!: THREE.Group;
  private insertedKeyMesh!: THREE.Group;
  private sidePanels: THREE.Group[] = [];
  private coreSphereMesh!: THREE.Mesh;

  // States
  private dialSolved: boolean = false;
  private drawerPopped: boolean = false;
  private keyCollected: boolean = false;
  private keyInserted: boolean = false;
  private vaultOpened: boolean = false;

  constructor(sceneManager: SceneManager) {
    super(sceneManager, {
      id: 'vault-1',
      number: 1,
      title: 'The Brass Crypt',
      subtitle: "The Mechanist's Strongbox",
      difficulty: 'Novice',
      description: 'An antique clockwork strongbox crafted from polished brass and aged iron. Secrets lie beneath its concentric cipher dials.',
      totalStages: 3,
      estimatedMinutes: 5
    });

    this.outerDialRot = new RotationalConstraint(0);
    this.outerDialRot.setDetentSteps(12);

    this.innerDialRot = new RotationalConstraint(0);
    this.innerDialRot.setDetentSteps(8);

    this.topSafetySlider = new LinearConstraint(0, 0.45, 0);

    this.keyTurnRot = new RotationalConstraint(0, 0, Math.PI * 2);

    this.drawerSpring = new SpringDamper(0, 180, 24);
    this.panelSpring = new SpringDamper(0, 120, 18);
    this.coreFloatSpring = new SpringDamper(0, 90, 15);

    this.setupJournalAndHints();
    this.buildModel();
  }

  private setupJournalAndHints(): void {
    this.journal = [
      {
        id: 'v1-j1',
        vaultId: 'vault-1',
        title: 'Horological Cipher',
        lore: 'The guild artisans of 1884 sealed their master key within concentric rings tuned to stellar alignment.',
        clue: 'Align Outer Ring to VII (Index 7) and Inner Ring to IV (Index 4).',
        sketchSvg: `<svg viewBox="0 0 100 100" class="journal-sketch"><circle cx="50" cy="50" r="40" fill="none" stroke="#d4af37" stroke-width="2"/><circle cx="50" cy="50" r="26" fill="none" stroke="#d4af37" stroke-dasharray="3 3"/><text x="50" y="24" fill="#ffe082" font-size="8" text-anchor="middle">VII</text><text x="50" y="38" fill="#ffe082" font-size="8" text-anchor="middle">IV</text></svg>`
      },
      {
        id: 'v1-j2',
        vaultId: 'vault-1',
        title: 'Spring-Loaded Compartment',
        lore: 'The safety bar locks the drawer runner. Slide the upper bar fully to the right to disengage the spring latch.',
        clue: 'Pull top safety bolt right; then trigger the lower spring drawer.',
        sketchSvg: `<svg viewBox="0 0 100 100" class="journal-sketch"><rect x="20" y="35" width="60" height="12" rx="3" fill="#333" stroke="#d4af37"/><rect x="25" y="55" width="50" height="20" fill="#222" stroke="#d4af37"/><line x1="70" y1="41" x2="85" y2="41" stroke="#ffaa44" stroke-width="3"/></svg>`
      }
    ];

    this.hints = [
      {
        stage: 1,
        level1: 'Observe the concentric rings on the top lid. Both can be turned.',
        level2: 'The journal mentions stellar alignment coordinates VII and IV.',
        level3: 'Rotate the outer ring until VII points upward (top), and inner ring until IV points upward.'
      },
      {
        stage: 2,
        level1: 'Examine the front panel with the horizontal bars.',
        level2: 'The upper safety bar prevents the lower release latch from moving.',
        level3: 'Drag the top brass bar all the way to the right; then tap the lower latch to release the drawer.'
      },
      {
        stage: 3,
        level1: 'Inspect the gear-key in your inventory dock.',
        level2: 'The key has a movable mechanical bit. Rotate it in the 3D Inspector.',
        level3: 'Fold the key bit 90°, insert it into the central top keyway, and crank it a full circle.'
      }
    ];
  }

  public buildModel(): void {
    const brassMat = MaterialFactory.getBrushedBrass();
    const ironMat = MaterialFactory.getDarkIron();
    const goldMat = MaterialFactory.getPolishedGold();

    // Main Box Body
    const bodyGeo = new THREE.BoxGeometry(2.4, 1.8, 2.4);
    const bodyMesh = new THREE.Mesh(bodyGeo, ironMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.root.add(bodyMesh);

    // Corner brass reinforcement brackets
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        const bracketGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.85, 16);
        const bracket = new THREE.Mesh(bracketGeo, brassMat);
        bracket.position.set(x * 1.2, 0, z * 1.2);
        this.root.add(bracket);
      }
    }

    // Top Chamber Plate
    const topPlateGeo = new THREE.CylinderGeometry(1.05, 1.1, 0.08, 32);
    const topPlate = new THREE.Mesh(topPlateGeo, brassMat);
    topPlate.position.y = 0.94;
    this.root.add(topPlate);

    // Outer Dial Ring
    const outerDialGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.06, 32);
    const outerDialMat = MaterialFactory.getDialMaterial(12, ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
    this.outerDialMesh = new THREE.Mesh(outerDialGeo, outerDialMat);
    this.outerDialMesh.position.set(0, 0.98, 0);
    this.outerDialMesh.castShadow = true;
    this.root.add(this.outerDialMesh);

    this.registerInteractivePart({
      name: 'outer_dial',
      mesh: this.outerDialMesh,
      type: 'dial',
      focusTarget: new THREE.Vector3(0, 0.98, 0),
      focusDistance: 2.1,
      onDrag: (deltaX) => {
        if (this.dialSolved) return;
        const res = this.outerDialRot.rotateBy(deltaX * 0.015);
        this.outerDialMesh.rotation.y = res.angle;
        if (res.detentHit) {
          sound.playTick(1.0);
          haptics.tick();
        }
      }
    });

    // Inner Dial Ring
    const innerDialGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24);
    const innerDialMat = MaterialFactory.getDialMaterial(8, ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);
    this.innerDialMesh = new THREE.Mesh(innerDialGeo, innerDialMat);
    this.innerDialMesh.position.set(0, 1.02, 0);
    this.innerDialMesh.castShadow = true;
    this.root.add(this.innerDialMesh);

    this.registerInteractivePart({
      name: 'inner_dial',
      mesh: this.innerDialMesh,
      type: 'dial',
      focusTarget: new THREE.Vector3(0, 1.02, 0),
      focusDistance: 2.0,
      onDrag: (deltaX) => {
        if (this.dialSolved) return;
        const res = this.innerDialRot.rotateBy(deltaX * 0.015);
        this.innerDialMesh.rotation.y = res.angle;
        if (res.detentHit) {
          sound.playTick(1.3);
          haptics.tick();
        }
      }
    });

    // Central Keyway socket on top
    this.crankKeyholeMesh = new THREE.Group();
    const keyholeRingGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16);
    const keyholeRing = new THREE.Mesh(keyholeRingGeo, goldMat);
    this.crankKeyholeMesh.add(keyholeRing);

    const slotGeo = new THREE.BoxGeometry(0.08, 0.12, 0.28);
    const slotMat = MaterialFactory.getDarkIron();
    const slot = new THREE.Mesh(slotGeo, slotMat);
    slot.position.y = 0.02;
    this.crankKeyholeMesh.add(slot);

    this.crankKeyholeMesh.position.set(0, 1.06, 0);
    this.root.add(this.crankKeyholeMesh);

    this.registerInteractivePart({
      name: 'top_keyway',
      mesh: this.crankKeyholeMesh,
      type: 'keyhole',
      focusTarget: new THREE.Vector3(0, 1.06, 0),
      focusDistance: 1.8,
      onClick: () => {
        this.tryInsertKey();
      }
    });

    // Inserted Key representation (initially hidden)
    this.insertedKeyMesh = this.createFoldableKeyMesh(true);
    this.insertedKeyMesh.position.set(0, 1.08, 0);
    this.insertedKeyMesh.visible = false;
    this.root.add(this.insertedKeyMesh);

    this.registerInteractivePart({
      name: 'inserted_key_crank',
      mesh: this.insertedKeyMesh,
      type: 'dial',
      focusTarget: new THREE.Vector3(0, 1.08, 0),
      focusDistance: 1.8,
      onDrag: (deltaX) => {
        if (!this.keyInserted || this.vaultOpened) return;
        const res = this.keyTurnRot.rotateBy(deltaX * 0.02);
        this.insertedKeyMesh.rotation.y = res.angle;
        if (res.detentHit) {
          sound.playRatchet();
          haptics.tick();
        }
      }
    });

    // Front Panel: Safety Slider & Secret Drawer
    this.buildFrontDrawerAssembly(brassMat, ironMat);

    // 4 Splitting Side Panels (for grand finale opening)
    this.buildFoldingPanels(brassMat);

    // Internal Chrono Core Relic
    const coreGeo = new THREE.IcosahedronGeometry(0.38, 2);
    const coreMat = MaterialFactory.getGlowingCrystal(0x00f0ff);
    this.coreSphereMesh = new THREE.Mesh(coreGeo, coreMat);
    this.coreSphereMesh.position.set(0, -0.4, 0);
    this.coreSphereMesh.visible = false;
    this.root.add(this.coreSphereMesh);
  }

  private buildFrontDrawerAssembly(brassMat: THREE.Material, ironMat: THREE.Material): void {
    // Upper Safety Slide Bar
    const trackGeo = new THREE.BoxGeometry(1.2, 0.12, 0.06);
    const trackMesh = new THREE.Mesh(trackGeo, ironMat);
    trackMesh.position.set(0, 0.45, 1.22);
    this.root.add(trackMesh);

    const sliderGeo = new THREE.BoxGeometry(0.35, 0.18, 0.1);
    this.safetySliderMesh = new THREE.Mesh(sliderGeo, brassMat);
    this.safetySliderMesh.position.set(-0.35, 0.45, 1.25);
    this.root.add(this.safetySliderMesh);

    this.registerInteractivePart({
      name: 'safety_slider',
      mesh: this.safetySliderMesh,
      type: 'slider',
      focusTarget: new THREE.Vector3(0, 0.45, 1.25),
      focusDistance: 1.9,
      onDrag: (deltaX) => {
        if (!this.dialSolved) {
          sound.playTick(0.5);
          haptics.warning();
          return;
        }
        const delta = deltaX * 0.003;
        const res = this.topSafetySlider.moveBy(delta);
        this.safetySliderMesh.position.x = -0.35 + res.value;
        if (res.detentHit) {
          sound.playLatch();
          haptics.latch();
        }
      }
    });

    // Lower Drawer Assembly
    this.drawerMesh = new THREE.Group();
    const drawerFrontGeo = new THREE.BoxGeometry(0.9, 0.5, 0.08);
    const drawerFront = new THREE.Mesh(drawerFrontGeo, brassMat);
    drawerFront.castShadow = true;
    this.drawerMesh.add(drawerFront);

    const drawerBodyGeo = new THREE.BoxGeometry(0.82, 0.44, 0.7);
    const drawerBody = new THREE.Mesh(drawerBodyGeo, ironMat);
    drawerBody.position.z = -0.38;
    this.drawerMesh.add(drawerBody);

    // Key resting inside drawer
    this.keyInDrawerMesh = this.createFoldableKeyMesh(false);
    this.keyInDrawerMesh.position.set(0, 0.08, -0.35);
    this.keyInDrawerMesh.rotation.x = -Math.PI / 2;
    this.drawerMesh.add(this.keyInDrawerMesh);

    this.drawerMesh.position.set(0, -0.15, 1.21);
    this.root.add(this.drawerMesh);

    this.registerInteractivePart({
      name: 'drawer_latch',
      mesh: drawerFront,
      type: 'button',
      focusTarget: new THREE.Vector3(0, -0.15, 1.25),
      focusDistance: 1.9,
      onClick: () => {
        if (this.drawerPopped) return;
        if (this.topSafetySlider.getNormalized() < 0.85) {
          // Jammed by safety bar
          sound.playTick(0.5);
          haptics.warning();
          return;
        }
        // Release drawer!
        this.drawerPopped = true;
        this.drawerSpring.snapTo(0.75);
        sound.playLatch();
        sound.playSteamHiss();
        haptics.heavyImpact();
        this.sceneManager.particleSystem.emitSteam(new THREE.Vector3(0, -0.15, 1.3), new THREE.Vector3(0, 0.2, 1));
      }
    });

    this.registerInteractivePart({
      name: 'key_pickup',
      mesh: this.keyInDrawerMesh,
      type: 'button',
      onClick: () => {
        if (!this.drawerPopped || this.keyCollected) return;
        this.collectKey();
      }
    });
  }

  private buildFoldingPanels(brassMat: THREE.Material): void {
    const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    for (let i = 0; i < 4; i++) {
      const panelGroup = new THREE.Group();
      panelGroup.rotation.y = angles[i];

      const panelMeshGeo = new THREE.BoxGeometry(2.1, 1.4, 0.06);
      const panelMesh = new THREE.Mesh(panelMeshGeo, brassMat);
      panelMesh.position.set(0, 0, 1.22);
      panelGroup.add(panelMesh);

      // Panel hinges
      panelGroup.position.set(0, -0.85, 0);
      this.root.add(panelGroup);
      this.sidePanels.push(panelGroup);
    }
  }

  private createFoldableKeyMesh(isUnfolded: boolean): THREE.Group {
    const keyGroup = new THREE.Group();
    const goldMat = MaterialFactory.getPolishedGold();
    const brassMat = MaterialFactory.getBrushedBrass();

    // Key bow / handle (ornate ring)
    const bowGeo = new THREE.TorusGeometry(0.14, 0.03, 16, 32);
    const bow = new THREE.Mesh(bowGeo, goldMat);
    keyGroup.add(bow);

    // Key shaft
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 16);
    const shaft = new THREE.Mesh(shaftGeo, brassMat);
    shaft.position.y = -0.25;
    keyGroup.add(shaft);

    // Hinged bit
    const bitGroup = new THREE.Group();
    bitGroup.name = 'key_bit_hinge';
    const bitGeo = new THREE.BoxGeometry(0.12, 0.15, 0.04);
    const bit = new THREE.Mesh(bitGeo, goldMat);
    bit.name = 'key_bit';
    bit.position.set(0.06, 0, 0);
    bitGroup.add(bit);

    bitGroup.position.set(0, -0.4, 0);
    if (!isUnfolded) {
      bitGroup.rotation.z = Math.PI / 2; // Folded closed
    }
    keyGroup.add(bitGroup);

    return keyGroup;
  }

  private collectKey(): void {
    this.keyCollected = true;
    this.keyInDrawerMesh.visible = false;

    const item: InventoryItem = {
      id: 'brass_gear_key',
      name: 'Foldable Gear-Key',
      description: 'An intricate brass key with an articulated mechanical bit. Currently folded.',
      iconSvg: `<svg viewBox="0 0 100 100" class="inv-svg"><circle cx="35" cy="50" r="18" fill="none" stroke="#d4af37" stroke-width="5"/><rect x="45" y="46" width="38" height="8" fill="#d4af37"/><rect x="70" y="54" width="8" height="12" fill="#d4af37"/></svg>`,
      isManipulable: true,
      state: { unfolded: false },
      meshGenerator: () => {
        const group = this.createFoldableKeyMesh(false);
        group.scale.set(4, 4, 4);
        return group;
      },
      onInspectManipulate: (invItem) => {
        const unfolded = !invItem.state?.unfolded;
        invItem.state = { unfolded };
        invItem.description = unfolded
          ? 'The mechanical bit is now locked in its operational 90° position.'
          : 'An intricate brass key with an articulated mechanical bit. Currently folded.';
        return true;
      }
    };

    inventory.addItem(item);
    sound.playUnlockChime();
    haptics.latch();
    this.advanceStage();
  }

  private tryInsertKey(): void {
    const keyItem = inventory.getItem('brass_gear_key');
    if (!keyItem) {
      sound.playTick(0.5);
      haptics.warning();
      return;
    }

    if (!keyItem.state?.unfolded) {
      // Key bit is still folded; won't fit into keyway
      sound.playTick(0.6);
      haptics.warning();
      return;
    }

    // Insert key!
    this.keyInserted = true;
    inventory.removeItem('brass_gear_key');
    this.insertedKeyMesh.visible = true;
    sound.playLatch();
    haptics.heavyImpact();
    this.sceneManager.particleSystem.emitSparks(new THREE.Vector3(0, 1.1, 0), 20);
  }

  public checkStageCompletion(): void {
    // Stage 1: Align Dials (Outer to VII = index 7, Inner to IV = index 4)
    if (!this.dialSolved) {
      const outerIdx = this.outerDialRot.getDetentIndex();
      const innerIdx = this.innerDialRot.getDetentIndex();

      if (outerIdx === 7 && innerIdx === 4) {
        this.dialSolved = true;
        this.outerDialRot.locked = true;
        this.innerDialRot.locked = true;
        this.advanceStage();
      }
    }

    // Stage 3: Turn inserted key 360 degrees
    if (this.keyInserted && !this.vaultOpened) {
      if (this.keyTurnRot.angle >= Math.PI * 1.85) {
        this.vaultOpened = true;
        this.panelSpring.snapTo(Math.PI / 2.3);
        this.coreFloatSpring.snapTo(0.6);
        this.coreSphereMesh.visible = true;
        this.solveVault();
      }
    }
  }

  public update(dt: number): void {
    this.elapsedTime += dt;

    // Update spring animations
    const drawerZ = this.drawerSpring.update(dt);
    if (this.drawerPopped) {
      this.drawerMesh.position.z = 1.21 + drawerZ;
    }

    const panelRot = this.panelSpring.update(dt);
    if (this.vaultOpened) {
      for (const p of this.sidePanels) {
        p.rotation.x = panelRot;
      }
      const coreY = this.coreFloatSpring.update(dt);
      this.coreSphereMesh.position.y = coreY + Math.sin(this.elapsedTime * 2) * 0.05;
      this.coreSphereMesh.rotation.y += dt * 0.8;
      this.coreSphereMesh.rotation.x += dt * 0.4;
    }
  }
}
