import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdir, realpath, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const execute = promisify(execFile);
const kinds = ['goal', 'subgoal', 'task', 'issue'];
const states = { open: 'planned', in_progress: 'working', blocked: 'blocked', closed: 'done' };

export class TaskError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function validateId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(id)) {
    throw new TaskError('invalid_id', 'Supply a valid work item ID.');
  }
}

function normalize(row, projectId, readyIds) {
  const links = row.dependencies || [];
  const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
  const blocker = typeof metadata.nedBlocker === 'string' ? JSON.parse(metadata.nedBlocker) : metadata.nedBlocker;
  const type = metadata.nedType || (row.issue_type === 'epic' ? 'goal' : row.issue_type === 'bug' ? 'issue' : 'task');
  return {
    id: row.id, projectId, type, title: row.title, description: row.description || '',
    status: readyIds.has(row.id) && row.status === 'open' ? 'ready' : (states[row.status] || 'blocked'),
    priority: row.priority, parentId: row.parent || links.find((d) => d.type === 'parent-child')?.depends_on_id || null,
    dependencies: links.filter((d) => d.type === 'blocks').map((d) => d.depends_on_id),
    discoveredFrom: metadata.nedDiscoveredFrom || links.find((d) => d.type === 'discovered-from')?.depends_on_id || null,
    assignee: row.assignee || null, createdBy: row.created_by || null,
    createdAt: row.created_at, updatedAt: row.updated_at, blocker: blocker || null,
  };
}

