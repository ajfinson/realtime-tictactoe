import type { Board, Cell, GameStatus, Mark } from '../shared/protocol';

// Players map is typed as any to avoid depending directly on ws types here
export interface PlayersMap {
  X: any | null;
  O: any | null;
}

export interface GameState {
  board: Board;
  nextTurn: Mark;
  status: GameStatus;
  winner: Mark | null;
  players: PlayersMap;
  sequenceNumber: number;
  createdAt: number;
  lockRenewals: {
    X: ReturnType<typeof setInterval> | null;
    O: ReturnType<typeof setInterval> | null;
  };
}

export type GamesMap = Map<string, GameState>;

export function createEmptyBoard(): Board {
  return [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ];
}

export function createInitialGameState(): GameState {
  return {
    board: createEmptyBoard(),
    nextTurn: 'X',
    status: 'waiting',
    winner: null,
    players: { X: null, O: null },
    sequenceNumber: 0,
    createdAt: Date.now(),
    lockRenewals: { X: null, O: null }
  };
}

export function getOrCreateGame(games: GamesMap, gameId: string): GameState {
  let game = games.get(gameId);
  if (!game) {
    game = createInitialGameState();
    games.set(gameId, game);
  }
  return game;
}

export function checkWinner(board: Board): Mark | null {
  const lines: Cell[][] = [
    // rows
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],
    // columns
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],
    // diagonals
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]]
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (a && a === b && a === c) {
      return a as Mark;
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every(row => row.every(cell => cell !== ''));
}

export function broadcastToGame(game: GameState, message: any) {
  const payload = JSON.stringify(message);
  (['X', 'O'] as Mark[]).forEach(mark => {
    const ws = game.players[mark];
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  });
}

export function cleanupGame(game: GameState) {
  (['X', 'O'] as Mark[]).forEach(mark => {
    if (game.lockRenewals[mark]) {
      clearInterval(game.lockRenewals[mark]!);
      game.lockRenewals[mark] = null;
    }
  });
}
