import * as migration_20260918_151419_initial from './20260918_151419_initial'
import * as migration_20261007_053028_initial from './20261007_053028_initial'
import * as migration_20261008_063921_remove_blogs from './20261008_063921_remove_blogs'
import * as migration_20261008_064007_add_playgrounds_and_users from './20261008_064007_add_playgrounds_and_users'
import * as migration_20261009_081818_drop_files_column from './20261009_081818_drop_files_column'
import * as migration_20261014_055711_nested_files_and_access from './20261014_055711_nested_files_and_access'
import * as migration_20261015_060000_promote_first_user_to_admin from './20261015_060000_promote_first_user_to_admin'
import * as migration_20261021_193036_drop_playground_files from './20261021_193036_drop_playground_files'

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
    name: '20261008_064007_add_playgrounds_and_users',
  },
  {
    up: migration_20261009_081818_drop_files_column.up,
    down: migration_20261009_081818_drop_files_column.down,
    name: '20261009_081818_drop_files_column',
  },
  {
    up: migration_20261014_055711_nested_files_and_access.up,
    down: migration_20261014_055711_nested_files_and_access.down,
    name: '20261014_055711_nested_files_and_access',
  },
  {
    up: migration_20261015_060000_promote_first_user_to_admin.up,
    down: migration_20261015_060000_promote_first_user_to_admin.down,
    name: '20261015_060000_promote_first_user_to_admin',
  },
  {
    up: migration_20261021_193036_drop_playground_files.up,
    down: migration_20261021_193036_drop_playground_files.down,
    name: '20261021_193036_drop_playground_files',
  },
]
