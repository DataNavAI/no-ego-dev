import { createTaskService } from './tasks.js';

const values = new Set([
  '--project',
  '--database',
  '--actor',
  '--parent',
  '--description',
  '--priority',
  '--discovered-from',
  '--on',
  '--reason',
  '--service',
]);
const globalFlags = ['--project', '--database', '--actor', '--json'];

function parse(argv) {
  const positional = [],
    options = {};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--json') {
      if (options.json) throw new Error('Repeated option: --json');
      options.json = true;
      continue;
    }
    if (argument.startsWith('--')) {
      if (!values.has(argument) || options[argument.slice(2)] !== undefined)
        throw new Error(`Unknown or repeated option: ${argument}`);
      const value = argv[++index];
      if (value === undefined || value.startsWith('--'))
        throw new Error(`Missing value for ${argument}`);
      options[argument.slice(2)] = value;
    } else positional.push(argument);
  }
  return { positional, options };
}

function render(result) {
  const line = (item) =>
    `${item.id}  ${item.type}  ${item.status}  ${item.title}${item.assignee ? ` (${item.assignee})` : ''}`;
  if (Array.isArray(result)) {
    if (!result.length) return 'No work items.';
    if (!result[0].title) return JSON.stringify(result, null, 2);
    const rows = [];
    const visit = (item, depth) => {
      rows.push(
        `${'  '.repeat(depth)}${line(item)}${item.progress ? `  ${item.progress.percent}% (${item.progress.completed}/${item.progress.total})` : ''}`,
      );
      for (const child of item.children || []) visit(child, depth + 1);
    };
    result.forEach((item) => visit(item, 0));
    return rows.join('\n');
  }
  if (result?.title)
    return `${line(result)}\n${result.description}\nDependencies: ${result.dependencies.join(', ') || 'none'}\nDiscovered from: ${result.discoveredFrom || 'none'}${result.blocker ? `\nBlocked: ${result.blocker.reason}` : ''}`;
  if (result?.counts)
    return `${Object.entries(result.counts)
      .map(([status, count]) => `${status}: ${count}`)
      .join('  ')}\n${render(result.goals)}`;
  return JSON.stringify(result, null, 2);
}

export async function runTaskCli(argv, io, dependencies = {}) {
  let json = argv.includes('--json');
  let service;
  try {
    const { positional, options } = parse(argv);
    json = Boolean(options.json);
    const [command, action, ...rest] = positional;
    const top = ['ready', 'status', 'tree'].includes(command);
    const allowed = [...globalFlags];
    if (action === 'create' && !top)
      allowed.push('--parent', '--description', '--priority', '--discovered-from');
    if (action === 'block' && !top) allowed.push('--on', '--reason', '--service');
    if (action === 'done' && !top) allowed.push('--reason');
    for (const key of Object.keys(options))
      if (!allowed.includes(`--${key}`))
        throw new Error(`Option --${key} is not supported for this command.`);
    if (
      top
        ? positional.length !== 1
        : !action ||
          (action === 'init' || action === 'list' ? rest.length !== 0 : rest.length !== 1)
    ) {
      throw new Error(
        'Usage: ned <goal|subgoal|task|issue> <create|list|get|start|block|unblock|done|history|children> [title-or-id], or ned <ready|status|tree>. Use ned task init first.',
      );
    }
    if (action === 'init' && command !== 'task') throw new Error('Use ned task init.');
    if (action === 'block' && (options.on ? options.reason || options.service : !options.reason))
      throw new Error('Use block --on <id> or block --reason <text> [--service <name>].');
    if (options['discovered-from'] && command !== 'issue')
      throw new Error('--discovered-from is supported for issues only.');
    const actions = [
      'init',
      'create',
      'list',
      'get',
      'start',
      'done',
      'block',
      'unblock',
      'history',
      'children',
    ];
    if (!top && !actions.includes(action)) throw new Error(`Unknown task action: ${action}`);
    if (options.priority !== undefined && !/^[0-4]$/.test(options.priority))
      throw new Error('Priority must be an integer from 0 to 4.');
    service = await (dependencies.taskServiceFactory || createTaskService)({
      project: options.project,
      actor: options.actor,
      home: dependencies.taskHome,
      databaseUrl: options.database,
      env: dependencies.env || process.env,
    });
    let result;
    if (top)
      result = await {
        ready: () => service.getReadyTasks(),
        status: () => service.getStatus(),
        tree: () => service.getTree(),
      }[command]();
    else if (action === 'init') result = await service.initialize();
    else if (action === 'create')
      result = await service.createItem(command, {
        title: rest[0],
        parentId: options.parent,
        description: options.description,
        priority: options.priority === undefined ? 2 : Number(options.priority),
        discoveredFrom: options['discovered-from'],
      });
    else if (action === 'list')
      result = (await service.getItems()).filter((item) => item.type === command);
    else {
      const item = await service.getItem(rest[0]);
      if (command !== 'task' && item.type !== command)
        throw new Error(`Item is ${item.type}, not ${command}.`);
      const handlers = {
        get: () => item,
        start: () => service.startTask(item.id),
        done: () => service.completeTask(item.id, options.reason || ''),
        block: () => service.blockTask(item.id, options),
        unblock: () => service.unblockTask(item.id),
        history: () => service.getActivity(item.id),
        children: () => service.getChildren(item.id),
      };
      if (!handlers[action]) throw new Error(`Unknown task action: ${action}`);
      result = await handlers[action]();
    }
    io.log(json ? JSON.stringify(result) : render(result));
    return 0;
  } catch (error) {
    const result = { error: error.code || 'invalid_command', message: error.message };
    io.error(json ? JSON.stringify(result) : `NED tasks: ${result.message}`);
    return error.code === 'database_failed' ? 1 : 2;
  } finally {
    service?.close?.();
  }
}
