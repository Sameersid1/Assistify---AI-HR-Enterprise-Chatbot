/**
 * Read-only diagnostic: report which database MONGO_URI points at and what is
 * in it. Touches nothing. Useful when local and deployed disagree about data.
 *
 *   npm run inspect:db
 */
import mongoose from 'mongoose';
import { env } from '../config/env';

async function main(): Promise<void> {
  const host = env.MONGO_URI.replace(/^mongodb(\+srv)?:\/\/[^@]*@/, '').split(/[/?]/)[0];
  // eslint-disable-next-line no-console
  console.log(`\nhost     : ${host}`);

  await mongoose.connect(env.MONGO_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error('no database handle');

  /* eslint-disable no-console */
  console.log(`database : ${db.databaseName}\n`);

  const cols = await db.listCollections().toArray();
  if (cols.length === 0) {
    console.log('  (no collections — this database is empty)');
  } else {
    for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
      const n = await db.collection(c.name).countDocuments();
      console.log(`  ${c.name.padEnd(22)} ${String(n).padStart(4)} docs`);
    }
  }

  const users = await db.collection('users').find({}, { projection: { email: 1, role: 1 } }).toArray();
  if (users.length) {
    console.log('\n  users:');
    for (const u of users) console.log(`    ${String(u.email).padEnd(24)} ${u.role}`);
  }

  try {
    const dbs = await mongoose.connection.getClient().db().admin().listDatabases();
    console.log('\n  databases on this cluster:');
    for (const d of dbs.databases) console.log(`    ${d.name}`);
  } catch {
    console.log('\n  (cannot list databases — user lacks admin rights, which is fine)');
  }
  /* eslint-enable no-console */

  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('inspect failed:', err);
  process.exit(1);
});
