import type { PlayerProgress } from './types';
import { sound } from '../engine/audio/sound_engine';
import { haptics } from '../engine/haptics/haptics_manager';

const STORAGE_KEY = 'kinetic_vault_save_v1';

const DEFAULT_PROGRESS: PlayerProgress = {
  unlockedVaults: ['vault-1'],
  completedVaults: [],
  vaultScores: {},
  settings: {
    sfxVolume: 0.8,
    musicVolume: 0.4,
    hapticsEnabled: true,
    sensitivity: 1.0,
    invertPitch: false,
    graphicsQuality: 'high'
  }
};

export class SaveManager {
  private progress: PlayerProgress;

  constructor() {
    this.progress = this.load();
    this.applySettings();
  }

  public getProgress(): PlayerProgress {
    return this.progress;
  }

  public isVaultUnlocked(id: string): boolean {
    return this.progress.unlockedVaults.includes(id);
  }

  public isVaultCompleted(id: string): boolean {
    return this.progress.completedVaults.includes(id);
  }

  public unlockVault(id: string): void {
    if (!this.progress.unlockedVaults.includes(id)) {
      this.progress.unlockedVaults.push(id);
      this.save();
    }
  }

  public recordCompletion(vaultId: string, timeSeconds: number, moves: number, nextVaultId?: string): void {
    if (!this.progress.completedVaults.includes(vaultId)) {
      this.progress.completedVaults.push(vaultId);
    }

    if (nextVaultId && !this.progress.unlockedVaults.includes(nextVaultId)) {
      this.progress.unlockedVaults.push(nextVaultId);
    }

    const currentScore = this.progress.vaultScores[vaultId];
    const bestTime = currentScore ? Math.min(currentScore.bestTimeSeconds, timeSeconds) : timeSeconds;
    const bestMoves = currentScore ? Math.min(currentScore.moveCount, moves) : moves;
    
    // Star rating: 3 stars if fast and efficient
    let stars = 3;
    if (timeSeconds > 240 || moves > 35) stars = 2;
    if (timeSeconds > 420 || moves > 60) stars = 1;

    this.progress.vaultScores[vaultId] = {
      completed: true,
      bestTimeSeconds: bestTime,
      moveCount: bestMoves,
      stars: Math.max(currentScore ? currentScore.stars : 0, stars)
    };

    this.save();
  }

  public updateSettings(partial: Partial<PlayerProgress['settings']>): void {
    this.progress.settings = { ...this.progress.settings, ...partial };
    this.applySettings();
    this.save();
  }

  private applySettings(): void {
    sound.setSfxVolume(this.progress.settings.sfxVolume);
    sound.setMusicVolume(this.progress.settings.musicVolume);
    haptics.setEnabled(this.progress.settings.hapticsEnabled);
  }

  public resetProgress(): void {
    this.progress = JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
    this.applySettings();
    this.save();
  }

  private load(): PlayerProgress {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_PROGRESS,
          ...parsed,
          settings: { ...DEFAULT_PROGRESS.settings, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to parse save file from storage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('Failed to persist progress to storage:', e);
    }
  }
}

export const saveManager = new SaveManager();
