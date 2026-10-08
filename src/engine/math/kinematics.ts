/**
 * Kinetic Vault - Mechanical Kinematics & Constraint Engine
 * Handles linear sliders, rotational dials, spring-damper dynamics, and mechanical interlocks.
 */

export interface DetentConfig {
  step: number; // Interval between detents (e.g., Math.PI / 6 or 0.1 units)
  snapStrength: number; // Pull factor towards detent (0..1)
  threshold: number; // Distance threshold within which snapping occurs
}

export class SpringDamper {
  public value: number;
  public velocity: number = 0;
  public target: number;
  public stiffness: number; // k
  public damping: number;   // c
  public mass: number;

  constructor(initial: number = 0, stiffness: number = 220, damping: number = 22, mass: number = 1.0) {
    this.value = initial;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
  }

  public update(dt: number): number {
    const clampedDt = Math.min(dt, 0.05); // Prevent instability on lag spikes
    const displacement = this.value - this.target;
    const springForce = -this.stiffness * displacement;
    const dampingForce = -this.damping * this.velocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    this.velocity += acceleration * clampedDt;
    this.value += this.velocity * clampedDt;

    // Settle when practically at rest
    if (Math.abs(this.velocity) < 0.0005 && Math.abs(displacement) < 0.0005) {
      this.value = this.target;
      this.velocity = 0;
    }

    return this.value;
  }

  public snapTo(newTarget: number): void {
    this.target = newTarget;
  }

  public reset(val: number): void {
    this.value = val;
    this.target = val;
    this.velocity = 0;
  }
}

export class LinearConstraint {
  public current: number;
  public min: number;
  public max: number;
  public detents: number[] = [];
  public detentTolerance: number = 0.05;
  public locked: boolean = false;
  private lastDetentIndex: number = -1;

  constructor(min: number = 0, max: number = 1, initial: number = 0) {
    this.min = min;
    this.max = max;
    this.current = Math.min(Math.max(initial, min), max);
  }

  public addDetents(values: number[], tolerance: number = 0.05): void {
    this.detents = values;
    this.detentTolerance = tolerance;
  }

  public moveBy(delta: number): { value: number; detentHit: boolean; detentIndex: number } {
    if (this.locked) {
      return { value: this.current, detentHit: false, detentIndex: -1 };
    }

    const next = Math.min(Math.max(this.current + delta, this.min), this.max);
    this.current = next;

    let detentHit = false;
    let hitIndex = -1;

    for (let i = 0; i < this.detents.length; i++) {
      if (Math.abs(this.current - this.detents[i]) < this.detentTolerance) {
        if (this.lastDetentIndex !== i) {
          detentHit = true;
          this.lastDetentIndex = i;
          hitIndex = i;
        }
        break;
      }
    }

    if (hitIndex === -1) {
      this.lastDetentIndex = -1;
    }

    return { value: this.current, detentHit, detentIndex: hitIndex };
  }

  public getNormalized(): number {
    return (this.current - this.min) / (this.max - this.min);
  }

  public snapNearestDetent(): number {
    if (this.detents.length === 0) return this.current;
    let closest = this.detents[0];
    let minDist = Math.abs(this.current - closest);
    for (const d of this.detents) {
      const dist = Math.abs(this.current - d);
      if (dist < minDist) {
        minDist = dist;
        closest = d;
      }
    }
    this.current = closest;
    return closest;
  }
}

export class RotationalConstraint {
  public angle: number = 0; // Current angle in radians
  public minAngle: number | null = null;
  public maxAngle: number | null = null;
  public detentStep: number | null = null; // Step size in radians (e.g. Math.PI / 4)
  public detentCount: number = 0;
  public locked: boolean = false;
  private lastDetentIndex: number = -1;

  constructor(initialAngle: number = 0, min: number | null = null, max: number | null = null) {
    this.angle = initialAngle;
    this.minAngle = min;
    this.maxAngle = max;
  }

  public setDetentSteps(divisions: number): void {
    this.detentCount = divisions;
    this.detentStep = (Math.PI * 2) / divisions;
  }

  public rotateBy(deltaRadians: number): { angle: number; detentHit: boolean; detentIndex: number } {
    if (this.locked) {
      return { angle: this.angle, detentHit: false, detentIndex: -1 };
    }

    let next = this.angle + deltaRadians;

    if (this.minAngle !== null && this.maxAngle !== null) {
      next = Math.min(Math.max(next, this.minAngle), this.maxAngle);
    } else {
      // Continuous wrap between 0 and 2*PI
      next = ((next % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    }

    this.angle = next;

    let detentHit = false;
    let hitIndex = -1;

    if (this.detentStep !== null && this.detentCount > 0) {
      const normalizedAngle = ((this.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const rawIndex = Math.round(normalizedAngle / this.detentStep) % this.detentCount;
      const targetAngle = rawIndex * this.detentStep;
      const diff = Math.abs(normalizedAngle - targetAngle);

      if (diff < 0.08 && this.lastDetentIndex !== rawIndex) {
        detentHit = true;
        this.lastDetentIndex = rawIndex;
        hitIndex = rawIndex;
      } else if (diff >= 0.08) {
        this.lastDetentIndex = -1;
      }
    }

    return { angle: this.angle, detentHit, detentIndex: hitIndex };
  }

  public getDetentIndex(): number {
    if (!this.detentStep || this.detentCount === 0) return 0;
    const normalized = ((this.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.round(normalized / this.detentStep) % this.detentCount;
  }

  public snapNearestDetent(): number {
    if (!this.detentStep) return this.angle;
    const idx = this.getDetentIndex();
    this.angle = idx * this.detentStep;
    return this.angle;
  }
}

/**
 * Mechanical Interlock Graph: Prevents Part B from moving unless Part A satisfies condition
 */
export class InterlockCondition {
  public id: string;
  public check: () => boolean;

  constructor(id: string, check: () => boolean) {
    this.id = id;
    this.check = check;
  }

  public isSatisfied(): boolean {
    return this.check();
  }
}
