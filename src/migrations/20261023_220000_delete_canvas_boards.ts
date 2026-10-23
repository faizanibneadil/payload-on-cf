import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Data migration (schema change nahi). Board ab ek Lexical document he (`data.doc`). Purane infinite
 * canvas wale boards (`data.canvas`, ya khali/toota data) ki koi support nahi — owner ke faisle se
 * woh poori row samet delete hote hain. Locked-documents ki rows FK cascade se khud hat jati hain.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`DELETE FROM \`boards\`
    WHERE \`data\` IS NULL
    OR NOT json_valid(\`data\`)
    OR json_type(\`data\`, '$.doc') IS NOT 'object';`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Delete hue boards wapas nahi aa sakte
}
