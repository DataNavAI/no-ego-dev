import Database from 'better-sqlite3';
import { mkdirSync, chmodSync, statSync, accessSync, constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

export class DatabaseError extends Error {
  constructor(
    code = 'database_failed',
    message = 'NED database operation failed. Check configuration, file access, and database availability.',
  ) {
    super(message);
    this.code = code;
  }
}

export function resolveDatabasePath({ databaseUrl, env = process.env, home = os.homedir() } = {}) {
  const location = databaseUrl ?? env.NED_DATABASE_URL ?? path.join(home, '.ned', 'ned.sqlite');
  if (typeof location !== 'string' || !location.trim())
    throw new DatabaseError('invalid_database', 'Configure a SQLite file path or local file: URL.');
  if (location === ':memory:') return location;
  try {
    if (location.startsWith('file:')) {
      const url = new URL(location);
      if (url.search || url.hash || (url.host && url.host !== 'localhost')) throw new Error();
      return fileURLToPath(url);
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(location) && !/^[A-Za-z]:[\\/]/.test(location))
      throw new Error();
    return path.resolve(location);
  } catch {
    throw new DatabaseError(
      'invalid_database',
      'Configure a SQLite file path or local file: URL; remote database engines are not supported.',
    );
  }
}

const schema = `
CREATE TABLE IF NOT EXISTS ned_projects (id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, initialized_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ned_feature_data (namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(namespace,key));
CREATE TABLE IF NOT EXISTS ned_work_items (
 project_id TEXT NOT NULL REFERENCES ned_projects(id), id TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('goal','subgoal','task','issue')),
 title TEXT NOT NULL, description TEXT NOT NULL, priority INTEGER NOT NULL CHECK(priority BETWEEN 0 AND 4),
 state TEXT NOT NULL CHECK(state IN ('open','working','done')), parent_id TEXT, discovered_from TEXT,
 assignee TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, blocker TEXT,
 PRIMARY KEY(project_id,id),
 FOREIGN KEY(project_id,parent_id) REFERENCES ned_work_items(project_id,id),
 FOREIGN KEY(project_id,discovered_from) REFERENCES ned_work_items(project_id,id),
 CHECK(parent_id IS NULL OR parent_id<>id)
);
CREATE TABLE IF NOT EXISTS ned_dependencies (
 project_id TEXT NOT NULL, item_id TEXT NOT NULL, depends_on_id TEXT NOT NULL,
 PRIMARY KEY(project_id,item_id,depends_on_id), CHECK(item_id<>depends_on_id),
 FOREIGN KEY(project_id,item_id) REFERENCES ned_work_items(project_id,id),
 FOREIGN KEY(project_id,depends_on_id) REFERENCES ned_work_items(project_id,id)
);
CREATE TABLE IF NOT EXISTS ned_task_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
 project_id TEXT NOT NULL, item_id TEXT NOT NULL, type TEXT NOT NULL, actor TEXT NOT NULL,
 previous_value TEXT, value TEXT NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(project_id,item_id) REFERENCES ned_work_items(project_id,id)
);
CREATE INDEX IF NOT EXISTS ned_events_item ON ned_task_events(project_id,item_id,sequence);
`;

export function openNedDatabase(options = {}) {
  const filename = resolveDatabasePath(options);
  let connection;
  try {
    if (filename !== ':memory:')
      mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    connection = new Database(filename, { timeout: options.timeout ?? 5_000 });
    if (filename !== ':memory:' && process.platform !== 'win32') chmodSync(filename, 0o600);
    connection.pragma('foreign_keys = ON');
    connection.pragma('journal_mode = WAL');
    connection.pragma('synchronous = FULL');
    connection
      .transaction(() => {
        connection.exec(
          'CREATE TABLE IF NOT EXISTS ned_schema (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL)',
        );
        const current = connection.prepare('SELECT version FROM ned_schema WHERE id=1').get();
        if (current && current.version !== 1)
          throw new DatabaseError(
            'unsupported_schema',
            'This NED database schema requires a compatible NED version.',
          );
        connection.exec(schema);
        connection.prepare('INSERT OR IGNORE INTO ned_schema(id,version) VALUES(1,1)').run();
      })
      .immediate();
  } catch (error) {
    connection?.close();
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError();
  }
  function guard(operation) {
    try {
      return operation();
    } catch (error) {
      if (error instanceof DatabaseError || error.isTaskError) throw error;
      throw new DatabaseError();
    }
  }
  return {
    filename,
    // Feature modules share one connection/transaction mechanism and migration namespace.
    connection,
    read(operation) {
      return guard(() => connection.transaction(operation)());
    },
    write(operation) {
      return guard(() => connection.transaction(operation).immediate());
    },
    getFeatureValue(namespace, key) {
      return guard(() => {
        const row = connection
          .prepare('SELECT value FROM ned_feature_data WHERE namespace=? AND key=?')
          .get(namespace, key);
        return row ? JSON.parse(row.value) : null;
      });
    },
    setFeatureValue(namespace, key, value) {
      return guard(() =>
        connection
          .prepare(
            'INSERT INTO ned_feature_data(namespace,key,value) VALUES(?,?,?) ON CONFLICT(namespace,key) DO UPDATE SET value=excluded.value',
          )
          .run(namespace, key, JSON.stringify(value)),
      );
    },
    close() {
      connection.close();
    },
  };
}

// Existing-file reads intentionally avoid the writable opener's initialization policy.
export function openNedDatabaseReadOnly({databasePath} = {}) {
  let connection;
  try {
    if (!databasePath || databasePath === ':memory:' || !statSync(databasePath).isFile()) throw new Error();
    accessSync(databasePath,constants.R_OK);
    connection = new Database(databasePath,{readonly:true,fileMustExist:true,timeout:100});
    if (connection.prepare('SELECT version FROM ned_schema WHERE id=1').get()?.version !== 1) throw new Error();
    connection.prepare('SELECT id,path,initialized_at FROM ned_projects LIMIT 0').all();
    return connection;
  } catch {
    connection?.close();
    throw new DatabaseError('database_unavailable','Project data could not be loaded.');
  }
}
