/**
 * Kinetic Vault - Gear Train Kinematics Engine
 * Computes gear engagement, pitch circle distances, backlash, and transmission speed ratios.
 */

export interface GearNode {
  id: string;
  teeth: number;
  pitchRadius: number;
  x: number;
  y: number;
  z: number;
  angle: number; // Current rotation in radians
  isDriver?: boolean;
  isLocked?: boolean;
}

export class GearTrainKernel {
  private gears: Map<string, GearNode> = new Map();
  private connections: Array<{ from: string; to: string; ratio: number; inverted: boolean }> = [];

  public addGear(gear: GearNode): void {
    this.gears.set(gear.id, { ...gear });
  }

  public getGear(id: string): GearNode | undefined {
    return this.gears.get(id);
  }

  public setGearPosition(id: string, x: number, y: number, z: number): void {
    const g = this.gears.get(id);
    if (g) {
      g.x = x;
      g.y = y;
      g.z = z;
    }
  }

  /**
   * Recalculates gear mesh linkages based on 2D/3D Euclidean distance between pitch circles
   */
  public updateMeshing(tolerance: number = 0.08): void {
    this.connections = [];
    const gearList = Array.from(this.gears.values());

    for (let i = 0; i < gearList.length; i++) {
      for (let j = i + 1; j < gearList.length; j++) {
        const gA = gearList[i];
        const gB = gearList[j];

        const dx = gA.x - gB.x;
        const dy = gA.y - gB.y;
        const dz = gA.z - gB.z;
        const dist = Math.hypot(dx, dy, dz);
        const targetDist = gA.pitchRadius + gB.pitchRadius;

        if (Math.abs(dist - targetDist) <= tolerance) {
          // Gears are engaged!
          const ratio = gA.teeth / gB.teeth;
          this.connections.push({
            from: gA.id,
            to: gB.id,
            ratio: ratio,
            inverted: true // External spur gears rotate in opposite directions
          });
        }
      }
    }
  }

  public isMeshEngaged(idA: string, idB: string): boolean {
    return this.connections.some(c => 
      (c.from === idA && c.to === idB) || (c.from === idB && c.to === idA)
    );
  }

  /**
   * Propagates rotation from a driver gear through the mesh network using BFS
   */
  public driveGear(driverId: string, deltaAngle: number): Map<string, number> {
    const updatedAngles = new Map<string, number>();
    const driver = this.gears.get(driverId);
    if (!driver) return updatedAngles;

    driver.angle = ((driver.angle + deltaAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    updatedAngles.set(driverId, driver.angle);

    const visited = new Set<string>([driverId]);
    const queue: Array<{ id: string; delta: number }> = [{ id: driverId, delta: deltaAngle }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const conn of this.connections) {
        let neighborId: string | null = null;
        let transRatio = 1.0;

        if (conn.from === current.id && !visited.has(conn.to)) {
          neighborId = conn.to;
          transRatio = conn.ratio * (conn.inverted ? -1 : 1);
        } else if (conn.to === current.id && !visited.has(conn.from)) {
          neighborId = conn.from;
          transRatio = (1 / conn.ratio) * (conn.inverted ? -1 : 1);
        }

        if (neighborId) {
          visited.add(neighborId);
          const neighborGear = this.gears.get(neighborId)!;
          const drivenDelta = current.delta * transRatio;
          neighborGear.angle = ((neighborGear.angle + drivenDelta) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          updatedAngles.set(neighborId, neighborGear.angle);
          queue.push({ id: neighborId, delta: drivenDelta });
        }
      }
    }

    return updatedAngles;
  }
}
