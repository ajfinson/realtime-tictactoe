# Real-Time Tic-Tac-Toe over Two Node.js Servers

This project implements a **production-ready**, real-time, multiplayer Tic-Tac-Toe game where:

- **Two independent Node.js backend servers** run WebSocket endpoints (ports 3001 and 3002)
- **Players connect to different servers** - Each player can connect to either server via CLI client
- **Real-time synchronization** - Game state syncs instantly across both servers using Redis pub/sub
- **Distributed coordination** - Redis-based locking prevents race conditions and duplicate players
- **Full game logic** - Moves are validated, wins/draws detected, and invalid moves rejected

## AI Development Disclosure

This project was developed with **significant assistance from AI tools** (GitHub Copilot with Claude Sonnet 4.5). **ChatGPT o1** was used to review architecture and design decisions. The AI helped with:

- **Architecture design** - Distributed system patterns, Redis locking strategies, and race condition prevention
- **Code implementation** - TypeScript interfaces, WebSocket handlers, Redis pub/sub integration
- **Production enhancements** - TTL-based locking, sequence numbers, reconnection logic, memory management
- **Testing infrastructure** - Jest setup, comprehensive unit tests for game logic and configuration
- **Logging system** - Structured logger with color-coded output and contextual information
- **Documentation** - README structure, architecture diagrams, and usage examples
- **Code quality** - TypeScript type safety improvements, error handling, and code organization

**Important:** This project had **human oversight at every step** from initial design through final implementation. The AI acted as a pair programming partner and architectural consultant, but all decisions, code reviews, testing, and validation were performed with human judgment and approval. Every feature was tested and verified to work correctly before acceptance.

## Architecture and Communication Design

### System Overview

```
┌─────────────┐         ┌─────────────┐
│  Client X   │         │  Client O   │
│   (CLI)     │         │   (CLI)     │
└──────┬──────┘         └──────┬──────┘
       │ WebSocket             │ WebSocket
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│  Server A   │◄───────►│  Server B   │
│ (port 3001) │  Redis  │ (port 3002) │
└─────────────┘  Pub/Sub └─────────────┘
       │                       │
       └───────────┬───────────┘
                   ▼
            ┌─────────────┐
            │    Redis    │
            │  (port 6379)│
            └─────────────┘
```

### Communication Flow

1. **Client → Server (WebSocket):**
   - `join` message: Player joins game with chosen mark (X or O)
   - `move` message: Player submits a move (row, col)

2. **Server → Client (WebSocket):**
   - `joined` message: Confirms player joined, sends current board state
   - `update` message: Broadcasts board updates after each move
   - `end` message: Announces game winner or draw
   - `error` message: Validation errors (invalid move, not your turn, etc.)

3. **Server ↔ Server (Redis Pub/Sub):**
   - `sync_state` message: Synchronizes game state across servers
   - Includes board, turn, status, winner, and sequence number
   - Only applied if sequence number is newer (prevents stale updates)

4. **Distributed Locking (Redis):**
   - `game:{gameId}:player:{mark}` - Player ownership locks (30s TTL)
   - `game:{gameId}:mutex` - Move processing mutex (5s TTL)
   - Prevents duplicate players and concurrent move conflicts

### Data Flow Example

1. Player X connects to Server A and sends `join` with mark "X"
2. Server A acquires Redis lock for "X" and stores player socket
3. Player O connects to Server B and sends `join` with mark "O"
4. Server B acquires Redis lock for "O" 
5. Both servers detect both locks exist → game status changes to "playing"
6. Player X sends `move` to Server A
7. Server A:
   - Acquires game mutex
   - Validates move
   - Updates local game state
   - Publishes `sync_state` to Redis
   - Broadcasts `update` to local clients
   - Releases mutex
8. Server B receives `sync_state` from Redis and broadcasts `update` to its clients
9. Player O sees updated board in real-time despite being on different server

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

If the automatic script doesn't work or you want more control, you can manually run each component:

#### Step 1: Start Redis

**Terminal 1:**
```bash
docker run --rm --name ttt-redis -p 6379:6379 redis
```
Keep this running. You should see Redis startup logs.

#### Step 2: Start Both Servers

**Terminal 2 - Server A:**
```bash
npm run serverA
```
Wait for the log: `Server listening on ws://localhost:3001`

**Terminal 3 - Server B:**
```bash
npm run serverB
```
Wait for the log: `Server listening on ws://localhost:3002`

Both servers are now running independently and connected to Redis.

#### Step 3: Connect Both Clients

**Terminal 4 - Player X:**
```bash
npm run client:X
```
This connects to Server A (port 3001) as Player X.

**Terminal 5 - Player O:**
```bash
npm run client:O
```
This connects to Server B (port 3002) as Player O.

**Alternative:** You can connect both players to the same server or mix and match:
```bash
# Both on Server A
ts-node src/client/client.ts ws://localhost:3001 X
ts-node src/client/client.ts ws://localhost:3001 O

# Both on Server B
ts-node src/client/client.ts ws://localhost:3002 X
ts-node src/client/client.ts ws://localhost:3002 O

# Mixed (default)
npm run client:X  # Server A
npm run client:O  # Server B
```

### How to Test a 2-Player Game

Once all components are running (Redis + 2 Servers + 2 Clients):

1. **Wait for "Status: playing"** 
   - Both client terminals will show the game board
   - Status changes from "waiting" to "playing" when both players join

