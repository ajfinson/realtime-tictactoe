import WebSocket from 'ws';
import readline from 'readline';
import {
  type Board,
  type Mark,
  type ServerToClientMessage,
  type JoinedMessage,
  type UpdateMessage,
  type EndMessage,
  type ErrorMessage
} from '../shared/protocol';

const serverUrl = process.argv[2] || 'ws://localhost:3001';
const mark = (process.argv[3] || 'X').toUpperCase() as Mark;

let board: Board = [
  ['', '', ''],
  ['', '', ''],
  ['', '', '']
];
let nextTurn: Mark = 'X';
let status: 'waiting' | 'playing' | 'finished' = 'waiting';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function printBoard() {
  console.clear();
  console.log(`Connected to ${serverUrl} as ${mark}`);
  console.log('Current board:');
  console.log('  0   1   2');
  board.forEach((row, i) => {
    const line = row.map(cell => cell || ' ').join(' | ');
    console.log(`${i} ${line}`);
    if (i < 2) console.log('  ---------');
  });
  console.log();
  console.log(`Status: ${status}`);
  if (status === 'playing') {
    console.log(`Next turn: ${nextTurn}`);
  }
}

function askForMove(ws: WebSocket) {
  if (status !== 'playing') return;
  if (nextTurn !== mark) return;

  rl.question(`Your move (${mark}). Enter "row,col" (0-2): `, answer => {
    const parts = answer.split(',');
    if (parts.length !== 2) {
      console.log('Invalid format. Use row,col');
      return askForMove(ws);
    }
    const row = Number(parts[0]);
    const col = Number(parts[1]);
    if (Number.isNaN(row) || Number.isNaN(col)) {
      console.log('Row and col must be numbers');
      return askForMove(ws);
    }

    ws.send(
      JSON.stringify({
        type: 'move',
        gameId: 'default',
        row,
        col
      })
    );
  });
}

const ws = new WebSocket(serverUrl);

ws.on('open', () => {
  console.log(`Connected to ${serverUrl}. Joining game as ${mark}...`);
  ws.send(
    JSON.stringify({
      type: 'join',
      gameId: 'default',
      mark
    })
  );
});

ws.on('message', data => {
  let msg: ServerToClientMessage;
  try {
    msg = JSON.parse(data.toString());
  } catch {
    console.error('Invalid JSON from server:', data.toString());
    return;
  }

  switch (msg.type) {
    case 'joined': {
      const m = msg as JoinedMessage;
      board = m.board;
      nextTurn = m.nextTurn;
      status = m.status;
      printBoard();
      askForMove(ws);
      break;
    }
    case 'update': {
      const m = msg as UpdateMessage;
      board = m.board;
      nextTurn = m.nextTurn;
      status = m.status;
      printBoard();
      if (m.lastMove && m.lastMove.mark !== mark) {
        console.log(`Opponent played at (${m.lastMove.row}, ${m.lastMove.col})`);
      }
      askForMove(ws);
      break;
    }
    case 'end': {
      const m = msg as EndMessage;
      board = m.board;
      status = 'finished';
      printBoard();
      if (m.winner === null) {
        console.log('Game ended in a draw.');
      } else if (m.winner === mark) {
        console.log('You win! 🎉');
      } else {
        console.log('You lose. 😢');
      }
      rl.close();
      ws.close();
      break;
    }
    case 'error': {
      const m = msg as ErrorMessage;
      console.log(`Error from server: ${m.message}`);
      if (status === 'playing' && nextTurn === mark) {
        askForMove(ws);
      }
      break;
    }
    default:
      console.log('Unknown message from server:', msg);
  }
});

ws.on('close', () => {
  console.log('Connection closed.');
  rl.close();
});

ws.on('error', err => {
  console.error('WebSocket error:', err);
});
