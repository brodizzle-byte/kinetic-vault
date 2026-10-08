import * as THREE from 'three';

/**
 * Procedural PBR Material Generator
 * Creates realistic brushed brass, weathered iron, dark obsidian, and engraved dial textures
 * entirely in memory via HTML5 Canvas (100% offline, zero network assets).
 */
export class MaterialFactory {
  /**
   * Generates brushed metallic texture
   */
  public static createBrushedMetalCanvas(
    baseColor: string,
    accentColor: string,
    width: number = 512,
    height: number = 512
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Base background
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Fine linear brushed grain
    ctx.fillStyle = accentColor;
    for (let y = 0; y < height; y += 2) {
      const alpha = 0.04 + Math.random() * 0.08;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, y, width, 1 + Math.random() * 2);
    }

    // Subtle noise specks
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.fillRect(rx, ry, 1, 1);
    }
    ctx.globalAlpha = 1.0;

    return canvas;
  }

  /**
   * Generates circular dial face with graduated ticks and Roman numerals
   */
  public static createDialFaceCanvas(
    ticks: number = 12,
    labels: string[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'],
    size: number = 512
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;
    const radius = size * 0.45;

    // Dark brass ring plate
    const grad = ctx.createRadialGradient(center, center, radius * 0.2, center, center, radius);
    grad.addColorStop(0, '#2b2314');
    grad.addColorStop(0.7, '#18140c');
    grad.addColorStop(1, '#0e0b06');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outer and inner concentric rings
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(center, center, radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#aa8a22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    // Ticks & Labels
    ctx.fillStyle = '#ffdf78';
    ctx.font = `bold ${Math.round(size * 0.065)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const step = (Math.PI * 2) / ticks;
    for (let i = 0; i < ticks; i++) {
      const angle = i * step - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Major tick
      ctx.strokeStyle = '#ffe89c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(center + cos * (radius - 22), center + sin * (radius - 22));
      ctx.lineTo(center + cos * (radius - 6), center + sin * (radius - 6));
      ctx.stroke();

      // Minor tick between
      const halfAngle = angle + step * 0.5;
      ctx.strokeStyle = '#aa8828';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(center + Math.cos(halfAngle) * (radius - 14), center + Math.sin(halfAngle) * (radius - 14));
      ctx.lineTo(center + Math.cos(halfAngle) * (radius - 6), center + Math.sin(halfAngle) * (radius - 6));
      ctx.stroke();

      // Label
      if (labels[i]) {
        const textR = radius * 0.78;
        ctx.fillText(labels[i], center + cos * textR, center + sin * textR);
      }
    }

    return canvas;
  }

  /**
   * Generates dark obsidian texture with subtle crystalline veining
   */
  public static createObsidianCanvas(size: number = 512): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, size, size);

    // Subtle veins
    ctx.strokeStyle = 'rgba(45, 55, 75, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      for (let j = 0; j < 4; j++) {
        ctx.lineTo(Math.random() * size, Math.random() * size);
      }
      ctx.stroke();
    }

    return canvas;
  }

  // --- Material Pre-configurations ---

  public static getBrushedBrass(): THREE.MeshStandardMaterial {
    const canvas = this.createBrushedMetalCanvas('#c29b38', '#ffe484');
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return new THREE.MeshStandardMaterial({
      color: 0xdeb841,
      metalness: 0.88,
      roughness: 0.28,
      map: texture
    });
  }

  public static getPolishedGold(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15
    });
  }

  public static getDarkIron(): THREE.MeshStandardMaterial {
    const canvas = this.createBrushedMetalCanvas('#212429', '#3b404a');
    const texture = new THREE.CanvasTexture(canvas);

    return new THREE.MeshStandardMaterial({
      color: 0x2b3038,
      metalness: 0.75,
      roughness: 0.45,
      map: texture
    });
  }

  public static getObsidian(): THREE.MeshStandardMaterial {
    const canvas = this.createObsidianCanvas();
    const texture = new THREE.CanvasTexture(canvas);

    return new THREE.MeshStandardMaterial({
      color: 0x14161d,
      metalness: 0.2,
      roughness: 0.12,
      map: texture
    });
  }

  public static getCopper(): THREE.MeshStandardMaterial {
    const canvas = this.createBrushedMetalCanvas('#b8623d', '#e88f6b');
    const texture = new THREE.CanvasTexture(canvas);

    return new THREE.MeshStandardMaterial({
      color: 0xc86a43,
      metalness: 0.85,
      roughness: 0.32,
      map: texture
    });
  }

  public static getGlowingCrystal(colorHex: number = 0x00f0ff): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.75,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });
  }

  public static getMirrorGlass(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.05
    });
  }

  public static getDialMaterial(divisions: number, labels?: string[]): THREE.MeshStandardMaterial {
    const canvas = this.createDialFaceCanvas(divisions, labels);
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.8,
      roughness: 0.25
    });
  }
}
