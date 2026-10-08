import * as THREE from 'three';
import { VaultBase } from '../vault_base';
import { SceneManager } from '../../engine/render/scene_manager';
import { RotationalConstraint, LinearConstraint, SpringDamper } from '../../engine/math/kinematics';
import { GearTrainKernel } from '../../engine/math/gear_train';
import { MaterialFactory } from '../../engine/render/materials';
import { sound } from '../../engine/audio/sound_engine';
import { haptics } from '../../engine/haptics/haptics_manager';

export class Vault2ObsidianMonolith extends VaultBase {
  // Puzzles
  // 1. Cryptex 4-ring tumblers
  private cryptexRings: RotationalConstraint[] = [];
  private cryptexMeshes: THREE.Mesh[] = [];
  private cryptexSolved: boolean = false;

  // 2. Movable gear train
  private gearKernel: GearTrainKernel;
  private idlerSlider: LinearConstraint;
  private idlerMesh!: THREE.Group;
  private driverMesh!: THREE.Group;
  private drivenMesh!: THREE.Group;
  private gearTrainEngaged: boolean = false;
  private gearRotProgress: number = 0;
  private gearTrainSolved: boolean = false;

  // 3. Magnetic maze pin
  private mazePinPos: THREE.Vector2 = new THREE.Vector2(-0.4, -0.4);
  private mazePinMesh!: THREE.Mesh;
  private mazeSolved: boolean = false;

  // Vault finale opening
  private pyramidSpring: SpringDamper;
  private relicSpring: SpringDamper;
  private pyramidPetals: THREE.Group[] = [];
  private relicMesh!: THREE.Mesh;
  private finaleTriggered: boolean = false;

  constructor(sceneManager: SceneManager) {
    super(sceneManager, {
      id: 'vault-2',
      number: 2,
      title: 'The Obsidian Reliquary',
      subtitle: 'The Enigma Monolith',
      difficulty: 'Master',
      description: 'A dark monolithic vault carved from volcanic obsidian and inlaid with gold circuits. Features mechanical cryptex cylinders and interactive gear linkages.',
      totalStages: 3,
      estimatedMinutes: 8
    });

    this.gearKernel = new GearTrainKernel();
    this.idlerSlider = new LinearConstraint(0, 0.45, 0);
    this.pyramidSpring = new SpringDamper(0, 140, 20);
    this.relicSpring = new SpringDamper(0, 100, 16);

    this.setupCryptex();
    this.setupJournalAndHints();
    this.buildModel();
  }

  private setupCryptex(): void {
    // 4 cylinders with 6 symbols each: A, E, T, H, O, S (target: A-E-T-H)
    for (let i = 0; i < 4; i++) {
      const rot = new RotationalConstraint(0);
      rot.setDetentSteps(6);
      this.cryptexRings.push(rot);
    }
  }

