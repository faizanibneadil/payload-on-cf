import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`playgrounds\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`title\` text NOT NULL,
	\`slug\` text NOT NULL,
	\`owner_id\` integer NOT NULL REFERENCES users(id),
	\`theory\` text,
	\`files\` text,
	\`forked_from_id\` integer REFERENCES playgrounds(id),
	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`playgrounds_title_idx\` ON \`playgrounds\` (\`title\`);`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`playgrounds_slug_idx\` ON \`playgrounds\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`playgrounds_owner_idx\` ON \`playgrounds\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`playgrounds_updated_at_idx\` ON \`playgrounds\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`playgrounds_created_at_idx\` ON \`playgrounds\` (\`created_at\`);`)

  try {
    await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`username\` text;`)
  } catch {}
  try {
    await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`role\` text DEFAULT 'user';`)
  } catch {}
  try {
    await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`users_username_idx\` ON \`users\` (\`username\`);`)
  } catch {}
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS \`playgrounds\`;`)
}
