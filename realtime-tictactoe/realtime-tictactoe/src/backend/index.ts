import { initRedisSync } from './redisSync';
import { startWebSocketServer } from './server';
import { loadServerConfig, loadRedisConfig } from '../shared/config';
import { logger } from '../shared/logger';

const log = logger.child('Main');

async function main() {
  const serverConfig = loadServerConfig();
  const redisConfig = loadRedisConfig();

  log.info(`Starting ${serverConfig.serverId} on port ${serverConfig.port}`);
  
  const redisSync = await initRedisSync(redisConfig);
  startWebSocketServer(serverConfig.port, serverConfig.serverId, redisSync);
}

main().catch(err => {
  log.error('Fatal error', { error: err });
  process.exit(1);
});
