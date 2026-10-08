import confetti from 'canvas-confetti';
import { VaultBase } from '../game/vault_base';
import { saveManager } from '../game/save_manager';
import { inventory } from '../engine/inventory/inventory_manager';
import { Inspector3D } from '../engine/inventory/inspector_3d';
import { sound } from '../engine/audio/sound_engine';
import type { VaultMetadata } from '../game/types';

export class HUD {
  private container: HTMLElement;
  private currentVault: VaultBase | null = null;
  private inspector: Inspector3D;
  private onSelectVaultCallback?: (vaultId: string) => void;

  private currentHintTier: number = 1;

  constructor(container: HTMLElement) {
    this.container = container;
    this.inspector = new Inspector3D();
    this.buildUI();
    this.setupInventoryListener();
  }

  public setOnSelectVault(cb: (vaultId: string) => void): void {
    this.onSelectVaultCallback = cb;
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <!-- TOP HUD -->
      <header class="hud-top-bar">
        <div class="hud-left">
          <button class="hud-icon-btn" id="btnVaultSelect" title="Vaults">
            <svg viewBox="0 0 24 24" class="svg-icon"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
          </button>
          <div class="hud-title-group">
            <h1 class="hud-vault-title" id="hudVaultTitle">Kinetic Vault</h1>
            <span class="hud-vault-stage" id="hudStageIndicator">STAGE 1/3</span>
          </div>
        </div>

        <div class="hud-stats">
          <div class="hud-stat-pill">
            <span class="hud-stat-label">TIME</span>
            <span class="hud-stat-val" id="hudTimer">00:00</span>
          </div>
          <div class="hud-stat-pill">
            <span class="hud-stat-label">MOVES</span>
            <span class="hud-stat-val" id="hudMoves">0</span>
          </div>
        </div>

        <div class="hud-right">
          <button class="hud-icon-btn" id="btnJournal" title="Journal">
            <svg viewBox="0 0 24 24" class="svg-icon"><path fill="currentColor" d="M18 2H6c-1.2 0-2 .8-2 2v16c0 1.2.8 2 2 2h12c1.2 0 2-.8 2-2V4c0-1.2-.8-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
          </button>
          <button class="hud-icon-btn" id="btnHint" title="Hints">
            <svg viewBox="0 0 24 24" class="svg-icon"><path fill="currentColor" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>
          </button>
          <button class="hud-icon-btn" id="btnSettings" title="Settings">
            <svg viewBox="0 0 24 24" class="svg-icon"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </button>
        </div>
      </header>

      <!-- ZOOM OUT / RESET FOCUS BUTTON -->
      <button class="hud-unfocus-btn" id="btnUnfocus" style="display: none;">
        <svg viewBox="0 0 24 24" class="svg-icon-sm"><path fill="currentColor" d="M19 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H19v-2z"/></svg>
        Overview
      </button>

      <!-- INVENTORY DOCK -->
      <div class="hud-inventory-bar" id="hudInventoryDock"></div>

      <!-- MODALS CONTAINER -->
      <div class="modal-backdrop" id="modalBackdrop" style="display: none;">
        <!-- Vault Selector Modal -->
        <div class="modal-box" id="modalVaultSelect" style="display: none;">
          <div class="modal-header">
            <h2 class="modal-title">CHOOSE VAULT</h2>
            <button class="modal-close-btn" data-close>✕</button>
          </div>
          <div class="modal-body" id="vaultListContainer"></div>
        </div>

        <!-- Journal Modal -->
        <div class="modal-box modal-journal" id="modalJournal" style="display: none;">
          <div class="modal-header">
            <h2 class="modal-title">ARCHIVIST NOTEBOOK</h2>
            <button class="modal-close-btn" data-close>✕</button>
          </div>
          <div class="modal-body" id="journalContent"></div>
        </div>

        <!-- Hint Modal -->
        <div class="modal-box" id="modalHint" style="display: none;">
          <div class="modal-header">
            <h2 class="modal-title">MECHANICAL HINTS</h2>
            <button class="modal-close-btn" data-close>✕</button>
          </div>
          <div class="modal-body" id="hintContent"></div>
        </div>

        <!-- Settings Modal -->
        <div class="modal-box" id="modalSettings" style="display: none;">
          <div class="modal-header">
            <h2 class="modal-title">SETTINGS</h2>
            <button class="modal-close-btn" data-close>✕</button>
          </div>
          <div class="modal-body">
            <div class="setting-row">
              <label>Sound SFX</label>
              <input type="range" id="sliderSfx" min="0" max="1" step="0.05" value="0.8" />
            </div>
            <div class="setting-row">
              <label>Ambient Clockwork</label>
              <input type="range" id="sliderMusic" min="0" max="1" step="0.05" value="0.4" />
            </div>
            <div class="setting-row">
              <label>Haptic Feedback</label>
              <input type="checkbox" id="checkHaptics" checked />
            </div>
            <div class="setting-row">
              <label>Camera Sensitivity</label>
              <input type="range" id="sliderSensitivity" min="0.5" max="2.0" step="0.1" value="1.0" />
            </div>
            <div class="setting-row">
              <label>Invert Pitch</label>
              <input type="checkbox" id="checkInvertPitch" />
            </div>
            <div class="setting-row btn-row">
              <button class="hud-action-btn danger" id="btnResetProgress">Reset Save Data</button>
            </div>
          </div>
        </div>

        <!-- Victory Modal -->
        <div class="modal-box modal-victory" id="modalVictory" style="display: none;">
          <div class="victory-banner">VAULT UNLOCKED</div>
          <div class="victory-stars" id="victoryStars">★★★</div>
          <div class="victory-stats">
            <div>TIME: <span id="victoryTime">01:24</span></div>
            <div>MOVES: <span id="victoryMoves">18</span></div>
          </div>
          <button class="hud-action-btn primary" id="btnNextVault">CONTINUE EXPEDITION</button>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Open Modals
    this.container.querySelector('#btnVaultSelect')?.addEventListener('click', () => {
      this.openModal('modalVaultSelect');
      this.renderVaultSelect();
    });

    this.container.querySelector('#btnJournal')?.addEventListener('click', () => {
      this.openModal('modalJournal');
      this.renderJournal();
    });

    this.container.querySelector('#btnHint')?.addEventListener('click', () => {
      this.openModal('modalHint');
      this.renderHints();
    });

    this.container.querySelector('#btnSettings')?.addEventListener('click', () => {
      this.openModal('modalSettings');
      this.loadSettingsUI();
    });

    // Close Modals
    this.container.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });

    this.container.querySelector('#modalBackdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    // Unfocus button
    this.container.querySelector('#btnUnfocus')?.addEventListener('click', () => {
      if (this.currentVault) {
        this.currentVault.sceneManager.cameraController.resetToOverview();
        const btn = this.container.querySelector('#btnUnfocus') as HTMLElement;
        if (btn) btn.style.display = 'none';
        sound.playTick(0.9);
      }
    });

    // Settings Controls
    const sfxSlider = this.container.querySelector('#sliderSfx') as HTMLInputElement;
    sfxSlider?.addEventListener('input', () => {
      saveManager.updateSettings({ sfxVolume: parseFloat(sfxSlider.value) });
    });

    const musicSlider = this.container.querySelector('#sliderMusic') as HTMLInputElement;
    musicSlider?.addEventListener('input', () => {
      saveManager.updateSettings({ musicVolume: parseFloat(musicSlider.value) });
    });

    const hapticsCheck = this.container.querySelector('#checkHaptics') as HTMLInputElement;
    hapticsCheck?.addEventListener('change', () => {
      saveManager.updateSettings({ hapticsEnabled: hapticsCheck.checked });
    });

    const sensSlider = this.container.querySelector('#sliderSensitivity') as HTMLInputElement;
    sensSlider?.addEventListener('input', () => {
      const val = parseFloat(sensSlider.value);
      saveManager.updateSettings({ sensitivity: val });
      if (this.currentVault) {
        this.currentVault.sceneManager.cameraController.sensitivity = val;
      }
    });

    const invertCheck = this.container.querySelector('#checkInvertPitch') as HTMLInputElement;
    invertCheck?.addEventListener('change', () => {
      saveManager.updateSettings({ invertPitch: invertCheck.checked });
      if (this.currentVault) {
        this.currentVault.sceneManager.cameraController.invertPitch = invertCheck.checked;
      }
    });

    this.container.querySelector('#btnResetProgress')?.addEventListener('click', () => {
      if (confirm('Reset all vault progress and records?')) {
        saveManager.resetProgress();
        this.closeModal();
        if (this.onSelectVaultCallback) this.onSelectVaultCallback('vault-1');
      }
    });

    // Next Vault button
    this.container.querySelector('#btnNextVault')?.addEventListener('click', () => {
      this.closeModal();
      if (!this.currentVault) return;
      const nextId = this.currentVault.metadata.number === 1 ? 'vault-2' : (this.currentVault.metadata.number === 2 ? 'vault-3' : 'vault-1');
      if (this.onSelectVaultCallback) {
        this.onSelectVaultCallback(nextId);
      }
    });
  }

  public bindVault(vault: VaultBase): void {
    this.currentVault = vault;
    const titleEl = this.container.querySelector('#hudVaultTitle') as HTMLElement;
    if (titleEl) titleEl.textContent = vault.metadata.title;

    this.updateStage(vault.currentStage);

    vault.onStageAdvance = (stg) => {
      this.updateStage(stg);
    };

    vault.onVaultSolved = () => {
      this.showVictoryModal();
    };
  }

  public updateStats(timeSeconds: number, moves: number): void {
    const timerEl = this.container.querySelector('#hudTimer');
    const movesEl = this.container.querySelector('#hudMoves');

    if (timerEl) {
      const m = Math.floor(timeSeconds / 60).toString().padStart(2, '0');
      const s = Math.floor(timeSeconds % 60).toString().padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
    }

    if (movesEl) {
      movesEl.textContent = moves.toString();
    }

    // Toggle overview button based on focus state
    if (this.currentVault) {
      const unfocusBtn = this.container.querySelector('#btnUnfocus') as HTMLElement;
      if (unfocusBtn) {
        unfocusBtn.style.display = this.currentVault.sceneManager.cameraController.getIsFocusMode() ? 'flex' : 'none';
      }
    }
  }

  private updateStage(stage: number): void {
    const stageEl = this.container.querySelector('#hudStageIndicator');
    if (stageEl && this.currentVault) {
      stageEl.textContent = `STAGE ${stage}/${this.currentVault.metadata.totalStages}`;
    }
  }

  private setupInventoryListener(): void {
    inventory.subscribe(() => {
      this.renderInventoryDock();
    });
  }

  private renderInventoryDock(): void {
    const dock = this.container.querySelector('#hudInventoryDock') as HTMLElement;
    if (!dock) return;

    dock.innerHTML = '';
    const items = inventory.getAllItems();
    const selected = inventory.getSelectedItem();

    for (const item of items) {
      const slot = document.createElement('div');
      slot.className = `inv-slot ${selected?.id === item.id ? 'active' : ''}`;
      slot.innerHTML = item.iconSvg;
      slot.title = item.name;

      slot.addEventListener('click', () => {
        inventory.selectItem(item.id);
        this.inspector.open(item);
      });

      dock.appendChild(slot);
    }
  }

  private openModal(id: string): void {
    this.closeModal();
    const backdrop = this.container.querySelector('#modalBackdrop') as HTMLElement;
    const modal = this.container.querySelector(`#${id}`) as HTMLElement;

    if (backdrop && modal) {
      backdrop.style.display = 'flex';
      modal.style.display = 'block';
      sound.playTick(1.1);
    }
  }

  private closeModal(): void {
    const backdrop = this.container.querySelector('#modalBackdrop') as HTMLElement;
    if (backdrop) backdrop.style.display = 'none';

    this.container.querySelectorAll('.modal-box').forEach(box => {
      (box as HTMLElement).style.display = 'none';
    });
  }

  private renderVaultSelect(): void {
    const list = this.container.querySelector('#vaultListContainer') as HTMLElement;
    if (!list) return;

    const vaults: VaultMetadata[] = [
      {
        id: 'vault-1',
        number: 1,
        title: 'The Brass Crypt',
        subtitle: "The Mechanist's Strongbox",
        difficulty: 'Novice',
        description: 'Antique clockwork strongbox with horological dials and secret drawers.',
        totalStages: 3,
        estimatedMinutes: 5
      },
      {
        id: 'vault-2',
        number: 2,
        title: 'The Obsidian Reliquary',
        subtitle: 'The Enigma Monolith',
        difficulty: 'Master',
        description: 'Dark volcanic monolith featuring cryptex locks and movable gear linkages.',
        totalStages: 3,
        estimatedMinutes: 8
      },
      {
        id: 'vault-3',
        number: 3,
        title: 'The Chrono Dynamo',
        subtitle: 'The Steampunk Resonator',
        difficulty: 'Artisan',
        description: 'Victorian cylindrical dynamo with steam valves and laser prisms.',
        totalStages: 3,
        estimatedMinutes: 10
      }
    ];

    list.innerHTML = '';
    const progress = saveManager.getProgress();

    for (const v of vaults) {
      const isUnlocked = saveManager.isVaultUnlocked(v.id);
      const isDone = saveManager.isVaultCompleted(v.id);
      const score = progress.vaultScores[v.id];

      const card = document.createElement('div');
      card.className = `vault-card ${isUnlocked ? '' : 'locked'}`;

      let starsStr = '';
      if (score && score.stars) {
        starsStr = '★'.repeat(score.stars) + '☆'.repeat(3 - score.stars);
      }

      card.innerHTML = `
        <div class="vault-card-num">VAULT ${v.number}</div>
        <div class="vault-card-info">
          <h3>${v.title}</h3>
          <p class="vault-sub">${v.subtitle} • <em>${v.difficulty}</em></p>
          <p class="vault-card-desc">${v.description}</p>
          ${isDone ? `<div class="vault-stars-badge">${starsStr} Best: ${Math.floor(score.bestTimeSeconds / 60)}m ${score.bestTimeSeconds % 60}s</div>` : ''}
        </div>
        <button class="vault-open-btn ${isUnlocked ? 'primary' : 'disabled'}">
          ${isUnlocked ? (isDone ? 'REPLAY' : 'ENTER') : 'LOCKED'}
        </button>
      `;

      if (isUnlocked) {
        card.querySelector('.vault-open-btn')?.addEventListener('click', () => {
          this.closeModal();
          if (this.onSelectVaultCallback) this.onSelectVaultCallback(v.id);
        });
      }

      list.appendChild(card);
    }
  }

  private renderJournal(): void {
    const content = this.container.querySelector('#journalContent') as HTMLElement;
    if (!content || !this.currentVault) return;

    content.innerHTML = '';
    for (const entry of this.currentVault.journal) {
      const page = document.createElement('div');
      page.className = 'journal-page';
      page.innerHTML = `
        <h3>${entry.title}</h3>
        <p class="journal-lore">${entry.lore}</p>
        <div class="journal-sketch-wrapper">${entry.sketchSvg}</div>
        <div class="journal-clue-box">
          <strong>Observation:</strong> ${entry.clue}
        </div>
      `;
      content.appendChild(page);
    }
  }

  private renderHints(): void {
    const content = this.container.querySelector('#hintContent') as HTMLElement;
    if (!content || !this.currentVault) return;

    const currentHint = this.currentVault.hints.find(h => h.stage === this.currentVault!.currentStage);
    if (!currentHint) {
      content.innerHTML = '<p class="hint-text">No further clues required for this mechanism.</p>';
      return;
    }

    content.innerHTML = `
      <div class="hint-tier-box">
        <span class="hint-tier-badge">TIER I: SUBTLE WHISPER</span>
        <p class="hint-text">${currentHint.level1}</p>
      </div>

      <div class="hint-tier-box">
        <span class="hint-tier-badge">TIER II: MECHANICAL GUIDANCE</span>
        <p class="hint-text" id="hintTier2Text">${this.currentHintTier >= 2 ? currentHint.level2 : '••••••••••••••••••••••••••••••••'}</p>
        ${this.currentHintTier < 2 ? `<button class="hud-action-btn sm" id="btnRevealTier2">Reveal Guidance</button>` : ''}
      </div>

      <div class="hint-tier-box">
        <span class="hint-tier-badge">TIER III: DIRECT SOLUTION</span>
        <p class="hint-text" id="hintTier3Text">${this.currentHintTier >= 3 ? currentHint.level3 : '••••••••••••••••••••••••••••••••'}</p>
        ${this.currentHintTier < 3 ? `<button class="hud-action-btn sm" id="btnRevealTier3">Reveal Solution</button>` : ''}
      </div>
    `;

    content.querySelector('#btnRevealTier2')?.addEventListener('click', () => {
      this.currentHintTier = 2;
      this.renderHints();
      sound.playTick(1.2);
    });

    content.querySelector('#btnRevealTier3')?.addEventListener('click', () => {
      this.currentHintTier = 3;
      this.renderHints();
      sound.playTick(1.4);
    });
  }

  private loadSettingsUI(): void {
    const s = saveManager.getProgress().settings;
    const sfxSlider = this.container.querySelector('#sliderSfx') as HTMLInputElement;
    const musicSlider = this.container.querySelector('#sliderMusic') as HTMLInputElement;
    const hapticsCheck = this.container.querySelector('#checkHaptics') as HTMLInputElement;
    const sensSlider = this.container.querySelector('#sliderSensitivity') as HTMLInputElement;
    const invertCheck = this.container.querySelector('#checkInvertPitch') as HTMLInputElement;

    if (sfxSlider) sfxSlider.value = s.sfxVolume.toString();
    if (musicSlider) musicSlider.value = s.musicVolume.toString();
    if (hapticsCheck) hapticsCheck.checked = s.hapticsEnabled;
    if (sensSlider) sensSlider.value = s.sensitivity.toString();
    if (invertCheck) invertCheck.checked = s.invertPitch;
  }

  private showVictoryModal(): void {
    if (!this.currentVault) return;

    const timeSec = Math.floor(this.currentVault.elapsedTime);
    const moves = this.currentVault.moveCount;
    const nextVaultId = this.currentVault.metadata.number === 1 ? 'vault-2' : (this.currentVault.metadata.number === 2 ? 'vault-3' : undefined);

    saveManager.recordCompletion(this.currentVault.metadata.id, timeSec, moves, nextVaultId);

    // Confetti particles
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffe082', '#d4af37', '#00f0ff', '#ffffff']
    });

    const m = Math.floor(timeSec / 60).toString().padStart(2, '0');
    const s = Math.floor(timeSec % 60).toString().padStart(2, '0');

    const score = saveManager.getProgress().vaultScores[this.currentVault.metadata.id];
    const stars = score ? score.stars : 3;

    const starsEl = this.container.querySelector('#victoryStars');
    const timeEl = this.container.querySelector('#victoryTime');
    const movesEl = this.container.querySelector('#victoryMoves');

    if (starsEl) starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    if (timeEl) timeEl.textContent = `${m}:${s}`;
    if (movesEl) movesEl.textContent = moves.toString();

    this.openModal('modalVictory');
  }
}
