export interface JournalEntry {
  id: string;
  vaultId: string;
  title: string;
  sketchSvg: string;
  lore: string;
  clue: string;
}

export interface PuzzleHint {
  stage: number;
  level1: string; // Subtle observation
  level2: string; // Mechanical guidance
  level3: string; // Direct solution
}

export interface VaultMetadata {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  difficulty: 'Novice' | 'Master' | 'Artisan';
  description: string;
  totalStages: number;
  estimatedMinutes: number;
}

export interface PlayerProgress {
  unlockedVaults: string[];
  completedVaults: string[];
  vaultScores: Record<string, {
    completed: boolean;
    bestTimeSeconds: number;
    moveCount: number;
    stars: number;
  }>;
  settings: {
    sfxVolume: number;
    musicVolume: number;
    hapticsEnabled: boolean;
    sensitivity: number;
    invertPitch: boolean;
    graphicsQuality: 'low' | 'medium' | 'high';
  };
}