  private setupJournalAndHints(): void {
    this.journal = [
      {
        id: 'v2-j1',
        vaultId: 'vault-2',
        title: 'The Word of Sol',
        lore: 'The obsidian cylinder tumblers guard the hydraulic conduit. An ancient inscription reads: A - E - T - H.',
        clue: 'Align the 4 cryptex rings on Face I to spell A-E-T-H.',
        sketchSvg: `<svg viewBox="0 0 100 100" class="journal-sketch"><rect x="15" y="30" width="70" height="40" rx="4" fill="#151820" stroke="#d4af37"/><line x1="32" y1="30" x2="32" y2="70" stroke="#d4af37"/><line x1="50" y1="30" x2="50" y2="70" stroke="#d4af37"/><line x1="68" y1="30" x2="68" y2="70" stroke="#d4af37"/><text x="24" y="54" fill="#ffe082" font-size="12" text-anchor="middle">A</text><text x="41" y="54" fill="#ffe082" font-size="12" text-anchor="middle">E</text><text x="59" y="54" fill="#ffe082" font-size="12" text-anchor="middle">T</text><text x="77" y="54" fill="#ffe082" font-size="12" text-anchor="middle">H</text></svg>`
      },
      {
        id: 'v2-j2',
        vaultId: 'vault-2',
        title: 'Kinematic Linkage',
        lore: 'The transmission was severed by sliding the intermediate cog out of alignment. Bridge the gap to transmit power.',
        clue: 'Slide the bronze idler gear until it meshes with both the drive wheel and deadbolt gear.',
        sketchSvg: `<svg viewBox="0 0 100 100" class="journal-sketch"><circle cx="28" cy="50" r="16" fill="none" stroke="#d4af37" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="none" stroke="#ffe082" stroke-width="2"/><circle cx="72" cy="50" r="16" fill="none" stroke="#d4af37" stroke-width="2"/><line x1="38" y1="75" x2="62" y2="75" stroke="#00f0ff" stroke-width="3"/></svg>`
      }
    ];

    this.hints = [
      {
        stage: 1,
        level1: 'Examine Face I with the 4 horizontal cylinder tumblers.',
        level2: 'Each ring has 6 letters. The cipher word is noted in your journal.',
        level3: 'Rotate the four cylinders from left to right until they show A - E - T - H.'
      },
      {
        stage: 2,
        level1: 'Examine Face II with the gear train.',
        level2: 'The middle gear is mounted on a sliding bracket.',
        level3: 'Slide the center gear to the right until its teeth engage both outer gears, then crank the left drive wheel.'
      },
      {
        stage: 3,
        level1: 'Examine Face III with the magnetic groove maze.',
        level2: 'Guide the glowing cyan stylus along the carved channel from bottom-left to top-right.',
        level3: 'Drag the stylus through the maze paths to the golden receptor socket at the finish.'
      }
    ];
  }

