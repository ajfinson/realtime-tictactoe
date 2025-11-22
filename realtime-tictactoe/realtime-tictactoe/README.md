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

### One-Command Setup (Recommended)

Just install dependencies and run the game:

```bash
npm install
npm run play-game
```

This single command will automatically:
1. Start Redis in Docker
2. Start both game servers (ports 3001 and 3002)
3. Wait for servers to be ready
4. Connect both players (X and O)
5. Start the game!

**Requirements:** Docker must be installed and running.

Then play by typing `row,col` (e.g. `0,2`) when it's your turn.

Press `Ctrl+C` to stop all processes.

---

### Manual Setup (Alternative)

If you prefer to run each component separately:

**1. Install dependencies:**
```bash
npm install
```

**2. Start Redis:**
```bash
docker run --name ttt-redis -p 6379:6379 redis
```

**3. Start servers (in separate terminals):**
```bash
npm run serverA  # Terminal 1
npm run serverB  # Terminal 2
```

**4. Start clients (in separate terminals):**
```bash
npm run client:X  # Terminal 3
npm run client:O  # Terminal 4
```

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