2. **Player X moves first** (Terminal 4)
   - Enter your move as `row,col` (both 0-2)
   - Example: `1,1` for center square
   - Board coordinates:
     ```
       0   1   2
     0 ┌───┬───┬───┐
     1 │   │ X │   │  ← (1,1) is center
     2 └───┴───┴───┘
     ```

3. **Player O moves next** (Terminal 5)
   - After X moves, it's automatically O's turn
   - Enter your move the same way
   - If you try to move out of turn, you'll see: "⏳ Not your turn yet"

4. **Watch real-time sync**
   - Both terminals update instantly after each move
   - Even though players are on different servers!
   - Try it: X on Server A, O on Server B, moves sync perfectly

5. **Game ends automatically**
   - Win: "You win! 🎉" or "You lose. 😢"
   - Draw: "Game ended in a draw."
   - Connection closes automatically

**Valid Move Examples:**
- `0,0` = top-left corner
- `0,1` = top-middle
- `1,1` = center
- `2,2` = bottom-right corner

**Tips:**
- Try entering moves when it's not your turn to see the feedback
- Try invalid moves (e.g., `3,3` or `abc`) to see error handling
- Press `Ctrl+C` to disconnect a player and test reconnection

### Stopping the Game

To stop all components:
1. Close each terminal window individually, OR
2. Run `docker stop ttt-redis` to stop Redis (other components will fail and exit)

## Configuration

Environment variables:
- `PORT` - Server port (default: 3001)
- `SERVER_ID` - Unique server identifier for sync tracking
- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Coverage:**
- ✅ Game logic (48 tests)
  - Win detection (all patterns)
  - Board state management
  - Game initialization
- ✅ Protocol validation
  - Message type guards
  - Edge cases and malformed data
- ✅ Configuration system
  - Environment variable overrides
  - Default fallbacks

## Logging

The application uses a structured logging system with color-coded output:

**Log Levels:** `debug`, `info`, `warn`, `error`

**Configuration (via `.env`):**
```bash
LOG_LEVEL=info              # Minimum level to display
LOG_CONSOLE=true            # Console output (default: true)
LOG_FILE=false              # File output (default: false)
LOG_FILE_PATH=./logs/app.log  # Log file location
```

**Examples:**
- Set `LOG_LEVEL=debug` to see all sync messages and lock operations
- Set `LOG_LEVEL=error` for production to only see critical issues
- Each component has its own context (e.g., `[RedisSync]`, `[Server:A]`)

## Architecture

### Components

- **`src/shared/protocol.ts`** - TypeScript message interfaces
- **`src/shared/config.ts`** - Centralized configuration with env var support
- **`src/shared/logger.ts`** - Structured logging system
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
  
**Task**
🧪 Backend Developer Home Test: Real-Time Tic-Tac-Toe Over Two Servers
🎯 Task Overview
Build a real-time, multiplayer Tic-Tac-Toe (X and O) game that allows two players to compete against each other from separate clients, connected over WebSocket.

Each player may connect to one of two independent backend servers. When one player makes a move, it should immediately reflect on the other player’s screen—even if the other player is connected to the other server.

🛠 Technical Requirements
✅ Backend
Use Node.js backend framework.

Implement two independent WebSocket servers (e.g., Server A on port 3001, Server B on port 3002).

Clients may connect to either server.

The two servers must:

Synchronize game state in real-time (via WebSocket federation, shared memory layer like Redis pub/sub, or any protocol of your choice).

Handle move validation, win/draw detection, and game state updates.

Reject invalid moves (e.g., wrong turn, occupied cell).

✅ Client
You must build a CLI-based WebSocket client (no browser required).

Client responsibilities:

Connect to either backend server via WebSocket.

Display the game board (e.g., ASCII grid).

Accept input from the user (row, col) via terminal.

Show opponent’s move when it happens (real-time).

You may implement it in the same language as the server or use a separate script.

📄 What You Need to Deliver
A working Tic-Tac-Toe game where:

Two CLI-based WebSocket clients can connect to different backend servers.

Moves are reflected in real-time across both clients via backend sync.

Clearly defined communication protocol between:

Client ↔ Server (WebSocket messages: join, move, update)

Server ↔ Server (your custom sync messages)

🔧 Example Protocol (Suggestion)
WebSocket Message Types (JSON):
{ "type": "join", "playerId": "X" }

{ "type": "move", "row": 1, "col": 2 }

{ "type": "update", "board": [["X","",""],["","O",""],["","",""]], "nextTurn": "X" }

{ "type": "win", "winner": "O" }
⏱ Time Limit
You have 4 hours to complete this task.

📄 Submission
Host your solution in a public GitHub repository.

Include a README.md with:

Architecture and communication design

Instructions to run both servers

Instructions to run the CLI client(s)

How to test a 2-player game from two terminals

🧠 AI Tools Encouraged
We would like to see extensive use of AI-generated code in your solution.

You are encouraged to:

Use any other AI code tool

Include comments or notes in your code or README:

Where AI was used

What prompts you gave (if applicable)

How you modified or improved the AI-generated code

🧪 We will evaluate how effectively you used AI tools to generate high-quality, working code—not just manual coding skill.

✅ Evaluation Criteria
Correctness: Real-time game over two servers works as expected

Code Quality: Readable, well-organized, and documented

Design: Reasonable sync protocol and modular separation

Usability: Simple CLI interface with working gameplay

Real-time: Updates reflect instantly between both clients


🚀 Good Luck!
We’re excited to see what you build!



See inline comments in the code for detailed implementation notes.
