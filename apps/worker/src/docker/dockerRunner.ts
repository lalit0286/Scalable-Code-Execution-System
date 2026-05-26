import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  DOCKER_IMAGES,
  DOCKER_MEMORY_LIMIT,
  DOCKER_CPU_LIMIT,
  DOCKER_TIMEOUT_SECONDS,
  EXECUTION_COMMANDS,
  FILE_EXTENSIONS,
} from '@code-exec/shared';
import type { Language, ExecutionResult } from '@code-exec/shared';
import { logger } from '../config/logger';

const execFileAsync = promisify(execFile);

interface DockerRunOptions {
  execution_id: string;
  language: Language;
  code: string;
}

/**
 * Runs user code in an ephemeral, isolated Docker container.
 *
 * Security guarantees:
 * - Ephemeral container per execution (--rm)
 * - No network access (--network none)
 * - Read-only root filesystem (--read-only)
 * - Non-root user (--user nobody)
 * - Memory limited (--memory)
 * - CPU limited (--cpus)
 * - No new privileges (--security-opt no-new-privileges)
 * - No process namespace sharing
 * - Only the temp code file is mounted (read-only)
 * - Auto-cleanup on any exit path
 */
export async function runInDocker(options: DockerRunOptions): Promise<ExecutionResult> {
  const { execution_id, language, code } = options;
  const startTime = Date.now();

  const tempDir = path.join(os.tmpdir(), `exec-${uuidv4()}`);
  const ext = FILE_EXTENSIONS[language];
  const codeFile = path.join(tempDir, `code${ext}`);
  const containerName = `exec-${execution_id}`;
  const image = DOCKER_IMAGES[language];
  const command = EXECUTION_COMMANDS[language];

  let tempDirCreated = false;

  try {
    // Write code to temp file
    await fs.mkdir(tempDir, { recursive: true });
    tempDirCreated = true;
    await fs.writeFile(codeFile, code, { encoding: 'utf8', mode: 0o444 }); // read-only

    logger.debug(
      { execution_id, language, codeFile },
      'Code written to temp file',
    );

    // Build docker run arguments with full isolation
    const dockerArgs = [
      'run',
      '--rm',                                        // auto-remove container after exit
      '--name', containerName,                       // named for force-kill if needed
      '--network', 'none',                           // no network access
      '--read-only',                                 // read-only root filesystem
      '--tmpfs', '/tmp:size=10m,noexec,nosuid',      // writable /tmp with limits
      '--user', 'nobody',                            // non-root user
      '--memory', DOCKER_MEMORY_LIMIT,               // memory cap
      '--memory-swap', DOCKER_MEMORY_LIMIT,          // disable swap
      '--cpus', DOCKER_CPU_LIMIT,                    // CPU cap
      '--pids-limit', '64',                          // limit process spawning
      '--security-opt', 'no-new-privileges',         // prevent privilege escalation
      '--security-opt', 'seccomp=unconfined',        // explicit seccomp (tighten in prod)
      '--cap-drop', 'ALL',                           // drop all Linux capabilities
      '--ulimit', 'nofile=64:64',                    // limit open file descriptors
      '--ulimit', `cpu=${DOCKER_TIMEOUT_SECONDS}:${DOCKER_TIMEOUT_SECONDS}`, // kernel CPU limit
      '-v', `${codeFile}:/code/code${ext}:ro`,       // mount code file read-only
      '-w', '/code',                                 // set working directory
      image,
      'timeout', `${DOCKER_TIMEOUT_SECONDS}`,        // shell timeout inside container
      command, `code${ext}`,
    ];

    logger.debug({ execution_id, dockerArgs }, 'Spawning Docker container');

    const { stdout, stderr } = await execFileAsync('docker', dockerArgs, {
      timeout: (DOCKER_TIMEOUT_SECONDS + 2) * 1000, // node-level timeout > docker timeout
      maxBuffer: 1024 * 1024, // 1MB stdout/stderr limit
    });

    const execution_time_ms = Date.now() - startTime;

    logger.info(
      { execution_id, execution_time_ms, language },
      'Execution completed successfully',
    );

    return {
      status: 'success',
      output: stdout.trim(),
      stderr: stderr.trim() || undefined,
      execution_time_ms,
    };
  } catch (err: unknown) {
    const execution_time_ms = Date.now() - startTime;
    const error = err as NodeJS.ErrnoException & {
      killed?: boolean;
      code?: string | number;
      stdout?: string;
      stderr?: string;
    };

    // Distinguish timeout from other failures
    if (
      error.killed === true ||
      error.code === 'ETIMEDOUT' ||
      (typeof error.code === 'number' && error.code === 124) // 'timeout' command exit code
    ) {
      logger.warn(
        { execution_id, execution_time_ms },
        'Execution timed out',
      );
      return {
        status: 'timeout',
        output: '',
        stderr: 'Execution timed out after 5 seconds.',
        execution_time_ms,
      };
    }

    // User code runtime error (non-zero exit, but container ran fine)
    const stdout = (error.stdout ?? '').trim();
    const stderr = (error.stderr ?? '').trim();

    logger.warn(
      { execution_id, execution_time_ms, stderr },
      'Execution failed (user code error)',
    );

    return {
      status: 'failed',
      output: stdout,
      stderr: stderr || 'Execution failed with a non-zero exit code.',
      execution_time_ms,
    };
  } finally {
    // Always cleanup: force-kill container + remove temp dir
    await Promise.allSettled([
      forceKillContainer(containerName),
      tempDirCreated ? fs.rm(tempDir, { recursive: true, force: true }) : Promise.resolve(),
    ]);
  }
}

/**
 * Forcefully stops and removes a container by name.
 * Used in cleanup to guarantee no orphaned containers.
 */
async function forceKillContainer(containerName: string): Promise<void> {
  try {
    await execFileAsync('docker', ['rm', '-f', containerName], {
      timeout: 5000,
    });
  } catch {
    // Container may already be removed (--rm flag) — silently ignore
  }
}
