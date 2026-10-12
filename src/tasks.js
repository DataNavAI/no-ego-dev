import { createHash, randomUUID } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import os from 'node:os';
import { openNedDatabase } from './database.js';

export class TaskError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.isTaskError = true;
  }
}
const fail = (code, message) => {
  throw new TaskError(code, message);
};
function validateId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(id))
    fail('invalid_id', 'Supply a valid work item ID.');
}

export async function createTaskService({
  project = process.cwd(),
  home = os.homedir(),
  databaseUrl,
  database,
  actor = `human:${os.userInfo().username}`,
  env = process.env,
} = {}) {
  if (!/^(agent|human):[a-zA-Z0-9._@-]{1,100}$/.test(actor))
    fail('invalid_actor', 'Actor must be agent:<id> or human:<id>.');
  let projectPath;
  try {
    projectPath = await realpath(project);
    if (!(await stat(projectPath)).isDirectory()) throw new Error();
  } catch {
    fail('invalid_project', 'Project must be an existing directory.');
  }
  const projectId = createHash('sha256').update(projectPath).digest('hex');
  const db = database || openNedDatabase({ databaseUrl, home, env });
  const sql = db.connection;
  const now = () => new Date().toISOString();

  function raw(id) {
    validateId(id);
    const row = sql
      .prepare('SELECT * FROM ned_work_items WHERE project_id=? AND id=?')
      .get(projectId, id);
    if (!row) fail('not_found', `Work item ${id} was not found in this project.`);
    return row;
  }
  function inProject(write, operation) {
    return db[write ? 'write' : 'read'](() => {
      if (!sql.prepare('SELECT id FROM ned_projects WHERE id=?').get(projectId))
        fail('not_initialized', 'Run ned task init --project <directory> first.');
      return operation();
    });
  }
  function snapshot() {
    const rows = sql.prepare('SELECT * FROM ned_work_items WHERE project_id=?').all(projectId);
    const links = sql.prepare('SELECT * FROM ned_dependencies WHERE project_id=?').all(projectId);
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const row of rows) {
      const visited = new Set([row.id]);
      let parent = row.parent_id;
      while (parent) {
        if (
          visited.has(parent) ||
          !byId.has(parent) ||
          !['goal', 'subgoal'].includes(byId.get(parent).type)
        )
          fail('invalid_hierarchy', 'Work hierarchy is invalid.');
        visited.add(parent);
        parent = byId.get(parent).parent_id;
      }
    }
    return rows
      .map((row) => {
        const dependencies = links
          .filter((link) => link.item_id === row.id)
          .map((link) => link.depends_on_id)
          .sort();
        const blocker = row.blocker ? JSON.parse(row.blocker) : null;
        const blocked =
          Boolean(blocker) || dependencies.some((id) => byId.get(id)?.state !== 'done');
        const status =
          row.state === 'done'
            ? 'done'
            : blocked
              ? 'blocked'
              : row.state === 'working'
                ? 'working'
                : ['task', 'issue'].includes(row.type) && !row.assignee
                  ? 'ready'
                  : 'planned';
        let parent = byId.get(row.parent_id),
          goalId;
        while (parent) {
          if (parent.type === 'goal') goalId = parent.id;
          parent = byId.get(parent.parent_id);
        }
        if (row.type === 'goal') goalId = row.id;
        return {
          id: row.id,
          projectId,
          type: row.type,
          title: row.title,
          description: row.description,
          status,
          priority: row.priority,
          parentId: row.parent_id,
          dependencies,
          discoveredFrom: row.discovered_from,
          assignee: row.assignee,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          blocker,
          ...(goalId ? { goalId } : {}),
        };
      })
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  }
  function item(id) {
    raw(id);
    return snapshot().find((row) => row.id === id);
  }
  function event(id, type, before, after) {
    sql
      .prepare(
        'INSERT INTO ned_task_events(id,project_id,item_id,type,actor,previous_value,value,created_at) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        projectId,
        id,
        type,
        actor,
        before ? JSON.stringify(before) : null,
        JSON.stringify(after),
        now(),
      );
  }
  function own(row) {
    if (row.assignee && row.assignee !== actor)
      fail('not_owner', 'Only the assigned actor may change claimed work.');
  }
  function treeFrom(items) {
    function node(entry) {
      const children = items.filter((child) => child.parentId === entry.id).map(node);
      const leaves = children.length
        ? children.flatMap((child) => child.leaves)
        : ['task', 'issue'].includes(entry.type)
          ? [entry]
          : [];
      const completed = leaves.filter((leaf) => leaf.status === 'done').length;
      const status =
        entry.status === 'blocked'
          ? 'blocked'
          : children.length && leaves.length
            ? completed === leaves.length
              ? 'done'
              : leaves.some((leaf) => leaf.status === 'working')
                ? 'working'
                : leaves.some((leaf) => leaf.status === 'blocked')
                  ? 'blocked'
                  : 'planned'
            : entry.status;
      return {
        ...entry,
        status,
        storedStatus: entry.status,
        children,
        leaves,
        progress: {
          completed,
          total: leaves.length,
          percent: leaves.length
            ? Math.round((100 * completed) / leaves.length)
            : entry.status === 'done'
              ? 100
              : 0,
        },
      };
    }
    function clean(entry) {
      const { leaves, ...rest } = entry;
      return { ...rest, children: rest.children.map(clean) };
    }
    return items.filter((entry) => !entry.parentId).map((entry) => clean(node(entry)));
  }

  return {
    project: { id: projectId, path: projectPath },
    close() {
      if (!database) db.close();
    },
    async initialize() {
      return db.write(() => {
        sql
          .prepare('INSERT OR IGNORE INTO ned_projects(id,path,initialized_at) VALUES(?,?,?)')
          .run(projectId, projectPath, now());
        return { projectId, initialized: true };
      });
    },
    async createItem(
      type,
      { title, description = '', parentId, discoveredFrom, priority = 2 } = {},
    ) {
      if (
        !['goal', 'subgoal', 'task', 'issue'].includes(type) ||
        typeof title !== 'string' ||
        !title.trim() ||
        title.length > 500
      )
        fail('invalid_item', 'Supply a valid item type and a title of 1–500 characters.');
      if (typeof description !== 'string' || description.length > 20_000)
        fail('invalid_description', 'Description must be a string of at most 20,000 characters.');
      if (!Number.isInteger(priority) || priority < 0 || priority > 4)
        fail('invalid_priority', 'Priority must be 0–4.');
      if (type === 'subgoal' && !parentId) fail('parent_required', 'A subgoal requires --parent.');
      if (discoveredFrom && type !== 'issue')
        fail('invalid_provenance', 'Discovery provenance is supported for issues only.');
      return inProject(true, () => {
        if (parentId) {
          const parent = raw(parentId);
          if (!['goal', 'subgoal'].includes(parent.type) || parent.state === 'done')
            fail('invalid_parent', 'Parent must be an unfinished goal or subgoal.');
        }
        if (discoveredFrom) raw(discoveredFrom);
        const id = `ned-${randomUUID()}`,
          timestamp = now();
        sql
          .prepare(
            "INSERT INTO ned_work_items(project_id,id,type,title,description,priority,state,parent_id,discovered_from,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,'open',?,?,?,?,?)",
          )
          .run(
            projectId,
            id,
            type,
            title.trim(),
            description,
            priority,
            parentId || null,
            discoveredFrom || null,
            actor,
            timestamp,
            timestamp,
          );
        const result = item(id);
        event(id, 'created', null, result);
        return result;
      });
    },
    async getItems() {
      return inProject(false, snapshot);
    },
    async getItem(id) {
      return inProject(false, () => item(id));
    },
    async getChildren(id) {
      return inProject(false, () => {
        raw(id);
        return snapshot().filter((child) => child.parentId === id);
      });
    },
    async getDependencies(id) {
      return inProject(false, () => item(id).dependencies);
    },
    async getReadyTasks() {
      return inProject(false, () =>
        snapshot().filter(
          (entry) => ['task', 'issue'].includes(entry.type) && entry.status === 'ready',
        ),
      );
    },
    async addDependency(id, dependency) {
      return inProject(true, () => {
        const entry = raw(id);
        own(entry);
        raw(dependency);
        if (entry.state === 'done')
          fail('invalid_transition', 'Completed work cannot gain a blocker.');
        const edges = sql
          .prepare('SELECT item_id,depends_on_id FROM ned_dependencies WHERE project_id=?')
          .all(projectId);
        const visited = new Set();
        function reaches(current) {
          if (current === id) return true;
          if (visited.has(current)) return false;
          visited.add(current);
          return edges
            .filter((edge) => edge.item_id === current)
            .some((edge) => reaches(edge.depends_on_id));
        }
        if (reaches(dependency)) fail('dependency_cycle', 'Dependencies must not contain cycles.');
        const before = item(id);
        const added = sql
          .prepare(
            'INSERT OR IGNORE INTO ned_dependencies(project_id,item_id,depends_on_id) VALUES(?,?,?)',
          )
          .run(projectId, id, dependency).changes;
        if (added) {
          sql
            .prepare('UPDATE ned_work_items SET updated_at=? WHERE project_id=? AND id=?')
            .run(now(), projectId, id);
          event(id, 'dependency_added', before, item(id));
        }
        return item(id);
      });
    },
    async startTask(id) {
      return inProject(true, () => {
        const entry = raw(id),
          before = item(id);
        own(entry);
        if (
          !['task', 'issue'].includes(entry.type) ||
          !['ready', 'working'].includes(before.status)
        )
          fail('not_ready', 'Only ready execution work can be claimed.');
        if (entry.state === 'working') return before;
        sql
          .prepare(
            "UPDATE ned_work_items SET state='working',assignee=?,updated_at=? WHERE project_id=? AND id=?",
          )
          .run(actor, now(), projectId, id);
        const after = item(id);
        event(id, 'claimed', before, after);
        return after;
      });
    },
    async completeTask(id, reason = '') {
      if (typeof reason !== 'string' || reason.length > 20_000)
        fail('invalid_reason', 'Completion reason must be at most 20,000 characters.');
      return inProject(true, () => {
        const entry = raw(id),
          before = item(id);
        own(entry);
        if (entry.state === 'done') return before;
        if (before.status === 'blocked')
          fail('invalid_transition', 'Resolve blockers before completing work.');
        if (
          ['task', 'issue'].includes(entry.type) &&
          (entry.state !== 'working' || entry.assignee !== actor)
        )
          fail('not_claimed', 'Claim execution work before completing it.');
        if (
          sql
            .prepare(
              "SELECT id FROM ned_work_items WHERE project_id=? AND parent_id=? AND state<>'done'",
            )
            .get(projectId, id)
        )
          fail('unfinished_children', 'Complete child work before closing its parent.');
        sql
          .prepare(
            "UPDATE ned_work_items SET state='done',updated_at=? WHERE project_id=? AND id=?",
          )
          .run(now(), projectId, id);
        const after = item(id);
        event(id, 'completed', before, { ...after, reason });
        return after;
      });
    },
    async blockTask(id, { on, reason, service } = {}) {
      if (on && (reason !== undefined || service !== undefined))
        fail('invalid_blocker', 'Choose a dependency or a reason blocker.');
      if (on) return this.addDependency(id, on);
      if (
        typeof reason !== 'string' ||
        !reason.trim() ||
        reason.length > 20_000 ||
        (service !== undefined &&
          (typeof service !== 'string' || !service.trim() || service.length > 100))
      )
        fail('invalid_blocker', 'Supply a nonempty bounded reason and optional service name.');
      return inProject(true, () => {
        const entry = raw(id);
        own(entry);
        if (entry.state === 'done') fail('invalid_transition', 'Completed work cannot be blocked.');
        const before = item(id),
          blocker = {
            reason: reason.trim(),
            service: service || null,
            requiresUserAction: Boolean(service),
          };
        if (JSON.stringify(before.blocker) === JSON.stringify(blocker)) return before;
        sql
          .prepare('UPDATE ned_work_items SET blocker=?,updated_at=? WHERE project_id=? AND id=?')
          .run(JSON.stringify(blocker), now(), projectId, id);
        const after = item(id);
        event(id, 'blocked', before, after);
        return after;
      });
    },
    async unblockTask(id) {
      return inProject(true, () => {
        const entry = raw(id);
        own(entry);
        if (!entry.blocker)
          fail('invalid_transition', 'Only an explicit reason blocker can be cleared.');
        const before = item(id);
        sql
          .prepare(
            'UPDATE ned_work_items SET blocker=NULL,updated_at=? WHERE project_id=? AND id=?',
          )
          .run(now(), projectId, id);
        const after = item(id);
        event(id, 'unblocked', before, after);
        return after;
      });
    },
    async getTree() {
      return inProject(false, () => treeFrom(snapshot()));
    },
    async getGoalProgress(id) {
      return inProject(false, () => {
        const entry = raw(id);
        if (!['goal', 'subgoal'].includes(entry.type))
          fail('invalid_goal', 'Progress requires a goal or subgoal.');
        const flatten = (nodes) => nodes.flatMap((node) => [node, ...flatten(node.children)]);
        return flatten(treeFrom(snapshot())).find((node) => node.id === id).progress;
      });
    },
    async getStatus() {
      return inProject(false, () => {
        const items = snapshot();
        return {
          projectId,
          counts: Object.fromEntries(
            ['planned', 'ready', 'working', 'blocked', 'done'].map((status) => [
              status,
              items.filter(
                (entry) => ['task', 'issue'].includes(entry.type) && entry.status === status,
              ).length,
            ]),
          ),
          goals: treeFrom(items).filter((entry) => entry.type === 'goal'),
        };
      });
    },
    async getActivity(id) {
      return inProject(false, () => {
        raw(id);
        return sql
          .prepare(
            'SELECT * FROM ned_task_events WHERE project_id=? AND item_id=? ORDER BY sequence',
          )
          .all(projectId, id)
          .map((row) => ({
            id: row.id,
            itemId: row.item_id,
            type: row.type,
            actor: row.actor,
            previousValue: row.previous_value ? JSON.parse(row.previous_value) : null,
            value: JSON.parse(row.value),
            createdAt: row.created_at,
          }));
      });
    },
  };
}
