import * as THREE from 'three';
import { VaultBase } from '../vault_base';
import { SceneManager } from '../../engine/render/scene_manager';
import { RotationalConstraint, SpringDamper } from '../../engine/math/kinematics';
import { OpticalRayKernel } from '../../engine/math/optical';
import type { OpticalMirror, OpticalTarget } from '../../engine/math/optical';
import { MaterialFactory } from '../../engine/render/materials';
import { sound } from '../../engine/audio/sound_engine';
import { haptics } from '../../engine/haptics/haptics_manager';

export class Vault3ChronoDynamo extends VaultBase {
  // Puzzle 1: Steam Valves & Pressure Gauges
  private valveRotations: RotationalConstraint[] = [];
  private valveMeshes: THREE.Group[] = [];
  private gaugeNeedleMeshes: THREE.Mesh[] = [];
  private pressureValues: [number, number, number] = [0.1, 0.2, 0.1];
  private pressureSolved: boolean = false;

  // Puzzle 2: Optical Laser Prisms
  private opticalKernel: OpticalRayKernel;
  private prismRotations: RotationalConstraint[] = [];
  private prismMeshes: THREE.Group[] = [];
  private laserOrigin: THREE.Vector3 = new THREE.Vector3(0, 0.8, -1.2);
  private laserDir: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
  private laserBeamMesh!: THREE.LineSegments;
  private laserTargetMesh!: THREE.Mesh;
  private laserSolved: boolean = false;

  // Puzzle 3: Harmonic Levers
  private leverLevers: THREE.Group[] = [];
  private leverStates: boolean[] = [false, false, false, false];
  private targetSequence: number[] = [3, 1, 0, 2]; // Levers 4, 2, 1, 3
  private currentSeqProgress: number = 0;
  private leversSolved: boolean = false;

  // Vault Finale
  private dynamoCoreMesh!: THREE.Group;
  private turbineRotorMesh!: THREE.Mesh;
  private turbineSpeed: number = 0;
  private coreLiftSpring: SpringDamper;
  private finaleTriggered: boolean = false;

  constructor(sceneManager: SceneManager) {
    super(sceneManager, {
      id: 'vault-3',
      number: 3,
      title: 'The Chrono Dynamo',
      subtitle: 'The Steampunk Resonator',
      difficulty: 'Artisan',
      description: 'A cylindrical steampunk dynamo with copper conduits, pressure-calibrated steam valves, and an optical prismatic laser array.',
      totalStages: 3,
      estimatedMinutes: 10
    });

    this.opticalKernel = new OpticalRayKernel();
    this.coreLiftSpring = new SpringDamper(0, 110, 16);

    this.setupConstraints();
    this.setupJournalAndHints();
    this.buildModel();
  }

  private setupConstraints(): void {
    // 3 Valves
    for (let i = 0; i < 3; i++) {
      const rot = new RotationalConstraint(0, 0, Math.PI * 4);
      this.valveRotations.push(rot);
    }

    // 3 Prisms
    for (let i = 0; i < 3; i++) {
      const rot = new RotationalConstraint(0);
      rot.setDetentSteps(8);
      this.prismRotations.push(rot);
    }
  }

