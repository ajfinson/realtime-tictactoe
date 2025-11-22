import {
  createEmptyBoard,
  createInitialGameState,
  getOrCreateGame,
  checkWinner,
  isBoardFull,
  cleanupGame,
  type GameState,
  type GamesMap
} from '../gameLogic';

describe('gameLogic', () => {
  describe('createEmptyBoard', () => {
    it('should create a 3x3 board with empty cells', () => {
      const board = createEmptyBoard();
      expect(board).toHaveLength(3);
      expect(board[0]).toHaveLength(3);
      expect(board[1]).toHaveLength(3);
      expect(board[2]).toHaveLength(3);
      
      board.forEach(row => {
        row.forEach(cell => {
          expect(cell).toBe('');
        });
      });
    });
  });

  describe('createInitialGameState', () => {
    it('should create initial game state with correct defaults', () => {
      const state = createInitialGameState();
      
      expect(state.board).toEqual([
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ]);
      expect(state.nextTurn).toBe('X');
      expect(state.status).toBe('waiting');
      expect(state.winner).toBeNull();
      expect(state.players.X).toBeNull();
      expect(state.players.O).toBeNull();
      expect(state.sequenceNumber).toBe(0);
      expect(state.createdAt).toBeGreaterThan(0);
      expect(state.lockRenewals.X).toBeNull();
      expect(state.lockRenewals.O).toBeNull();
    });
  });

  describe('getOrCreateGame', () => {
    it('should create a new game if it does not exist', () => {
      const games: GamesMap = new Map();
      const game = getOrCreateGame(games, 'game1');
      
      expect(games.has('game1')).toBe(true);
      expect(game.status).toBe('waiting');
      expect(game.nextTurn).toBe('X');
    });

    it('should return existing game if it exists', () => {
      const games: GamesMap = new Map();
      const game1 = getOrCreateGame(games, 'game1');
      game1.status = 'playing';
      game1.sequenceNumber = 5;
      
      const game2 = getOrCreateGame(games, 'game1');
      
      expect(game2).toBe(game1);
      expect(game2.status).toBe('playing');
      expect(game2.sequenceNumber).toBe(5);
    });
  });

  describe('checkWinner', () => {
    it('should return null for empty board', () => {
      const board = createEmptyBoard();
      expect(checkWinner(board)).toBeNull();
    });

    it('should detect horizontal win in row 0', () => {
      const board = createEmptyBoard();
      board[0][0] = 'X';
      board[0][1] = 'X';
      board[0][2] = 'X';
      expect(checkWinner(board)).toBe('X');
    });

    it('should detect horizontal win in row 1', () => {
      const board = createEmptyBoard();
      board[1][0] = 'O';
      board[1][1] = 'O';
      board[1][2] = 'O';
      expect(checkWinner(board)).toBe('O');
    });

    it('should detect horizontal win in row 2', () => {
      const board = createEmptyBoard();
      board[2][0] = 'X';
      board[2][1] = 'X';
      board[2][2] = 'X';
      expect(checkWinner(board)).toBe('X');
    });

    it('should detect vertical win in column 0', () => {
      const board = createEmptyBoard();
      board[0][0] = 'O';
      board[1][0] = 'O';
      board[2][0] = 'O';
      expect(checkWinner(board)).toBe('O');
    });

    it('should detect vertical win in column 1', () => {
      const board = createEmptyBoard();
      board[0][1] = 'X';
      board[1][1] = 'X';
      board[2][1] = 'X';
      expect(checkWinner(board)).toBe('X');
    });

    it('should detect vertical win in column 2', () => {
      const board = createEmptyBoard();
      board[0][2] = 'O';
      board[1][2] = 'O';
      board[2][2] = 'O';
      expect(checkWinner(board)).toBe('O');
    });

    it('should detect diagonal win (top-left to bottom-right)', () => {
      const board = createEmptyBoard();
      board[0][0] = 'X';
      board[1][1] = 'X';
      board[2][2] = 'X';
      expect(checkWinner(board)).toBe('X');
    });

    it('should detect diagonal win (top-right to bottom-left)', () => {
      const board = createEmptyBoard();
      board[0][2] = 'O';
      board[1][1] = 'O';
      board[2][0] = 'O';
      expect(checkWinner(board)).toBe('O');
    });

    it('should return null for incomplete game', () => {
      const board = createEmptyBoard();
      board[0][0] = 'X';
      board[0][1] = 'O';
      board[1][0] = 'O';
      board[1][1] = 'X';
      expect(checkWinner(board)).toBeNull();
    });

    it('should return null for draw game', () => {
      const board = createEmptyBoard();
      board[0] = ['X', 'O', 'X'];
      board[1] = ['O', 'X', 'X'];
      board[2] = ['O', 'X', 'O'];
      expect(checkWinner(board)).toBeNull();
    });
  });

  describe('isBoardFull', () => {
    it('should return false for empty board', () => {
      const board = createEmptyBoard();
      expect(isBoardFull(board)).toBe(false);
    });

    it('should return false for partially filled board', () => {
      const board = createEmptyBoard();
      board[0][0] = 'X';
      board[1][1] = 'O';
      expect(isBoardFull(board)).toBe(false);
    });

    it('should return true for completely filled board', () => {
      const board = createEmptyBoard();
      board[0] = ['X', 'O', 'X'];
      board[1] = ['O', 'X', 'X'];
      board[2] = ['O', 'X', 'O'];
      expect(isBoardFull(board)).toBe(true);
    });
  });

  describe('cleanupGame', () => {
    it('should clear lock renewal intervals', () => {
      const mockInterval = setInterval(() => {}, 1000) as any;
      const game: GameState = createInitialGameState();
      game.lockRenewals.X = mockInterval;
      game.lockRenewals.O = mockInterval;
      
      cleanupGame(game);
      
      expect(game.lockRenewals.X).toBeNull();
      expect(game.lockRenewals.O).toBeNull();
    });

    it('should handle null lock renewals', () => {
      const game: GameState = createInitialGameState();
      
      expect(() => cleanupGame(game)).not.toThrow();
      expect(game.lockRenewals.X).toBeNull();
      expect(game.lockRenewals.O).toBeNull();
    });
  });
});
