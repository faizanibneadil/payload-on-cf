import * as migration_20260918_151419_initial from './20260918_151419_initial';
import * as migration_20261007_053028_initial from './20261007_053028_initial';
import * as migration_20261008_063921_remove_blogs from './20261008_063921_remove_blogs';
import * as migration_20261008_064007_add_playgrounds_and_users from './20261008_064007_add_playgrounds_and_users';

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
    up: migration_20261008_063921_remove_blogs.up,
    down: migration_20261008_063921_remove_blogs.down,
    name: '20261008_063921_remove_blogs',
  },
  {
    up: migration_20261008_064007_add_playgrounds_and_users.up,
    down: migration_20261008_064007_add_playgrounds_and_users.down,
    name: '20261008_064007_add_playgrounds_and_users'
  },
];