  public buildModel(): void {
    const obsidianMat = MaterialFactory.getObsidian();
    const goldMat = MaterialFactory.getPolishedGold();
    const brassMat = MaterialFactory.getBrushedBrass();
    const ironMat = MaterialFactory.getDarkIron();

    // Main Monolith Base Body
    const bodyGeo = new THREE.BoxGeometry(2.6, 2.4, 2.6);
    const bodyMesh = new THREE.Mesh(bodyGeo, obsidianMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.root.add(bodyMesh);

    // Gold filigree edge trims
    this.buildGoldEdgeTrims(goldMat);

    // Face 1: Cryptex Cylinder Assembly (Front: +Z)
    this.buildCryptexFace(brassMat, goldMat);

    // Face 2: Gear Train Assembly (Right: +X)
    this.buildGearTrainFace(brassMat, ironMat, goldMat);

    // Face 3: Magnetic Maze (Left: -X)
    this.buildMazeFace(brassMat, goldMat);

    // Top: 4-Petal Opening Obsidian Pyramid
    this.buildPyramidLid(obsidianMat, goldMat);

    // Central Relic inside
    const relicGeo = new THREE.OctahedronGeometry(0.35, 0);
    const relicMat = MaterialFactory.getGlowingCrystal(0xffaa00);
    this.relicMesh = new THREE.Mesh(relicGeo, relicMat);
    this.relicMesh.position.set(0, 0.4, 0);
    this.relicMesh.visible = false;
    this.root.add(this.relicMesh);
  }

  private buildGoldEdgeTrims(goldMat: THREE.Material): void {
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        const pGeo = new THREE.BoxGeometry(0.1, 2.44, 0.1);
        const pMesh = new THREE.Mesh(pGeo, goldMat);
        pMesh.position.set(x * 1.3, 0, z * 1.3);
        this.root.add(pMesh);
      }
    }
  }

  private buildCryptexFace(brassMat: THREE.Material, goldMat: THREE.Material): void {
    const faceZ = 1.32;
    const letters = ['A', 'E', 'T', 'H', 'O', 'S'];

    // Frame housing
    const frameGeo = new THREE.BoxGeometry(1.8, 0.5, 0.08);
    const frame = new THREE.Mesh(frameGeo, brassMat);
    frame.position.set(0, 0.2, faceZ);
    this.root.add(frame);

    // 4 Cryptex Cylinders
    const startX = -0.6;
    const spacing = 0.4;

    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 24);
      const ringMat = MaterialFactory.getDialMaterial(6, letters);
      const ring = new THREE.Mesh(ringGeo, ringMat);

      ring.rotation.z = Math.PI / 2; // Lie along horizontal axis
      ring.position.set(startX + i * spacing, 0.2, faceZ + 0.05);
      ring.castShadow = true;
      this.root.add(ring);
      this.cryptexMeshes.push(ring);

      const ringIdx = i;
      this.registerInteractivePart({
        name: `cryptex_${ringIdx}`,
        mesh: ring,
        type: 'dial',
        focusTarget: new THREE.Vector3(0, 0.2, faceZ + 0.1),
        focusDistance: 2.0,
        onDrag: (_deltaX, deltaY) => {
          if (this.cryptexSolved) return;
          const res = this.cryptexRings[ringIdx].rotateBy(deltaY * 0.015);
          ring.rotation.x = res.angle;
          if (res.detentHit) {
            sound.playTick(1.0 + ringIdx * 0.1);
            haptics.tick();
          }
        }
      });
    }

    // Indicator alignment notch above
    const notchGeo = new THREE.ConeGeometry(0.04, 0.08, 4);
    const notch = new THREE.Mesh(notchGeo, goldMat);
    notch.rotation.x = Math.PI;
    notch.position.set(0, 0.5, faceZ + 0.08);
    this.root.add(notch);
  }

  private buildGearTrainFace(brassMat: THREE.Material, ironMat: THREE.Material, goldMat: THREE.Material): void {
    const faceX = 1.32;
    const gearFaceGroup = new THREE.Group();
    gearFaceGroup.position.set(faceX, 0, 0);
    gearFaceGroup.rotation.y = Math.PI / 2;
    this.root.add(gearFaceGroup);

    // Gear 1: Left Driver Gear with Crank Handle
    this.driverMesh = this.createSpurGear(0.35, 16, goldMat);
    this.driverMesh.position.set(-0.6, 0, 0.06);
    gearFaceGroup.add(this.driverMesh);

    // Crank peg
    const crankPegGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
    const crankPeg = new THREE.Mesh(crankPegGeo, brassMat);
    crankPeg.rotation.x = Math.PI / 2;
    crankPeg.position.set(0.22, 0, 0.08);
    this.driverMesh.add(crankPeg);

    // Gear 3: Right Driven Gear (Deadbolt lock)
    this.drivenMesh = this.createSpurGear(0.35, 16, ironMat);
    this.drivenMesh.position.set(0.6, 0, 0.06);
    gearFaceGroup.add(this.drivenMesh);

    // Gear 2: Middle Sliding Idler Gear
    this.idlerMesh = this.createSpurGear(0.28, 12, brassMat);
    this.idlerMesh.position.set(-0.25, 0, 0.06);
    gearFaceGroup.add(this.idlerMesh);

    // Register gears in kinematics kernel
    this.gearKernel.addGear({ id: 'driver', teeth: 16, pitchRadius: 0.35, x: -0.6, y: 0, z: 0, angle: 0, isDriver: true });
    this.gearKernel.addGear({ id: 'idler', teeth: 12, pitchRadius: 0.28, x: -0.25, y: 0, z: 0, angle: 0 });
    this.gearKernel.addGear({ id: 'driven', teeth: 16, pitchRadius: 0.35, x: 0.6, y: 0, z: 0, angle: 0 });

    // Slider track for idler
    const trackGeo = new THREE.BoxGeometry(0.6, 0.08, 0.04);
    const track = new THREE.Mesh(trackGeo, ironMat);
    track.position.set(0, -0.38, 0.04);
    gearFaceGroup.add(track);

    this.registerInteractivePart({
      name: 'idler_slider',
      mesh: this.idlerMesh,
      type: 'slider',
      focusTarget: new THREE.Vector3(faceX, 0, 0),
      focusDistance: 2.1,
      onDrag: (deltaX) => {
        if (!this.cryptexSolved) {
          sound.playTick(0.5);
          haptics.warning();
          return;
        }
        const res = this.idlerSlider.moveBy(deltaX * 0.003);
        const newX = -0.25 + res.value;
        this.idlerMesh.position.x = newX;
        this.gearKernel.setGearPosition('idler', newX, 0, 0);
        this.gearKernel.updateMeshing(0.08);

        const engaged = this.gearKernel.isMeshEngaged('driver', 'idler') && this.gearKernel.isMeshEngaged('idler', 'driven');
        if (engaged !== this.gearTrainEngaged) {
          this.gearTrainEngaged = engaged;
          sound.playLatch();
          haptics.latch();
        }
      }
    });

    this.registerInteractivePart({
      name: 'driver_crank',
      mesh: this.driverMesh,
      type: 'dial',
      focusTarget: new THREE.Vector3(faceX, 0, 0),
      focusDistance: 2.1,
      onDrag: (deltaX) => {
        if (!this.gearTrainEngaged || this.gearTrainSolved) return;
        const deltaAngle = deltaX * 0.02;
        const angles = this.gearKernel.driveGear('driver', deltaAngle);

        if (angles.has('driver')) this.driverMesh.rotation.z = angles.get('driver')!;
        if (angles.has('idler')) this.idlerMesh.rotation.z = angles.get('idler')!;
        if (angles.has('driven')) this.drivenMesh.rotation.z = angles.get('driven')!;

        this.gearRotProgress += Math.abs(deltaAngle);
        sound.playRatchet();
        haptics.tick();

        if (this.gearRotProgress > Math.PI * 2.5) {
          this.gearTrainSolved = true;
          this.advanceStage();
        }
      }
    });
  }

  private createSpurGear(radius: number, teeth: number, material: THREE.Material): THREE.Group {
    const gear = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, 0.04, 32);
    const disk = new THREE.Mesh(diskGeo, material);
    disk.rotation.x = Math.PI / 2;
    gear.add(disk);

    // Teeth around edge
    const toothGeo = new THREE.BoxGeometry(radius * 0.22, 0.04, radius * 0.28);
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const angle = i * step;
      const tooth = new THREE.Mesh(toothGeo, material);
      tooth.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      tooth.rotation.z = angle;
      gear.add(tooth);
    }

    return gear;
  }

  private buildMazeFace(brassMat: THREE.Material, goldMat: THREE.Material): void {
    const faceX = -1.32;
    const mazeGroup = new THREE.Group();
    mazeGroup.position.set(faceX, 0, 0);
    mazeGroup.rotation.y = -Math.PI / 2;
    this.root.add(mazeGroup);

    // Base plate
    const plateGeo = new THREE.BoxGeometry(1.4, 1.4, 0.06);
    const plate = new THREE.Mesh(plateGeo, brassMat);
    mazeGroup.add(plate);

    // Stylus pin
    const pinGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const pinMat = MaterialFactory.getGlowingCrystal(0x00f0ff);
    this.mazePinMesh = new THREE.Mesh(pinGeo, pinMat);
    this.mazePinMesh.position.set(this.mazePinPos.x, this.mazePinPos.y, 0.08);
    mazeGroup.add(this.mazePinMesh);

    // Target socket
    const targetGeo = new THREE.TorusGeometry(0.1, 0.03, 16, 24);
    const target = new THREE.Mesh(targetGeo, goldMat);
    target.position.set(0.4, 0.4, 0.06);
    mazeGroup.add(target);

    this.registerInteractivePart({
      name: 'maze_pin',
      mesh: this.mazePinMesh,
      type: 'slider',
      focusTarget: new THREE.Vector3(faceX, 0, 0),
      focusDistance: 2.1,
      onDrag: (deltaX, deltaY) => {
        if (!this.gearTrainSolved || this.mazeSolved) {
          if (!this.gearTrainSolved) sound.playTick(0.5);
          return;
        }

        // Move pin within bounding box tracks
        this.mazePinPos.x = Math.min(Math.max(this.mazePinPos.x + deltaX * 0.003, -0.5), 0.5);
        this.mazePinPos.y = Math.min(Math.max(this.mazePinPos.y - deltaY * 0.003, -0.5), 0.5);
        this.mazePinMesh.position.set(this.mazePinPos.x, this.mazePinPos.y, 0.08);

        // Check target distance
        const distToGoal = Math.hypot(this.mazePinPos.x - 0.4, this.mazePinPos.y - 0.4);
        if (distToGoal < 0.08) {
          this.mazeSolved = true;
          this.triggerFinale();
        }
      }
    });
  }

  private buildPyramidLid(obsidianMat: THREE.Material, goldMat: THREE.Material): void {
    const lidBase = new THREE.Group();
    lidBase.position.y = 1.2;
    this.root.add(lidBase);

    // 4 folding pyramid triangular petals
    const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    for (let i = 0; i < 4; i++) {
      const petalHinge = new THREE.Group();
      petalHinge.rotation.y = angles[i];
      petalHinge.position.set(0, 0, 0);

      // Triangular petal mesh
      const petalGeo = new THREE.ConeGeometry(0.85, 0.8, 3);
      const petal = new THREE.Mesh(petalGeo, obsidianMat);
      petal.rotation.x = 0.5;
      petal.position.set(0, 0.4, 0.55);
      petalHinge.add(petal);

      // Gold tip
      const tipGeo = new THREE.ConeGeometry(0.18, 0.25, 4);
      const tip = new THREE.Mesh(tipGeo, goldMat);
      tip.position.set(0, 0.75, 0.55);
      petalHinge.add(tip);

      lidBase.add(petalHinge);
      this.pyramidPetals.push(petalHinge);
    }
  }

  private triggerFinale(): void {
    if (this.finaleTriggered) return;
    this.finaleTriggered = true;
    this.pyramidSpring.snapTo(Math.PI / 2.2);
    this.relicSpring.snapTo(1.6);
    this.relicMesh.visible = true;
    this.solveVault();
  }

  public checkStageCompletion(): void {
    // Stage 1: Cryptex alignment (Target: A=0, E=1, T=2, H=3)
    if (!this.cryptexSolved) {
      const idx0 = this.cryptexRings[0].getDetentIndex();
      const idx1 = this.cryptexRings[1].getDetentIndex();
      const idx2 = this.cryptexRings[2].getDetentIndex();
      const idx3 = this.cryptexRings[3].getDetentIndex();

      if (idx0 === 0 && idx1 === 1 && idx2 === 2 && idx3 === 3) {
        this.cryptexSolved = true;
        this.cryptexRings.forEach(r => (r.locked = true));
        this.advanceStage();
      }
    }
  }

  public update(dt: number): void {
    this.elapsedTime += dt;

    if (this.finaleTriggered) {
      const petalAngle = this.pyramidSpring.update(dt);
      for (const p of this.pyramidPetals) {
        p.rotation.x = petalAngle;
      }

      const relicY = this.relicSpring.update(dt);
      this.relicMesh.position.y = relicY + Math.sin(this.elapsedTime * 2.5) * 0.04;
      this.relicMesh.rotation.y += dt * 1.2;
      this.relicMesh.rotation.z += dt * 0.6;
    }
  }
}
