import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`playground_files\` RENAME COLUMN "path" TO "name";`)
  // Purani flat paths (e.g. "/a/b.js") ko valid file names me convert karo (folders ab parent se bante hain)
  await db.run(
    sql`UPDATE \`playground_files\` SET \`name\` = replace(ltrim(\`name\`, '/'), '/', '-');`,
  )
  await db.run(sql`CREATE TABLE \`playground_files_breadcrumbs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`doc_id\` integer,
  	\`url\` text,
  	\`label\` text,
  	FOREIGN KEY (\`doc_id\`) REFERENCES \`playground_files\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`playground_files\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`playground_files_breadcrumbs_order_idx\` ON \`playground_files_breadcrumbs\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`playground_files_breadcrumbs_parent_id_idx\` ON \`playground_files_breadcrumbs\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`playground_files_breadcrumbs_doc_idx\` ON \`playground_files_breadcrumbs\` (\`doc_id\`);`,
  )
  await db.run(sql`DROP INDEX \`playground_files_path_idx\`;`)
  await db.run(sql`ALTER TABLE \`playground_files\` ADD \`type\` text DEFAULT 'file' NOT NULL;`)
  await db.run(
    sql`ALTER TABLE \`playground_files\` ADD \`parent_id\` integer REFERENCES playground_files(id);`,
  )
  await db.run(sql`CREATE INDEX \`playground_files_name_idx\` ON \`playground_files\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`playground_files_type_idx\` ON \`playground_files\` (\`type\`);`)
  await db.run(
    sql`CREATE INDEX \`playground_files_parent_idx\` ON \`playground_files\` (\`parent_id\`);`,
  )
  await db.run(sql`DROP INDEX \`playgrounds_title_idx\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`playground_files_breadcrumbs\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_playground_files\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`playground_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`content\` text,
  	\`size\` numeric DEFAULT 0 NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`playground_id\`) REFERENCES \`playgrounds\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_playground_files\`("id", "playground_id", "path", "content", "size", "updated_at", "created_at") SELECT "id", "playground_id", "path", "content", "size", "updated_at", "created_at" FROM \`playground_files\`;`,
  )
  await db.run(sql`DROP TABLE \`playground_files\`;`)
  await db.run(sql`ALTER TABLE \`__new_playground_files\` RENAME TO \`playground_files\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(
    sql`CREATE INDEX \`playground_files_playground_idx\` ON \`playground_files\` (\`playground_id\`);`,
  )
  await db.run(sql`CREATE INDEX \`playground_files_path_idx\` ON \`playground_files\` (\`path\`);`)
  await db.run(
    sql`CREATE INDEX \`playground_files_updated_at_idx\` ON \`playground_files\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`playground_files_created_at_idx\` ON \`playground_files\` (\`created_at\`);`,
  )
  await db.run(sql`CREATE UNIQUE INDEX \`playgrounds_title_idx\` ON \`playgrounds\` (\`title\`);`)
}
