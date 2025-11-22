import { createClient } from 'redis';
import type { SyncStateMessage } from '../shared/protocol';
import type { RedisConfig } from '../shared/config';

export interface RedisSync {
  pub: ReturnType<typeof createClient>;
  sub: ReturnType<typeof createClient>;
  channel: string;
  config: RedisConfig;
}

export async function initRedisSync(config: RedisConfig): Promise<RedisSync> {
  const pub = createClient({ 
    url: config.url,
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > config.maxReconnectAttempts) {
          console.error('Redis pub: Too many reconnection attempts, giving up');
          return new Error('Too many retries');
        }
        const delay = Math.min(retries * config.reconnectBaseDelay, config.reconnectMaxDelay);
        console.log(`Redis pub: Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      }
    }
  });
  
  const sub = createClient({ 
    url: config.url,
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > config.maxReconnectAttempts) {
          console.error('Redis sub: Too many reconnection attempts, giving up');
          return new Error('Too many retries');
        }
        const delay = Math.min(retries * config.reconnectBaseDelay, config.reconnectMaxDelay);
        console.log(`Redis sub: Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      }
    }
  });

  pub.on('error', (err: Error) => console.error('Redis pub error:', err));
  sub.on('error', (err: Error) => console.error('Redis sub error:', err));
  
  pub.on('reconnecting', () => console.log('Redis pub: Reconnecting...'));
  sub.on('reconnecting', () => console.log('Redis sub: Reconnecting...'));
  
  pub.on('ready', () => console.log('Redis pub: Connected and ready'));
  sub.on('ready', () => console.log('Redis sub: Connected and ready'));

  await pub.connect();
  await sub.connect();

  return { pub, sub, channel: config.channel, config };
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

export async function acquirePlayerLock(
  sync: RedisSync,
  gameId: string,
  mark: string,
  serverId: string
): Promise<boolean> {
  const lockKey = `game:${gameId}:player:${mark}`;
  try {
    const result = await sync.pub.set(lockKey, serverId, {
      NX: true,
      EX: sync.config.lockTTL
    });
    return result === 'OK';
  } catch (err) {
    console.error('Error acquiring player lock:', err);
    return false;
  }
}

export function startLockRenewal(
  sync: RedisSync,
  gameId: string,
  mark: string,
  serverId: string
): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    const lockKey = `game:${gameId}:player:${mark}`;
    try {
      const currentOwner = await sync.pub.get(lockKey);
      if (currentOwner === serverId) {
        await sync.pub.expire(lockKey, sync.config.lockTTL);
      }
    } catch (err) {
      console.error('Error renewing lock:', err);
    }
  }, sync.config.lockRenewalInterval);
}

export async function releasePlayerLock(
  sync: RedisSync,
  gameId: string,
  mark: string,
  serverId: string
): Promise<void> {
  const lockKey = `game:${gameId}:player:${mark}`;
  try {
    const currentOwner = await sync.pub.get(lockKey);
    if (currentOwner === serverId) {
      await sync.pub.del(lockKey);
    }
  } catch (err) {
    console.error('Error releasing lock:', err);
  }
}

export async function acquireGameMutex(
  sync: RedisSync,
  gameId: string,
  serverId: string,
  mutexTTL: number
): Promise<boolean> {
  const mutexKey = `game:${gameId}:mutex`;
  try {
    const result = await sync.pub.set(mutexKey, serverId, {
      NX: true,
      EX: mutexTTL
    });
    return result === 'OK';
  } catch (err) {
    console.error('Error acquiring game mutex:', err);
    return false;
  }
}

export async function releaseGameMutex(
  sync: RedisSync,
  gameId: string,
  serverId: string
): Promise<void> {
  const mutexKey = `game:${gameId}:mutex`;
  try {
    const currentOwner = await sync.pub.get(mutexKey);
    if (currentOwner === serverId) {
      await sync.pub.del(mutexKey);
    }
  } catch (err) {
    console.error('Error releasing game mutex:', err);
  }
}
