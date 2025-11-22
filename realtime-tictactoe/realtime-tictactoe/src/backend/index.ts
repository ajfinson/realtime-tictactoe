import { initRedisSync } from './redisSync';
import { startWebSocketServer } from './server';

async function main() {
  const port = Number(process.env.PORT || 3001);
  const serverId = process.env.SERVER_ID || `server-${port}`;

  const redisSync = await initRedisSync('ttt_game_updates');
  startWebSocketServer(port, serverId, redisSync);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
