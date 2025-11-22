import WebSocket, { WebSocketServer } from 'ws';
import type { RedisSync } from './redisSync';
import { 
  publishSyncState, 
  subscribeToSync,
  acquirePlayerLock,
  releasePlayerLock,
  startLockRenewal,
  acquireGameMutex,
  releaseGameMutex
} from './redisSync';
import {
  type Mark,
  type ClientToServerMessage,
  type SyncStateMessage,
  isClientToServerMessage
} from '../shared/protocol';
import {
  type GameState,
  type GamesMap,
  getOrCreateGame,
  checkWinner,
  isBoardFull,
  broadcastToGame,
  cleanupGame
} from './gameLogic';

interface ExtendedWebSocket extends WebSocket {
  gameId?: string;
  mark?: Mark;
}

const games: GamesMap = new Map();

export function startWebSocketServer(port: number, serverId: string, redisSync: RedisSync): void {
  const wss = new WebSocketServer({ port });

  console.log(`Server ${serverId} listening on ws://localhost:${port}`);

  // Handle sync messages from other servers
  subscribeToSync(redisSync, (msg: SyncStateMessage) => {
    if (msg.origin === serverId) return;

    const game = getOrCreateGame(games, msg.gameId);
    
    // Only apply if sequence number is newer
    if (msg.sequenceNumber <= game.sequenceNumber) {
      console.log(`Ignoring stale sync message (seq ${msg.sequenceNumber} <= ${game.sequenceNumber})`);
      return;
    }
    
    game.board = msg.board;
    game.nextTurn = msg.nextTurn;
    game.status = msg.status;
    game.winner = msg.winner;
    game.sequenceNumber = msg.sequenceNumber;

    if (game.status === 'finished') {
      broadcastToGame(game, {
        type: 'end',
        gameId: msg.gameId,
        board: game.board,
        winner: game.winner
      });
      
      // Cleanup game after 30 seconds
      setTimeout(() => {
        cleanupGame(game);
        games.delete(msg.gameId);
        console.log(`Cleaned up finished game: ${msg.gameId}`);
      }, 30000);
    } else {
      broadcastToGame(game, {
        type: 'update',
        gameId: msg.gameId,
        board: game.board,
        nextTurn: game.nextTurn,
        status: game.status,
        lastMove: msg.lastMove
      });
    }
  }).catch(err => {
    console.error('Failed to subscribe to Redis sync channel:', err);
  });

  wss.on('connection', (socket: ExtendedWebSocket) => {
    socket.on('message', async (data: WebSocket.RawData) => {
      let msg: ClientToServerMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        sendError(socket, 'Invalid JSON');
        return;
      }

      if (!isClientToServerMessage(msg)) {
        sendError(socket, 'Unknown message type');
        return;
      }

      if (msg.type === 'join') {
        await handleJoinMessage(socket, msg, redisSync, serverId);
      } else if (msg.type === 'move') {
        await handleMoveMessage(socket, msg, redisSync, serverId);
      }
    });

    socket.on('close', async () => {
      const gameId = socket.gameId;
      const mark = socket.mark;
      if (!gameId || !mark) return;

      const game = games.get(gameId);
      if (game && game.players[mark] === socket) {
        game.players[mark] = null;
        
        // Stop lock renewal
        if (game.lockRenewals[mark]) {
          clearInterval(game.lockRenewals[mark]!);
          game.lockRenewals[mark] = null;
        }
      }

      // Release Redis lock
      await releasePlayerLock(redisSync, gameId, mark, serverId);
    });
  });
}

// Handlers

async function handleJoinMessage(
  socket: ExtendedWebSocket,
  msg: ClientToServerMessage & { type: 'join' },
  redisSync: RedisSync,
  serverId: string
): Promise<void> {
  const gameId = msg.gameId || 'default';
  const requestedMark = msg.mark;

  if (requestedMark !== 'X' && requestedMark !== 'O') {
    sendError(socket, 'mark must be X or O');
    return;
  }

  // Acquire player lock with TTL
  const lockAcquired = await acquirePlayerLock(redisSync, gameId, requestedMark, serverId);
  if (!lockAcquired) {
    sendError(socket, `Mark ${requestedMark} is already taken`);
    return;
  }

  const game = getOrCreateGame(games, gameId);
  socket.gameId = gameId;
  socket.mark = requestedMark;
  game.players[requestedMark] = socket;
  
  // Start lock renewal heartbeat
  game.lockRenewals[requestedMark] = startLockRenewal(redisSync, gameId, requestedMark, serverId);

  // Check if both players have locks (across all servers)
  const xLockExists = await redisSync.pub.exists(`game:${gameId}:player:X`);
  const oLockExists = await redisSync.pub.exists(`game:${gameId}:player:O`);
  
  if (xLockExists && oLockExists && game.status === 'waiting') {
    game.status = 'playing';
    game.sequenceNumber++;
    
    // Broadcast game start to other servers
    const syncMsg: SyncStateMessage = {
      type: 'sync_state',
      origin: serverId,
      gameId,
      board: game.board,
      nextTurn: game.nextTurn,
      status: game.status,
      winner: game.winner,
      sequenceNumber: game.sequenceNumber,
      lastMove: null
    };
    await publishSyncState(redisSync, syncMsg);
  }

  socket.send(
    JSON.stringify({
      type: 'joined',
      gameId,
      mark: requestedMark,
      board: game.board,
      nextTurn: game.nextTurn,
      status: game.status
    })
  );

  broadcastToGame(game, {
    type: 'update',
    gameId,
    board: game.board,
    nextTurn: game.nextTurn,
    status: game.status,
    lastMove: null
  });
}

