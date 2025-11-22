import { createClient, type RedisClientType } from 'redis';
import type { SyncStateMessage } from '../shared/protocol';

export interface RedisSync {
  pub: RedisClientType;
  sub: RedisClientType;
  channel: string;
}

export async function initRedisSync(channel = 'ttt_game_updates'): Promise<RedisSync> {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  const pub = createClient({ url });
  const sub = createClient({ url });

  pub.on('error', err => console.error('Redis pub error:', err));
  sub.on('error', err => console.error('Redis sub error:', err));

  await pub.connect();
  await sub.connect();

  return { pub, sub, channel };
}

export async function publishSyncState(
  sync: RedisSync,
  message: SyncStateMessage
): Promise<void> {
  await sync.pub.publish(sync.channel, JSON.stringify(message));
}

export type SyncHandler = (msg: SyncStateMessage) => void;

export async function subscribeToSync(
  sync: RedisSync,
  handler: SyncHandler
): Promise<void> {
  await sync.sub.subscribe(sync.channel, (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as SyncStateMessage;
      handler(parsed);
    } catch (err) {
      console.error('Error parsing sync_state message:', err);
    }
  });
}