  private setupJournalAndHints(): void {
    this.journal = [
      {
        id: 'v3-j1',
        vaultId: 'vault-3',
        title: 'Pressure Equilibrium',
        lore: 'The steam chambers are cross-coupled. Valve A feeds Chambers 1 & 2; Valve B balances 2 & 3; Valve C regulates 1 & 3.',
        clue: 'Rotate the 3 brass valves until all 3 pressure gauge needles point into the central green zone.',
        sketchSvg: `<svg viewBox="0 0 100 100" class="journal-sketch"><circle cx="30" cy="50" r="18" fill="none" stroke="#d4af37" stroke-width="2"/><circle cx="70" cy="50" r="18" fill="none" stroke="#d4af37" stroke-width="2"/><line x1="30" y1="50" x2="30" y2="36" stroke="#00ff88" stroke-width="3"/><line x1="70" y1="50" x2="70" y2="36" stroke="#00ff88" stroke-width="3"/></svg>`
      },
      {
        id: 'v3-j2',
        vaultId: 'vault-3',
        title: 'Prismatic Conduit',
        lore: 'A focused beam of light must travel clockwise across the three rotating mirrors to strike the solar cathode.',
        clue: 'Align Mirror 1, Mirror 2, and Mirror 3 so the reflected laser enters the glowing amber cathode.',
        sketchSvg: `<svg viewBox="0 0 100 100" class="journal-sketch"><line x1="20" y1="30" x2="70" y2="30" stroke="#00f0ff" stroke-width="3"/><line x1="70" y1="30" x2="70" y2="80" stroke="#00f0ff" stroke-width="3"/><line x1="70" y1="80" x2="25" y2="80" stroke="#00f0ff" stroke-width="3"/><circle cx="25" cy="80" r="6" fill="#ffaa00"/></svg>`
      }
    ];

    this.hints = [
      {
        stage: 1,
        level1: 'Examine the 3 rotary wheel valves on the copper pipes.',
        level2: 'Turning each valve adjusts the coupled needles on the three pressure dials.',
        level3: 'Tune Valve 1 to ~1.5 turns, Valve 2 to ~2.0 turns, and Valve 3 to ~1.0 turn until all needles enter the green markers.'
      },
      {
        stage: 2,
        level1: 'The optical laser has ignited. Look at the mirrors mounted on the cylinder.',
        level2: 'Rotate each mirror prism turret so it directs the cyan beam to the next prism.',
        level3: 'Rotate Mirror 1 45°, Mirror 2 90°, and Mirror 3 135° to reflect the beam into the amber target.'
      },
      {
        stage: 3,
        level1: 'Observe the 4 brass toggle levers along the bottom rim.',
        level2: 'They must be engaged in harmonic sequence: IV, II, I, III.',
        level3: 'Click Lever 4, then Lever 2, then Lever 1, and finally Lever 3.'
      }
    ];
  }

  public buildModel(): void {
    const copperMat = MaterialFactory.getCopper();
    const brassMat = MaterialFactory.getBrushedBrass();
    const ironMat = MaterialFactory.getDarkIron();
    const goldMat = MaterialFactory.getPolishedGold();

    // Cylindrical Main Hull
    const hullGeo = new THREE.CylinderGeometry(1.3, 1.35, 2.6, 36);
    const hullMesh = new THREE.Mesh(hullGeo, ironMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    this.root.add(hullMesh);

    // Copper piping wraps around hull
    this.buildCopperPiping(copperMat);

    // Steam Valves & Pressure Gauges
    this.buildSteamValvesAndGauges(brassMat, copperMat);

    // Prismatic Mirrors & Laser Array
    this.buildOpticalPrisms(brassMat);

    // 4 Harmonic Base Levers
    this.buildHarmonicLevers(brassMat, goldMat);

    // Central Dynamo Turbine & Ascending Core
    this.buildDynamoCore(copperMat);
  }

  private buildCopperPiping(copperMat: THREE.Material): void {
    for (let y = -0.7; y <= 0.7; y += 0.7) {
      const pipeGeo = new THREE.TorusGeometry(1.34, 0.04, 12, 36);
      const pipe = new THREE.Mesh(pipeGeo, copperMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.y = y;
      this.root.add(pipe);
    }
  }

  private buildSteamValvesAndGauges(brassMat: THREE.Material, copperMat: THREE.Material): void {
    const valveAngles = [-Math.PI / 3, 0, Math.PI / 3];

    for (let i = 0; i < 3; i++) {
      const angle = valveAngles[i];
      const rad = 1.35;
      const x = Math.sin(angle) * rad;
      const z = Math.cos(angle) * rad;

      // Pressure Gauge Housing
      const gaugeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20);
      const gauge = new THREE.Mesh(gaugeGeo, brassMat);
      gauge.rotation.x = Math.PI / 2;
      gauge.rotation.z = -angle;
      gauge.position.set(x, 0.5, z);
      this.root.add(gauge);

      // Gauge needle
      const needleGeo = new THREE.BoxGeometry(0.02, 0.14, 0.02);
      const needleMat = MaterialFactory.getPolishedGold();
      const needle = new THREE.Mesh(needleGeo, needleMat);
      needle.position.set(x, 0.5, z + 0.05);
      this.root.add(needle);
      this.gaugeNeedleMeshes.push(needle);

      // Rotary Handwheel Valve
      const valveGroup = new THREE.Group();
      valveGroup.position.set(x, -0.3, z);
      valveGroup.rotation.y = angle;

      const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8);
      const stem = new THREE.Mesh(stemGeo, copperMat);
      stem.rotation.x = Math.PI / 2;
      valveGroup.add(stem);

      const wheelGeo = new THREE.TorusGeometry(0.14, 0.025, 12, 24);
      const wheel = new THREE.Mesh(wheelGeo, brassMat);
      wheel.position.z = 0.1;
      valveGroup.add(wheel);

      this.root.add(valveGroup);
      this.valveMeshes.push(valveGroup);

      const valveIdx = i;
      this.registerInteractivePart({
        name: `valve_${valveIdx}`,
        mesh: valveGroup,
        type: 'dial',
        focusTarget: new THREE.Vector3(x, -0.1, z),
        focusDistance: 1.8,
        onDrag: (deltaX) => {
          if (this.pressureSolved) return;
          const res = this.valveRotations[valveIdx].rotateBy(deltaX * 0.02);
          wheel.rotation.z = res.angle;

          // Cross-coupling pressure simulation
          this.recalculatePressures();
          sound.playRatchet();
          haptics.tick();
        }
      });
    }
  }