async function handleMoveMessage(
  socket: ExtendedWebSocket,
  msg: ClientToServerMessage & { type: 'move' },
  redisSync: RedisSync,
  serverId: string
): Promise<void> {
  const gameId = msg.gameId || 'default';
  const game = getOrCreateGame(games, gameId);

  if (!socket.gameId || socket.gameId !== gameId || !socket.mark) {
    sendError(socket, 'You must join the game first');
    return;
  }

  if (game.status !== 'playing') {
    sendError(socket, 'Game is not in playing state');
    return;
  }

  if (game.nextTurn !== socket.mark) {
    sendError(socket, `It is not your turn, current turn: ${game.nextTurn}`);
    return;
  }

  const { row, col } = msg;
  if (
    typeof row !== 'number' ||
    typeof col !== 'number' ||
    row < 0 ||
    row > 2 ||
    col < 0 ||
    col > 2
  ) {
    sendError(socket, 'row and col must be between 0 and 2');
    return;
  }

  if (game.board[row][col] !== '') {
    sendError(socket, 'Cell already occupied');
    return;
  }

  // Acquire mutex to prevent race conditions
  const mutexAcquired = await acquireGameMutex(redisSync, gameId, serverId);
  if (!mutexAcquired) {
    sendError(socket, 'Game is being updated, please try again');
    return;
  }

  try {
    game.board[row][col] = socket.mark;
    game.sequenceNumber++;
    const lastMove = { mark: socket.mark, row, col };

    const winner = checkWinner(game.board);
    if (winner) {
      game.status = 'finished';
      game.winner = winner;

      broadcastToGame(game, {
        type: 'end',
        gameId,
        board: game.board,
        winner: winner
      });

      const syncMsg: SyncStateMessage = {
        type: 'sync_state',
        origin: serverId,
        gameId,
        board: game.board,
        nextTurn: game.nextTurn,
        status: game.status,
        winner: game.winner,
        sequenceNumber: game.sequenceNumber,
        lastMove
      };
      await publishSyncState(redisSync, syncMsg);
      
      // Cleanup finished game after 30 seconds
      setTimeout(() => {
        cleanupGame(game);
        games.delete(gameId);
        console.log(`Cleaned up finished game: ${gameId}`);
      }, 30000);
      
      return;
    }

    if (isBoardFull(game.board)) {
      game.status = 'finished';
      game.winner = null;

      broadcastToGame(game, {
        type: 'end',
        gameId,
        board: game.board,
        winner: null
      });

      const syncMsg: SyncStateMessage = {
        type: 'sync_state',
        origin: serverId,
        gameId,
        board: game.board,
        nextTurn: game.nextTurn,
        status: game.status,
        winner: game.winner,
        sequenceNumber: game.sequenceNumber,
        lastMove
      };
      await publishSyncState(redisSync, syncMsg);
      
      // Cleanup finished game after 30 seconds
      setTimeout(() => {
        cleanupGame(game);
        games.delete(gameId);
        console.log(`Cleaned up finished game: ${gameId}`);
      }, 30000);
      
      return;
    }

    game.nextTurn = game.nextTurn === 'X' ? 'O' : 'X';

    broadcastToGame(game, {
      type: 'update',
      gameId,
      board: game.board,
      nextTurn: game.nextTurn,
      status: game.status,
      lastMove
    });

    const syncMsg: SyncStateMessage = {
      type: 'sync_state',
      origin: serverId,
      gameId,
      board: game.board,
      nextTurn: game.nextTurn,
      status: game.status,
      winner: game.winner,
      sequenceNumber: game.sequenceNumber,
      lastMove
    };
    await publishSyncState(redisSync, syncMsg);
  } finally {
    await releaseGameMutex(redisSync, gameId, serverId);
  }
}

function sendError(socket: WebSocket, message: string): void {
  socket.send(JSON.stringify({ type: 'error', message }));
}
