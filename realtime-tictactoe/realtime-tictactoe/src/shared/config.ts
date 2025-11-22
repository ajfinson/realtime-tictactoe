// Configuration for the Tic-Tac-Toe game

export interface ServerConfig {
  port: number;
  serverId: string;
}

export interface RedisConfig {
  url: string;
  channel: string;
  lockTTL: number; // seconds
  lockRenewalInterval: number; // milliseconds
  maxReconnectAttempts: number;
  reconnectBaseDelay: number; // milliseconds
  reconnectMaxDelay: number; // milliseconds
}

export interface GameConfig {
  mutexTTL: number; // seconds
  gameCleanupDelay: number; // milliseconds
  defaultGameId: string;
}

export interface ClientConfig {
  maxReconnectAttempts: number;
  reconnectBaseDelay: number; // milliseconds
  reconnectMaxDelay: number; // milliseconds
}

export interface AppConfig {
  server: ServerConfig;
  redis: RedisConfig;
  game: GameConfig;
  client: ClientConfig;
}

// Load configuration from environment variables with defaults
export function loadServerConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT) || 3001,
    serverId: process.env.SERVER_ID || `server-${process.env.PORT || 3001}`
  };
}

export function loadRedisConfig(): RedisConfig {
  return {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    channel: process.env.REDIS_CHANNEL || 'ttt_game_updates',
    lockTTL: Number(process.env.LOCK_TTL) || 30,
    lockRenewalInterval: Number(process.env.LOCK_RENEWAL_INTERVAL) || 10000,
    maxReconnectAttempts: Number(process.env.REDIS_MAX_RECONNECT) || 10,
    reconnectBaseDelay: Number(process.env.REDIS_RECONNECT_BASE_DELAY) || 100,
    reconnectMaxDelay: Number(process.env.REDIS_RECONNECT_MAX_DELAY) || 3000
  };
}

export function loadGameConfig(): GameConfig {
  return {
    mutexTTL: Number(process.env.GAME_MUTEX_TTL) || 5,
    gameCleanupDelay: Number(process.env.GAME_CLEANUP_DELAY) || 30000,
    defaultGameId: process.env.DEFAULT_GAME_ID || 'default'
  };
}

export function loadClientConfig(): ClientConfig {
  return {
    maxReconnectAttempts: Number(process.env.CLIENT_MAX_RECONNECT) || 5,
    reconnectBaseDelay: Number(process.env.CLIENT_RECONNECT_BASE_DELAY) || 1000,
    reconnectMaxDelay: Number(process.env.CLIENT_RECONNECT_MAX_DELAY) || 10000
  };
}

export function loadConfig(): AppConfig {
  return {
    server: loadServerConfig(),
    redis: loadRedisConfig(),
    game: loadGameConfig(),
    client: loadClientConfig()
  };
}

// Export default config instance
export const config = loadConfig();
