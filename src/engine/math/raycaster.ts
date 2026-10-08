import * as THREE from 'three';

export interface TouchInteraction {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  startTime: number;
}

export class MechanicalRaycaster {
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private camera: THREE.Camera;
  private plane: THREE.Plane;
  private planeIntersect: THREE.Vector3;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 0.1 };
    this.pointer = new THREE.Vector2();
    this.plane = new THREE.Plane();
    this.planeIntersect = new THREE.Vector3();
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * Converts client (pixel) coordinates to normalized device coordinates (-1 to 1)
   */
  public toNDC(clientX: number, clientY: number, width: number, height: number): THREE.Vector2 {
    this.pointer.x = (clientX / width) * 2 - 1;
    this.pointer.y = -(clientY / height) * 2 + 1;
    return this.pointer;
  }

  /**
   * Casts a ray from normalized device coordinates into the scene
   */
  public intersectObjects(objects: THREE.Object3D[], clientX: number, clientY: number, width: number, height: number): THREE.Intersection[] {
    this.toNDC(clientX, clientY, width, height);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  /**
   * Calculates rotational angle change around a dial center given two pointer positions.
   * Uses screen-space angular projection for intuitive touch feel.
   */
  public calculateDialAngleDelta(
    dialCenterWorld: THREE.Vector3,
    prevX: number,
    prevY: number,
    currX: number,
    currY: number,
    width: number,
    height: number,
    normalWorld: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
  ): number {
    // Project dial center to screen coordinates
    const centerScreen = dialCenterWorld.clone().project(this.camera);
    const screenCenterX = ((centerScreen.x + 1) * 0.5) * width;
    const screenCenterY = ((-centerScreen.y + 1) * 0.5) * height;

    // Calculate angles from dial center to previous and current touch positions
    const anglePrev = Math.atan2(prevY - screenCenterY, prevX - screenCenterX);
    const angleCurr = Math.atan2(currY - screenCenterY, currX - screenCenterX);

    let delta = angleCurr - anglePrev;
    // Normalize jump across boundary (-PI to PI)
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    // Check if dial normal points away from camera view direction
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const dot = normalWorld.dot(camDir);
    if (dot > 0) {
      delta = -delta;
    }

    return delta;
  }

  /**
   * Projects pointer motion along a 3D linear slider rail
   */
  public calculateSliderDelta(
    sliderWorldPos: THREE.Vector3,
    sliderRailDirectionWorld: THREE.Vector3,
    prevClientX: number,
    prevClientY: number,
    currClientX: number,
    currClientY: number,
    width: number,
    height: number
  ): number {
    // Project slider origin and unit offset along rail to screen space
    const originScreen = sliderWorldPos.clone().project(this.camera);
    const offsetPoint = sliderWorldPos.clone().add(sliderRailDirectionWorld.clone().multiplyScalar(1.0));
    const offsetScreen = offsetPoint.project(this.camera);

    const railScreenVec = new THREE.Vector2(
      (offsetScreen.x - originScreen.x) * (width * 0.5),
      -(offsetScreen.y - originScreen.y) * (height * 0.5)
    );

    const railLengthSq = railScreenVec.lengthSq();
    if (railLengthSq < 0.0001) return 0;

    const dragScreenVec = new THREE.Vector2(
      currClientX - prevClientX,
      currClientY - prevClientY
    );

    // Project drag vector onto rail vector
    const scalarProjection = dragScreenVec.dot(railScreenVec) / railLengthSq;
    return scalarProjection;
  }

  /**
   * Computes ray intersection on an arbitrary plane passing through a point
   */
  public getPlaneIntersection(pointOnPlane: THREE.Vector3, planeNormal: THREE.Vector3, clientX: number, clientY: number, width: number, height: number): THREE.Vector3 | null {
    this.toNDC(clientX, clientY, width, height);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.plane.setFromNormalAndCoplanarPoint(planeNormal, pointOnPlane);
    return this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect);
  }
}
