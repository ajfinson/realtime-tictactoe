export type Mark = 'X' | 'O';
export type Cell = '' | Mark;
export type Board = Cell[][]; // 3x3
export type GameStatus = 'waiting' | 'playing' | 'finished';

// Client -> Server

export interface JoinMessage {
  type: 'join';
  gameId: string;
  mark: Mark;
}

export interface MoveMessage {
  type: 'move';
  gameId: string;
  row: number;
  col: number;
}

export type ClientToServerMessage = JoinMessage | MoveMessage;

// Server -> Client

export interface JoinedMessage {
  type: 'joined';
  gameId: string;
  mark: Mark;
  board: Board;
  nextTurn: Mark;
  status: GameStatus;
}

export interface UpdateMessage {
  type: 'update';
  gameId: string;
  board: Board;
  nextTurn: Mark;
  status: GameStatus;
  lastMove: {
    mark: Mark;
    row: number;
    col: number;
  } | null;
}

export interface EndMessage {
  type: 'end';
  gameId: string;
  board: Board;
  winner: Mark | null;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type ServerToClientMessage =
  | JoinedMessage
  | UpdateMessage
  | EndMessage
  | ErrorMessage;

// Server <-> Server (Redis sync)

export interface SyncStateMessage {
  type: 'sync_state';
  origin: string;
  gameId: string;
  board: Board;
  nextTurn: Mark;
  status: GameStatus;
  winner: Mark | null;
  sequenceNumber: number;
  lastMove: {
    mark: Mark;
    row: number;
    col: number;
  } | null;
}

// Runtime guard
export function isClientToServerMessage(obj: any): obj is ClientToServerMessage {
  return obj && typeof obj.type === 'string' && (obj.type === 'join' || obj.type === 'move');
}
