import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`playground_files_breadcrumbs\`;`)
  await db.run(sql`DROP TABLE \`playground_files\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`playgrounds_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`playgrounds_id\`) REFERENCES \`playgrounds\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "playgrounds_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "playgrounds_id" FROM \`payload_locked_documents_rels\`;`,
  )
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(
    sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`,
  )
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_playgrounds_id_idx\` ON \`payload_locked_documents_rels\` (\`playgrounds_id\`);`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
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
  await db.run(sql`CREATE TABLE \`playground_files\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`playground_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`type\` text DEFAULT 'file' NOT NULL,
  	\`content\` text,
  	\`size\` numeric DEFAULT 0 NOT NULL,
  	\`parent_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`playground_id\`) REFERENCES \`playgrounds\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`playground_files\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`CREATE INDEX \`playground_files_playground_idx\` ON \`playground_files\` (\`playground_id\`);`,
  )
  await db.run(sql`CREATE INDEX \`playground_files_name_idx\` ON \`playground_files\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`playground_files_type_idx\` ON \`playground_files\` (\`type\`);`)
  await db.run(
    sql`CREATE INDEX \`playground_files_parent_idx\` ON \`playground_files\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`playground_files_updated_at_idx\` ON \`playground_files\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`playground_files_created_at_idx\` ON \`playground_files\` (\`created_at\`);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`playground_files_id\` integer REFERENCES playground_files(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_playground_files_id_idx\` ON \`payload_locked_documents_rels\` (\`playground_files_id\`);`,
  )
}
