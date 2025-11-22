# Real-Time Tic-Tac-Toe over Two Node.js Servers

This project implements a real-time, multiplayer Tic-Tac-Toe game where:

- Two independent Node.js backend servers run WebSocket endpoints (e.g. on ports 3001 and 3002).
- Each player connects from a CLI client to either server.
- Game state is synchronized in real time across both servers using Redis pub/sub.
- Moves are validated, wins/draws detected, and invalid moves rejected.

See the assignment description in your interview for full requirements.

## Running

1. Start Redis, for example:

```bash
docker run --name ttt-redis -p 6379:6379 redis
```

2. Install dependencies:

```bash
npm install
```

3. Start the servers (in two terminals):

```bash
npm run serverA
npm run serverB
```

4. Start two clients (in two terminals):

```bash
npm run client:X
npm run client:O
```

Then play by typing `row,col` (e.g. `0,2`) when it's your turn.

See inline comments in the code for architecture and protocol details.
