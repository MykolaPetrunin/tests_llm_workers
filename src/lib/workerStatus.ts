import { Logger } from 'pino';

type WorkerState = {
  isRunning: boolean;
  lastHeartbeatAt: number | null; // epoch ms
  lastError: string | null;
};

const workerState: WorkerState = {
  isRunning: false,
  lastHeartbeatAt: null,
  lastError: null
};

export function markWorkerStarted(logger?: Logger) {
  workerState.isRunning = true;
  workerState.lastError = null;
  workerState.lastHeartbeatAt = Date.now();
  logger?.info({ workerState }, 'Worker marked as started');
}

export function markWorkerHeartbeat(logger?: Logger) {
  workerState.lastHeartbeatAt = Date.now();
  logger?.debug({ lastHeartbeatAt: workerState.lastHeartbeatAt }, 'Worker heartbeat');
}

export function markWorkerStopped(logger?: Logger) {
  workerState.isRunning = false;
  logger?.info('Worker marked as stopped');
}

export function markWorkerError(error: unknown, logger?: Logger) {
  const message = error instanceof Error ? error.message : String(error);
  workerState.lastError = message;
  logger?.error({ error: message }, 'Worker error recorded');
}

export function getWorkerHealth() {
  const now = Date.now();
  const heartbeatAgeMs = workerState.lastHeartbeatAt ? now - workerState.lastHeartbeatAt : null;
  const healthyHeartbeat = heartbeatAgeMs !== null ? heartbeatAgeMs < 60_000 : false; // 60s tolerance
  const status = workerState.isRunning && healthyHeartbeat && !workerState.lastError ? 'healthy' : 'degraded';

  return {
    status,
    isRunning: workerState.isRunning,
    lastHeartbeatAt: workerState.lastHeartbeatAt,
    lastError: workerState.lastError,
    heartbeatAgeMs
  };
}



