import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Data migration (schema change nahi). Purane users `role = 'user'` ke saath migrate hue the,
 * is liye /admin par koi bhi admin nahi tha. Agar koi admin maujood nahi to sab se purana
 * account (pehla user) admin ban jata hai. Admin pehle se ho to kuch nahi badalta.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`UPDATE \`users\` SET \`role\` = 'admin'
    WHERE \`id\` = (SELECT MIN(\`id\`) FROM \`users\`)
    AND NOT EXISTS (SELECT 1 FROM \`users\` WHERE \`role\` = 'admin');`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Data migration reverse nahi hoti (kaun pehle se admin tha ye yaad nahi rehta)
}
