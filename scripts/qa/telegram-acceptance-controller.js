export const ACCEPTANCE_COMMANDS = Object.freeze({
  firstResponse: 'first-response-confirmed',
  secondResponse: 'second-response-confirmed',
  abort: 'abort',
});

function timeoutError() {
  const error = new Error('acceptance confirmation timed out');
  error.code = 'ACCEPTANCE_TIMEOUT';
  return error;
}

function isTimeout(error) {
  return error?.code === 'ACCEPTANCE_TIMEOUT';
}

async function boundedWait(waitForCommand, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => waitForCommand(timeoutMs)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(timeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function createAcceptanceController({
  run,
  waitForCommand,
  write = () => {},
  timeoutMs = 10 * 60 * 1000,
}) {
  if (typeof run !== 'function' || typeof waitForCommand !== 'function') {
    throw new TypeError('run and waitForCommand are required');
  }

  return {
    async run() {
      let status = 'failed';
      let cleanupExitCode = 1;
      try {
        if (await run(['create']) !== 0) return { status, cleanupExitCode };
        write('READY_FOR_TELEGRAM @NEDTestBot');
        const first = await boundedWait(waitForCommand, timeoutMs);
        if (first === ACCEPTANCE_COMMANDS.abort) return { status: 'aborted', cleanupExitCode };
        if (first !== ACCEPTANCE_COMMANDS.firstResponse) return { status, cleanupExitCode };

        if (await run(['repair']) !== 0) return { status, cleanupExitCode };
        write('READY_FOR_MARKER_B @NEDTestBot');
        const second = await boundedWait(waitForCommand, timeoutMs);
        if (second === ACCEPTANCE_COMMANDS.abort) return { status: 'aborted', cleanupExitCode };
        if (second !== ACCEPTANCE_COMMANDS.secondResponse) return { status, cleanupExitCode };
        status = 'complete';
      } catch (error) {
        status = isTimeout(error) ? 'timed_out' : 'failed';
      } finally {
        try {
          cleanupExitCode = await run(['destroy', '--yes']);
        } catch {
          cleanupExitCode = 1;
        }
      }
      return { status, cleanupExitCode };
    },
  };
}
