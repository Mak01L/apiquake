import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

// Shared Redis connection. BullMQ needs maxRetriesPerRequest: null.
let _connection: IORedis | null = null;
export function getRedis(): IORedis {
  if (!_connection) {
    _connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return _connection;
}

export const QUEUE_FETCH = "fetch";
export const QUEUE_DIFF = "diff";
export const QUEUE_NOTIFY = "notify";

const queues: Record<string, Queue> = {};
export function getQueue(name: string): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection: getRedis() });
  }
  return queues[name];
}

export function queueEvents(name: string): QueueEvents {
  return new QueueEvents(name, { connection: getRedis() });
}
