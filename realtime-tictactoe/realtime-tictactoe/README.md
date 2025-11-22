# Real-Time Tic-Tac-Toe over Two Node.js Servers

This project implements a **production-ready**, real-time, multiplayer Tic-Tac-Toe game where:

- Two independent Node.js backend servers run WebSocket endpoints (e.g. on ports 3001 and 3002).
- Each player connects from a CLI client to either server.
- Game state is synchronized in real time across both servers using Redis pub/sub.
- Moves are validated, wins/draws detected, and invalid moves rejected.

## Features

### Production-Ready Enhancements

✅ **Distributed Locking with TTL**
- Player locks expire after 30 seconds
- Automatic heartbeat renewal every 10 seconds
- No permanent lock-in if clients disconnect unexpectedly

✅ **Race Condition Prevention**
- Redis-based mutex for game state mutations
- Sequence numbers to handle out-of-order message delivery
- Prevents conflicting moves from different servers

✅ **Automatic Reconnection**
- Redis clients reconnect with exponential backoff (up to 10 attempts)
- WebSocket clients reconnect with exponential backoff (up to 5 attempts)
- State recovery after reconnection

✅ **Memory Management**
- Finished games automatically cleaned up after 30 seconds
- Lock renewal intervals properly cleared
- No memory leaks from accumulating game state

✅ **Cross-Platform Support**
- Uses `cross-env` for environment variables
- Works on Windows PowerShell, Linux, and macOS

✅ **Error Handling**
- Comprehensive error logging
- Graceful degradation on network issues
- Stale message detection and rejection

## Quick Start

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Docker must be installed and running** (for Redis)

### Automatic Setup (Recommended)

**One command to open all 5 terminals automatically:**

**On Windows (PowerShell):**
```bash
npm run play-game
```

**On macOS/Linux:**
```bash
npm run play-game:bash
```

This will automatically open 5 separate terminal windows:
- Terminal 1: Redis server
- Terminal 2: Game Server A
- Terminal 3: Game Server B  
- Terminal 4: Player X (where you play)
- Terminal 5: Player O (where you play)

Once all windows open and show "Status: playing", you can start making moves!

---

### Manual Setup (Alternative)

If the automatic script doesn't work, you can manually open 5 terminals:

To play the game, you need to run 5 separate terminal windows:

**Terminal 1 - Redis:**
```bash
docker run --rm --name ttt-redis -p 6379:6379 redis
```
Keep this running.

**Terminal 2 - Server A:**
```bash
npm run serverA
```
Wait for "Server server-A listening on ws://localhost:3001"

**Terminal 3 - Server B:**
```bash
npm run serverB
```
Wait for "Server server-B listening on ws://localhost:3002"

**Terminal 4 - Player X (You play here):**
```bash
npm run client:X
```
This is where you'll enter moves for Player X

**Terminal 5 - Player O (You play here):**
```bash
npm run client:O
```
This is where you'll enter moves for Player O

### Playing the Game

1. Once all 5 terminals are running, the game status will change from "waiting" to "playing"
2. Player X goes first - type your move in Terminal 4 (e.g., `0,0` for top-left, `1,1` for center, `2,2` for bottom-right)
3. Then Player O moves in Terminal 5
4. The board updates in real-time across both clients
5. Game automatically detects wins and draws

**Move Format:** `row,col` where both are 0-2
- `0,0` = top-left
- `1,1` = center  
- `2,2` = bottom-right

Press `Ctrl+C` in any terminal to stop that component.

### Stopping the Game

To stop all components:
1. Close each terminal window individually, OR
2. Run `docker stop ttt-redis` to stop Redis (other components will fail and exit)

## Configuration

Environment variables:
- `PORT` - Server port (default: 3001)
- `SERVER_ID` - Unique server identifier for sync tracking
- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)

## Architecture

### Components

- **`src/shared/protocol.ts`** - TypeScript message interfaces
- **`src/backend/gameLogic.ts`** - Core game mechanics and state management
- **`src/backend/redisSync.ts`** - Redis pub/sub with locking and reconnection
- **`src/backend/server.ts`** - WebSocket server with sync handlers
- **`src/backend/index.ts`** - Server entry point
- **`src/client/client.ts`** - CLI client with reconnection

### Key Mechanisms

**Player Locking:**
- Redis key: `game:{gameId}:player:{mark}`
- 30-second TTL with 10-second renewal
- Prevents duplicate mark assignment across servers

**Game State Mutex:**
- Redis key: `game:{gameId}:mutex`
- 5-second TTL for move processing
- Prevents race conditions on concurrent moves

**Message Sequencing:**
- Each game state has a monotonic sequence number
- Stale sync messages are rejected
- Ensures consistent state across servers

**Cleanup:**
- Finished games removed after 30 seconds
- Lock renewal intervals cleared on disconnect
- Prevents memory leaks and stale locks

See inline comments in the code for detailed implementation notes.
