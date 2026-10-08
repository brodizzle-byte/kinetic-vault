import * as THREE from 'three';

export interface OpticalMirror {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  size: number;
}

export interface OpticalTarget {
  id: string;
  position: THREE.Vector3;
  radius: number;
  activated: boolean;
}

export interface RaySegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  intensity: number;
}

export class OpticalRayKernel {
  private maxBounces: number = 8;
  private maxDistance: number = 25;

  /**
   * Traces a laser ray through a set of planar mirrors to targets
   */
  public traceBeam(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    mirrors: OpticalMirror[],
    targets: OpticalTarget[]
  ): { segments: RaySegment[]; hitTargets: string[] } {
    const segments: RaySegment[] = [];
    const hitTargets: string[] = [];

    let currentOrigin = origin.clone();
    let currentDir = direction.clone().normalize();
    let intensity = 1.0;

    for (let bounce = 0; bounce < this.maxBounces; bounce++) {
      let closestHitDist = this.maxDistance;
      let hitMirror: OpticalMirror | null = null;
      let hitNormal: THREE.Vector3 | null = null;
      let hitPoint: THREE.Vector3 | null = null;

      // Check intersection with mirrors (finite plane discs)
      for (const mirror of mirrors) {
        // Plane equation: (p - mirror.pos) . mirror.normal = 0
        const denom = mirror.normal.dot(currentDir);
        // Avoid parallel or backface incidence
        if (Math.abs(denom) > 1e-4) {
          const t = mirror.position.clone().sub(currentOrigin).dot(mirror.normal) / denom;
          if (t > 0.05 && t < closestHitDist) {
            const p = currentOrigin.clone().add(currentDir.clone().multiplyScalar(t));
            // Check if within mirror disk radius
            const distFromCenter = p.distanceTo(mirror.position);
            if (distFromCenter <= mirror.size) {
              closestHitDist = t;
              hitMirror = mirror;
              hitPoint = p;
              // Ensure normal opposes incoming ray
              hitNormal = mirror.normal.clone();
              if (hitNormal.dot(currentDir) > 0) {
                hitNormal.negate();
              }
            }
          }
        }
      }

      // Check intersection with target spheres
      for (const target of targets) {
        // Ray-sphere intersection
        const toTarget = target.position.clone().sub(currentOrigin);
        const projection = toTarget.dot(currentDir);
        if (projection > 0.05 && projection < closestHitDist) {
          const closestPoint = currentOrigin.clone().add(currentDir.clone().multiplyScalar(projection));
          const distToTarget = closestPoint.distanceTo(target.position);
          if (distToTarget <= target.radius) {
            closestHitDist = projection;
            hitPoint = closestPoint;
            hitMirror = null; // Target absorbs beam
            if (!hitTargets.includes(target.id)) {
              hitTargets.push(target.id);
            }
          }
        }
      }

      const segmentEnd = hitPoint ? hitPoint : currentOrigin.clone().add(currentDir.clone().multiplyScalar(closestHitDist));
      segments.push({
        start: currentOrigin.clone(),
        end: segmentEnd.clone(),
        intensity: intensity
      });

      if (hitMirror && hitNormal) {
        // Reflection vector: r = d - 2(d . n)n
        currentOrigin = segmentEnd.clone();
        currentDir = currentDir.clone().sub(hitNormal.clone().multiplyScalar(2 * currentDir.dot(hitNormal))).normalize();
        intensity *= 0.92; // Slight absorption
      } else {
        // Beam hit target or faded into space
        break;
      }
    }

    return { segments, hitTargets };
  }
}
