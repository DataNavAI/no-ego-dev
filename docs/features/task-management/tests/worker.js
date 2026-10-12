import { createTaskService } from '../../../../src/tasks.js';
import { openNedDatabase } from '../../../../src/database.js';
const [mode, databaseUrl, project, actor, id] = process.argv.slice(2);
if (mode === 'claim') {
  const s = await createTaskService({ databaseUrl, project, actor, env: {} });
  try {
    console.log(JSON.stringify(await s.startTask(id)));
  } catch (e) {
    console.error(e.code);
    process.exitCode = 2;
  } finally {
    s.close();
  }
} else if (mode === 'crash') {
  const db = openNedDatabase({ databaseUrl, env: {} });
  db.connection.exec('BEGIN IMMEDIATE');
  db.connection.prepare("UPDATE ned_work_items SET title='UNCOMMITTED' WHERE id=?").run(id);
  db.connection
    .prepare("INSERT INTO ned_feature_data(namespace,key,value) VALUES('crash','partial','true')")
    .run();
  console.log('transaction-open');
  setInterval(() => {}, 1000);
}