// One Beads implementation, with a domain API reusable by a future dashboard.
export async function createTaskService({ project = process.cwd(), home = os.homedir(),
  executable = 'bd', actor = `human:${os.userInfo().username}`, runner = execute, env = process.env } = {}) {
  if (!/^(agent|human):[a-zA-Z0-9._@-]{1,100}$/.test(actor)) {
    throw new TaskError('invalid_actor', 'Actor must be agent:<id> or human:<id>.');
  }
  const projectPath = await realpath(project);
  if (!(await stat(projectPath)).isDirectory()) throw new TaskError('invalid_project', 'Project must be a directory.');
  const projectId = createHash('sha256').update(projectPath).digest('hex');
  const directory = path.join(home, '.ned', 'tasks', projectId);
  const beadsDirectory = path.join(directory, '.beads');
  // Inherited Beads routing must never send a project's work to another database.
  const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('BEADS_') && !key.startsWith('BD_')));
  Object.assign(childEnv, { BEADS_DIR: beadsDirectory, BD_NON_INTERACTIVE: '1', BD_LAST_TOUCHED_FALLBACK: '0' });

  async function run(args, { initialize = false } = {}) {
    if (!initialize) {
      try { await stat(path.join(beadsDirectory, 'metadata.json')); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        throw new TaskError('not_initialized', 'Run ned task init --project <directory> first.');
      }
    }
    try {
      const result = await runner(executable, [...args, '--actor', actor, '--json'], {
        cwd: directory, env: childEnv, timeout: 30_000, maxBuffer: 8 * 1024 * 1024,
      });
      if (initialize) return null;
      return JSON.parse(result.stdout);
    } catch (error) {
      if (error.code === 'ENOENT') throw new TaskError('beads_missing', 'Install Beads (bd) 1.3.1 or newer and put it on PATH.');
      // Raw subprocess errors may include arguments, descriptions or environment details.
      throw new TaskError('backend_failed', 'Beads could not complete the operation. Check bd version, database availability, ownership, and dependencies.');
    }
  }

  async function snapshot() {
    const rows = await run(['list', '--all', '--limit', '0']);
    const ready = await run(['ready', '--limit', '0']);
    const readyIds = new Set(ready.map((row) => row.id));
    const items = rows.map((row) => normalize(row, projectId, readyIds));
    const byId = new Map(items.map((item) => [item.id, item]));
    for (const item of items) {
      if (item.status === 'planned' && item.dependencies.some((id) => byId.get(id)?.status !== 'done')) item.status = 'blocked';
      let parent = byId.get(item.parentId);
      const seen = new Set([item.id]);
      while (parent && !seen.has(parent.id)) {
        seen.add(parent.id);
        if (parent.type === 'goal') item.goalId = parent.id;
        parent = byId.get(parent.parentId);
      }
      if (item.type === 'goal') item.goalId = item.id;
    }
    return items.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  }

  async function getItem(id) {
    validateId(id);
    const item = (await snapshot()).find((row) => row.id === id);
    if (!item) throw new TaskError('not_found', `Work item ${id} was not found in this project.`);
    return item;
  }

  async function createItem(type, { title, description = '', parentId, discoveredFrom, priority = 2 } = {}) {
    if (!kinds.includes(type) || typeof title !== 'string' || !title.trim() || title.length > 500) {
      throw new TaskError('invalid_item', 'Supply a goal, subgoal, task, or issue with a title of 1–500 characters.');
    }
    if (!Number.isInteger(priority) || priority < 0 || priority > 4) throw new TaskError('invalid_priority', 'Priority must be 0–4.');
    if (description.length > 20_000) throw new TaskError('invalid_description', 'Description is too long.');
    if (type === 'subgoal' && !parentId) throw new TaskError('parent_required', 'A subgoal requires --parent.');
    if (parentId) {
      const parent = await getItem(parentId);
      if (!['goal', 'subgoal'].includes(parent.type) || parent.status === 'done') throw new TaskError('invalid_parent', 'Parent must be an unfinished goal or subgoal.');
    }
    if (discoveredFrom) { await getItem(discoveredFrom); }
    const args = ['create', '--title', title.trim(), '--description', description,
      '--type', ['goal', 'subgoal'].includes(type) ? 'epic' : type === 'issue' ? 'bug' : 'task',
      '--priority', String(priority), '--metadata', JSON.stringify({ nedType: type, ...(discoveredFrom ? { nedDiscoveredFrom: discoveredFrom } : {}) })];
    if (parentId) args.push('--parent', parentId);
    const created = await run(args);
    return getItem(created.id);
  }

  async function addDependency(id, dependency) {
    const item = await getItem(id);
    await getItem(dependency);
    if (item.status === 'done') throw new TaskError('invalid_transition', 'Completed work cannot gain a blocker.');
    // Beads rejects cyclic edges transactionally as well as validating references.
    await run(['dep', 'add', id, dependency, '--type', 'blocks']);
    return getItem(id);
  }

  async function startTask(id) {
    const item = await getItem(id);
    if (!['task', 'issue'].includes(item.type) || !['ready', 'working'].includes(item.status)) {
      throw new TaskError('not_ready', 'Only ready execution work can be claimed.');
    }
    await run(['update', id, '--claim']);
    return getItem(id);
  }

  async function completeTask(id, reason = '') {
    const item = await getItem(id);
    if (item.status === 'blocked') throw new TaskError('invalid_transition', 'Resolve blockers before completing work.');
    if (item.assignee && item.assignee !== actor) throw new TaskError('not_owner', 'Only the assigned actor may complete claimed work.');
    await run(['close', id, '--reason', reason]);
    return getItem(id);
  }

  async function blockTask(id, { on, reason, service } = {}) {
    if (on) return addDependency(id, on);
    const item = await getItem(id);
    if (item.status === 'done' || !reason?.trim()) throw new TaskError('invalid_blocker', 'Unfinished work requires a nonempty blocker reason.');
    await run(['update', id, '--status', 'blocked', '--set-metadata', `nedBlocker=${JSON.stringify({ reason, service: service || null, requiresUserAction: Boolean(service) })}`]);
    return getItem(id);
  }

  async function unblockTask(id) {
    const item = await getItem(id);
    if (!item.blocker) throw new TaskError('invalid_transition', 'Use completion of dependencies to resolve dependency blockers.');
    await run(['update', id, '--status', 'open', '--unset-metadata', 'nedBlocker']);
    return getItem(id);
  }

  function treeFrom(items) {
    function node(item, seen = new Set()) {
      if (seen.has(item.id)) throw new TaskError('invalid_hierarchy', 'Work hierarchy contains a cycle.');
      const next = new Set([...seen, item.id]);
      const children = items.filter((child) => child.parentId === item.id).map((child) => node(child, next));
      const leaves = children.flatMap((child) => child._leaves);
      const ownLeaves = children.length ? leaves : ['task', 'issue'].includes(item.type) ? [item] : [];
      const completed = ownLeaves.filter((leaf) => leaf.status === 'done').length;
      const status = children.length && ['goal', 'subgoal'].includes(item.type)
        ? (completed === ownLeaves.length && ownLeaves.length ? 'done'
          : ownLeaves.some((leaf) => leaf.status === 'working') ? 'working'
            : ownLeaves.some((leaf) => leaf.status === 'blocked') ? 'blocked' : 'planned') : item.status;
      return { ...item, status, storedStatus: item.status, children, progress: { completed, total: ownLeaves.length,
        percent: ownLeaves.length ? Math.round(100 * completed / ownLeaves.length) : item.status === 'done' ? 100 : 0 }, _leaves: ownLeaves };
    }
    function clean(item) { const { _leaves, ...rest } = item; return { ...rest, children: rest.children.map(clean) }; }
    return items.filter((item) => !item.parentId).map((item) => clean(node(item)));
  }

  return {
    project: { id: projectId, path: projectPath },
    async initialize() {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await run(['init', '--stealth', '--skip-agents', '--non-interactive', '--init-if-missing', '--prefix', 'ned'], { initialize: true });
      return { projectId, initialized: true };
    },
    createItem, getItem, addDependency, startTask, completeTask, blockTask, unblockTask,
    getItems: snapshot,
    async getChildren(id) { await getItem(id); return (await snapshot()).filter((item) => item.parentId === id); },
    async getDependencies(id) { return (await getItem(id)).dependencies; },
    async getReadyTasks() { return (await snapshot()).filter((item) => ['task', 'issue'].includes(item.type) && item.status === 'ready'); },
    async getTree() { return treeFrom(await snapshot()); },
    async getGoalProgress(id) {
      const item = await getItem(id);
      if (!['goal', 'subgoal'].includes(item.type)) throw new TaskError('invalid_goal', 'Progress requires a goal or subgoal.');
      const find = (items) => items.flatMap((node) => [node, ...find(node.children)]);
      return find(treeFrom(await snapshot())).find((node) => node.id === id).progress;
    },
    async getStatus() {
      const items = await snapshot();
      return { projectId, counts: Object.fromEntries(['planned', 'ready', 'working', 'blocked', 'done'].map((s) => [s, items.filter((i) => ['task', 'issue'].includes(i.type) && i.status === s).length])), goals: treeFrom(items).filter((i) => i.type === 'goal') };
    },
    async getActivity(id) {
      await getItem(id);
      const events = await run(['history', id, '--events']);
      return events.map((event) => ({ id: event.id, itemId: event.issue_id, type: event.event_type,
        actor: event.actor, previousValue: event.old_value, value: event.new_value, createdAt: event.created_at }));
    },
  };
}
