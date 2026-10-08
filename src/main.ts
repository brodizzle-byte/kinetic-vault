import './style.css';
import { SceneManager } from './engine/render/scene_manager';
import { HUD } from './ui/hud';
import { VaultBase } from './game/vault_base';
import { Vault1BrassCrypt } from './game/levels/vault1_brass_crypt';
import { Vault2ObsidianMonolith } from './game/levels/vault2_obsidian_monolith';
import { Vault3ChronoDynamo } from './game/levels/vault3_chrono_dynamo';
import { inventory } from './engine/inventory/inventory_manager';
import { sound } from './engine/audio/sound_engine';

class KineticVaultApp {
  private sceneManager: SceneManager;
  private hud: HUD;
  private activeVault: VaultBase | null = null;
  private currentVaultId: string = 'vault-1';

  constructor() {
    const viewportContainer = document.getElementById('viewport-container')!;
    const hudContainer = document.getElementById('hud-overlay')!;

    this.sceneManager = new SceneManager(viewportContainer);
    this.hud = new HUD(hudContainer);

    this.hud.setOnSelectVault((vaultId) => {
      this.loadVault(vaultId);
    });

    // Register audio unlock on first user click or touch
    const unlockAudio = () => {
      sound.resume();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // Register main scene update
    this.sceneManager.registerUpdateCallback((dt) => {
      this.update(dt);
    });

    // Load initial vault
    this.loadVault(this.currentVaultId);

    // Register service worker for offline capability
    this.registerServiceWorker();
  }

  public loadVault(id: string): void {
    if (this.activeVault) {
      this.activeVault.destroy();
      this.activeVault = null;
    }

    inventory.clear();
    this.currentVaultId = id;
    this.sceneManager.cameraController.resetToOverview();

    if (id === 'vault-2') {
      this.activeVault = new Vault2ObsidianMonolith(this.sceneManager);
    } else if (id === 'vault-3') {
      this.activeVault = new Vault3ChronoDynamo(this.sceneManager);
    } else {
      this.activeVault = new Vault1BrassCrypt(this.sceneManager);
    }

    this.hud.bindVault(this.activeVault);
  }

  private update(dt: number): void {
    if (this.activeVault) {
      this.activeVault.update(dt);
      this.hud.updateStats(this.activeVault.elapsedTime, this.activeVault.moveCount);
    }
  }

  private registerServiceWorker(): void {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.debug('ServiceWorker registration skipped or failed:', err);
        });
      });
    }
  }
}

// Bootstrap application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new KineticVaultApp();
});
