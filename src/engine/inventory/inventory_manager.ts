import * as THREE from 'three';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  iconSvg: string;
  meshGenerator: () => THREE.Object3D;
  isManipulable?: boolean;
  state?: Record<string, unknown>;
  onInspectManipulate?: (item: InventoryItem, partName: string) => boolean;
}

export class InventoryManager {
  private items: Map<string, InventoryItem> = new Map();
  private selectedItemId: string | null = null;
  private onChangeListeners: Array<() => void> = [];

  public addItem(item: InventoryItem): void {
    if (!this.items.has(item.id)) {
      this.items.set(item.id, item);
      this.notify();
    }
  }

  public removeItem(id: string): void {
    if (this.items.delete(id)) {
      if (this.selectedItemId === id) {
        this.selectedItemId = null;
      }
      this.notify();
    }
  }

  public hasItem(id: string): boolean {
    return this.items.has(id);
  }

  public getItem(id: string): InventoryItem | undefined {
    return this.items.get(id);
  }

  public getAllItems(): InventoryItem[] {
    return Array.from(this.items.values());
  }

  public selectItem(id: string | null): void {
    this.selectedItemId = id;
    this.notify();
  }

  public getSelectedItem(): InventoryItem | null {
    return this.selectedItemId ? this.items.get(this.selectedItemId) || null : null;
  }

  public clear(): void {
    this.items.clear();
    this.selectedItemId = null;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.onChangeListeners.push(listener);
    return () => {
      this.onChangeListeners = this.onChangeListeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.onChangeListeners) {
      listener();
    }
  }
}

export const inventory = new InventoryManager();
