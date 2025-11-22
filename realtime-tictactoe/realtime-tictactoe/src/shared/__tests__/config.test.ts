import { 
  loadServerConfig, 
  loadRedisConfig, 
  loadGameConfig, 
  loadClientConfig 
} from '../config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a clean copy of env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('loadServerConfig', () => {
    it('should return default config when no env vars set', () => {
      delete process.env.PORT;
      delete process.env.SERVER_ID;
      
      const config = loadServerConfig();
      
      expect(config.port).toBe(3001);
      expect(config.serverId).toBe('server-3001');
    });

    it('should use PORT env var', () => {
      process.env.PORT = '4000';
      
      const config = loadServerConfig();
      
      expect(config.port).toBe(4000);
    });

    it('should use SERVER_ID env var', () => {
      process.env.SERVER_ID = 'custom-server';
      
      const config = loadServerConfig();
      
      expect(config.serverId).toBe('custom-server');
    });

    it('should handle invalid PORT gracefully', () => {
      process.env.PORT = 'invalid';
      
      const config = loadServerConfig();
      
      // Should fall back to default
      expect(config.port).toBe(3001);
    });
  });

  describe('loadRedisConfig', () => {
    it('should return default config when no env vars set', () => {
      delete process.env.REDIS_URL;
      delete process.env.REDIS_CHANNEL;
      delete process.env.LOCK_TTL;
      delete process.env.LOCK_RENEWAL_INTERVAL;
      delete process.env.MAX_RECONNECT_ATTEMPTS;
      delete process.env.RECONNECT_BASE_DELAY;
      delete process.env.RECONNECT_MAX_DELAY;
      
      const config = loadRedisConfig();
      
      expect(config.url).toBe('redis://localhost:6379');
      expect(config.channel).toBe('ttt_game_updates');
      expect(config.lockTTL).toBe(30);
      expect(config.lockRenewalInterval).toBe(10000);
      expect(config.maxReconnectAttempts).toBe(10);
      expect(config.reconnectBaseDelay).toBe(100);
      expect(config.reconnectMaxDelay).toBe(3000);
    });

    it('should use REDIS_URL env var', () => {
      process.env.REDIS_URL = 'redis://custom:6380';
      
      const config = loadRedisConfig();
      
      expect(config.url).toBe('redis://custom:6380');
    });

    it('should use LOCK_TTL env var', () => {
      process.env.LOCK_TTL = '60';
      
      const config = loadRedisConfig();
      
      expect(config.lockTTL).toBe(60);
    });

    it('should use LOCK_RENEWAL_INTERVAL env var', () => {
      process.env.LOCK_RENEWAL_INTERVAL = '5000';
      
      const config = loadRedisConfig();
      
      expect(config.lockRenewalInterval).toBe(5000);
    });
  });

  describe('loadGameConfig', () => {
    it('should return default config when no env vars set', () => {
      delete process.env.DEFAULT_GAME_ID;
      delete process.env.GAME_MUTEX_TTL;
      delete process.env.GAME_CLEANUP_DELAY;
      
      const config = loadGameConfig();
      
      expect(config.defaultGameId).toBe('default');
      expect(config.mutexTTL).toBe(5);
      expect(config.gameCleanupDelay).toBe(30000);
    });

    it('should use DEFAULT_GAME_ID env var', () => {
      process.env.DEFAULT_GAME_ID = 'custom-game';
      
      const config = loadGameConfig();
      
      expect(config.defaultGameId).toBe('custom-game');
    });

    it('should use GAME_MUTEX_TTL env var', () => {
      process.env.GAME_MUTEX_TTL = '10';
      
      const config = loadGameConfig();
      
      expect(config.mutexTTL).toBe(10);
    });

    it('should use GAME_CLEANUP_DELAY env var', () => {
      process.env.GAME_CLEANUP_DELAY = '60000';
      
      const config = loadGameConfig();
      
      expect(config.gameCleanupDelay).toBe(60000);
    });
  });

  describe('loadClientConfig', () => {
    it('should return default config when no env vars set', () => {
      delete process.env.CLIENT_MAX_RECONNECT_ATTEMPTS;
      delete process.env.CLIENT_RECONNECT_BASE_DELAY;
      delete process.env.CLIENT_RECONNECT_MAX_DELAY;
      
      const config = loadClientConfig();
      
      expect(config.maxReconnectAttempts).toBe(5);
      expect(config.reconnectBaseDelay).toBe(1000);
      expect(config.reconnectMaxDelay).toBe(10000);
    });

    it('should use CLIENT_MAX_RECONNECT env var', () => {
      process.env.CLIENT_MAX_RECONNECT = '10';
      
      const config = loadClientConfig();
      
      expect(config.maxReconnectAttempts).toBe(10);
    });

    it('should use CLIENT_RECONNECT_BASE_DELAY env var', () => {
      process.env.CLIENT_RECONNECT_BASE_DELAY = '2000';
      
      const config = loadClientConfig();
      
      expect(config.reconnectBaseDelay).toBe(2000);
    });

    it('should use CLIENT_RECONNECT_MAX_DELAY env var', () => {
      process.env.CLIENT_RECONNECT_MAX_DELAY = '20000';
      
      const config = loadClientConfig();
      
      expect(config.reconnectMaxDelay).toBe(20000);
    });

    it('should handle invalid number env vars gracefully', () => {
      process.env.CLIENT_MAX_RECONNECT = 'invalid';
      
      const config = loadClientConfig();
      
      // Should fall back to default
      expect(config.maxReconnectAttempts).toBe(5);
    });
  });
});
