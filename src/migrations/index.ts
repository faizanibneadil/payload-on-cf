import * as migration_20260918_151419_initial from './20260918_151419_initial';
import * as migration_20261007_053028_initial from './20261007_053028_initial';
import * as migration_20261007_120000_playgrounds from './20261007_120000_playgrounds';

export const migrations = [
  {
    up: migration_20260918_151419_initial.up,
    down: migration_20260918_151419_initial.down,
    name: '20260918_151419_initial',
  },
  {
    up: migration_20261007_053028_initial.up,
    down: migration_20261007_053028_initial.down,
    name: '20261007_053028_initial',
  },
  {
    up: migration_20261007_120000_playgrounds.up,
    down: migration_20261007_120000_playgrounds.down,
    name: '20261007_120000_playgrounds',
  },
];
