import { isClientToServerMessage } from '../../shared/protocol';

describe('protocol', () => {
  describe('isClientToServerMessage', () => {
    it('should return true for valid join message', () => {
      const msg = {
        type: 'join',
        gameId: 'game1',
        mark: 'X'
      };
      expect(isClientToServerMessage(msg)).toBe(true);
    });

    it('should return true for valid move message', () => {
      const msg = {
        type: 'move',
        gameId: 'game1',
        row: 0,
        col: 1
      };
      expect(isClientToServerMessage(msg)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isClientToServerMessage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isClientToServerMessage(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isClientToServerMessage(123)).toBe(false);
      expect(isClientToServerMessage('string')).toBe(false);
      expect(isClientToServerMessage(true)).toBe(false);
    });

    it('should return false for object without type field', () => {
      const msg = { gameId: 'game1' };
      expect(isClientToServerMessage(msg)).toBe(false);
    });

    it('should return false for object with non-string type', () => {
      const msg = { type: 123, gameId: 'game1' };
      expect(isClientToServerMessage(msg)).toBe(false);
    });

    it('should return false for unknown message type', () => {
      const msg = { type: 'update', gameId: 'game1' };
      expect(isClientToServerMessage(msg)).toBe(false);
    });

    it('should return false for server message types', () => {
      const msg = { type: 'joined', gameId: 'game1' };
      expect(isClientToServerMessage(msg)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isClientToServerMessage({})).toBe(false);
    });

    it('should return false for array', () => {
      expect(isClientToServerMessage([])).toBe(false);
      expect(isClientToServerMessage([{ type: 'join' }])).toBe(false);
    });
  });
});