  private recalculatePressures(): void {
    const v0 = this.valveRotations[0].angle / (Math.PI * 4);
    const v1 = this.valveRotations[1].angle / (Math.PI * 4);
    const v2 = this.valveRotations[2].angle / (Math.PI * 4);

    // Inter-chamber cross calculation
    this.pressureValues[0] = Math.min(1.0, 0.6 * v0 + 0.4 * v2);
    this.pressureValues[1] = Math.min(1.0, 0.5 * v0 + 0.5 * v1);
    this.pressureValues[2] = Math.min(1.0, 0.4 * v1 + 0.6 * v2);

    for (let i = 0; i < 3; i++) {
      this.gaugeNeedleMeshes[i].rotation.z = (this.pressureValues[i] - 0.5) * Math.PI * 1.2;
    }

    // Green zone check (all between 0.45 and 0.65)
    if (
      this.pressureValues[0] >= 0.45 && this.pressureValues[0] <= 0.65 &&
      this.pressureValues[1] >= 0.45 && this.pressureValues[1] <= 0.65 &&
      this.pressureValues[2] >= 0.45 && this.pressureValues[2] <= 0.65
    ) {
      this.pressureSolved = true;
      sound.playSteamHiss();
      sound.playLatch();
      haptics.heavyImpact();
      this.sceneManager.particleSystem.emitSteam(new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0, 1, 0), 30);
      this.advanceStage();
    }
  }

  private buildOpticalPrisms(brassMat: THREE.Material): void {
    // 3 Prism Turret Positions
    const prismPos = [
      new THREE.Vector3(1.1, 0.8, -0.6),
      new THREE.Vector3(1.1, 0.8, 0.6),
      new THREE.Vector3(-0.6, 0.8, 1.1)
    ];

    for (let i = 0; i < 3; i++) {
      const turret = new THREE.Group();
      turret.position.copy(prismPos[i]);

      const baseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 16);
      const base = new THREE.Mesh(baseGeo, brassMat);
      turret.add(base);

      // Rotating prism mirror plate
      const mirrorGeo = new THREE.BoxGeometry(0.18, 0.22, 0.04);
      const mirrorMat = MaterialFactory.getMirrorGlass();
      const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
      mirror.position.y = 0.14;
      turret.add(mirror);

      this.root.add(turret);
      this.prismMeshes.push(turret);

      const pIdx = i;
      this.registerInteractivePart({
        name: `prism_${pIdx}`,
        mesh: turret,
        type: 'dial',
        focusTarget: prismPos[i],
        focusDistance: 1.8,
        onDrag: (deltaX) => {
          if (!this.pressureSolved || this.laserSolved) return;
          const res = this.prismRotations[pIdx].rotateBy(deltaX * 0.02);
          turret.rotation.y = res.angle;
          if (res.detentHit) {
            sound.playTick(1.2);
            haptics.tick();
          }
          this.retraceLaser();
        }
      });
    }

    // Photoelectric Solar Target
    const targetGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const targetMat = MaterialFactory.getGlowingCrystal(0xffaa00);
    this.laserTargetMesh = new THREE.Mesh(targetGeo, targetMat);
    this.laserTargetMesh.position.set(-1.1, 0.8, -0.6);
    this.root.add(this.laserTargetMesh);

    // Initial Laser Beam Geometry
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 });
    this.laserBeamMesh = new THREE.LineSegments(lineGeo, lineMat);
    this.laserBeamMesh.visible = false;
    this.root.add(this.laserBeamMesh);
  }

  private retraceLaser(): void {
    if (!this.pressureSolved) return;
    this.laserBeamMesh.visible = true;

    const mirrors: OpticalMirror[] = this.prismMeshes.map((mesh, idx) => {
      const normal = new THREE.Vector3(0, 0, 1).applyEuler(mesh.rotation);
      return {
        id: `mirror_${idx}`,
        position: mesh.position.clone().add(new THREE.Vector3(0, 0.14, 0)),
        normal: normal,
        size: 0.16
      };
    });

    const targets: OpticalTarget[] = [
      {
        id: 'solar_target',
        position: this.laserTargetMesh.position.clone(),
        radius: 0.15,
        activated: false
      }
    ];

    const result = this.opticalKernel.traceBeam(this.laserOrigin, this.laserDir, mirrors, targets);

    // Update laser line buffer
    const points: number[] = [];
    for (const seg of result.segments) {
      points.push(seg.start.x, seg.start.y, seg.start.z);
      points.push(seg.end.x, seg.end.y, seg.end.z);
    }

    this.laserBeamMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    this.laserBeamMesh.geometry.computeBoundingSphere();

    // Check target activation
    if (result.hitTargets.includes('solar_target') && !this.laserSolved) {
      this.laserSolved = true;
      sound.playUnlockChime();
      sound.playLatch();
      haptics.heavyImpact();
      this.advanceStage();
    }
  }

  private buildHarmonicLevers(brassMat: THREE.Material, goldMat: THREE.Material): void {
    const leverSpacing = 0.35;
    const startX = -0.52;

    for (let i = 0; i < 4; i++) {
      const leverGroup = new THREE.Group();
      leverGroup.position.set(startX + i * leverSpacing, -1.0, 1.34);

      const pivotGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const pivot = new THREE.Mesh(pivotGeo, brassMat);
      leverGroup.add(pivot);

      const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8);
      const arm = new THREE.Mesh(armGeo, goldMat);
      arm.position.y = 0.14;
      leverGroup.add(arm);

      this.root.add(leverGroup);
      this.leverLevers.push(leverGroup);

      const lIdx = i;
      this.registerInteractivePart({
        name: `lever_${lIdx}`,
        mesh: leverGroup,
        type: 'toggle',
        focusTarget: new THREE.Vector3(0, -1.0, 1.34),
        focusDistance: 1.8,
        onClick: () => {
          if (!this.laserSolved || this.leversSolved) return;
          this.toggleLever(lIdx);
        }
      });
    }
  }

  private toggleLever(index: number): void {
    const lever = this.leverLevers[index];
    const targetExpected = this.targetSequence[this.currentSeqProgress];

    if (index === targetExpected) {
      // Correct lever in sequence!
      this.leverStates[index] = true;
      lever.rotation.x = 0.6;
      this.currentSeqProgress++;
      sound.playTick(1.0 + this.currentSeqProgress * 0.2);
      haptics.latch();

      if (this.currentSeqProgress === this.targetSequence.length) {
        this.leversSolved = true;
        this.triggerFinale();
      }
    } else {
      // Incorrect lever: reset levers
      sound.playTick(0.5);
      haptics.warning();
      this.currentSeqProgress = 0;
      this.leverStates = [false, false, false, false];
      this.leverLevers.forEach(l => (l.rotation.x = 0));
    }
  }

  private buildDynamoCore(copperMat: THREE.Material): void {
    this.dynamoCoreMesh = new THREE.Group();

    // Turbine rotor
    const rotorGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.15, 24);
    this.turbineRotorMesh = new THREE.Mesh(rotorGeo, copperMat);
    this.dynamoCoreMesh.add(this.turbineRotorMesh);

    // Glowing Chrono Core inside
    const coreGeo = new THREE.DodecahedronGeometry(0.35, 1);
    const coreMat = MaterialFactory.getGlowingCrystal(0x00f0ff);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.35;
    this.dynamoCoreMesh.add(core);

    this.dynamoCoreMesh.position.set(0, 0.5, 0);
    this.dynamoCoreMesh.visible = false;
    this.root.add(this.dynamoCoreMesh);
  }

  private triggerFinale(): void {
    if (this.finaleTriggered) return;
    this.finaleTriggered = true;
    this.dynamoCoreMesh.visible = true;
    this.coreLiftSpring.snapTo(1.7);
    this.solveVault();
  }

  public checkStageCompletion(): void {
    // Handled in individual puzzle triggers
  }

  public update(dt: number): void {
    this.elapsedTime += dt;

    if (this.pressureSolved && !this.laserSolved) {
      this.retraceLaser();
    }

    if (this.finaleTriggered) {
      this.turbineSpeed = Math.min(this.turbineSpeed + dt * 4, 15);
      this.turbineRotorMesh.rotation.y += dt * this.turbineSpeed;

      const coreY = this.coreLiftSpring.update(dt);
      this.dynamoCoreMesh.position.y = coreY + Math.sin(this.elapsedTime * 3) * 0.05;
      this.dynamoCoreMesh.rotation.y += dt * 0.8;
    }
  }
}
