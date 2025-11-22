import { initRedisSync } from './redisSync';
import { startWebSocketServer } from './server';
import { loadServerConfig, loadRedisConfig } from '../shared/config';

async function main() {
  const serverConfig = loadServerConfig();
  const redisConfig = loadRedisConfig();

  console.log(`Starting ${serverConfig.serverId} on port ${serverConfig.port}`);
  
  const redisSync = await initRedisSync(redisConfig);
  startWebSocketServer(serverConfig.port, serverConfig.serverId, redisSync);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
