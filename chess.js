const chessboard = document.getElementById('chessboard');

const piecesUnicode = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

// Initial chessboard setup in FEN-like notation
let board = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

let selectedSquare = null;
let currentPlayer = 'white';
let gameOver = false;
let movesMade = 0;
let lastEvalScore = 0;
let lastBoard = null;

const gameStatus = document.getElementById('game-status');
const restartButton = document.getElementById('restart-button');
const currentPlayerSpan = document.getElementById('current-player');
const movesMadeSpan = document.getElementById('moves-made');
const evalScoreSpan = document.getElementById('eval-score');
const moveQualitySpan = document.createElement('span');

restartButton.addEventListener('click', () => {
  resetGame();
});

function classifyMove(prevEval, newEval, player) {
  // For white, higher eval is better; for black, lower eval is better
  const diff = player === 'white' ? newEval - prevEval : prevEval - newEval;
  if (diff > 50) return 'Excellent move';
  if (diff > 20) return 'Great move';
  if (diff < -30) return 'Blunder';
  return 'Good move';
}

// Enhanced evaluation function with mobility and center control
function evaluateBoard(boardState) {
  const pieceValues = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 0,
    'P': -10, 'N': -30, 'B': -30, 'R': -50, 'Q': -90, 'K': 0
  };
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = boardState[row][col];
      if (piece) {
        score += pieceValues[piece] || 0;
      }
    }
  }

  // Mobility: number of valid moves for each side
  const whiteMoves = getAllValidMoves('white', boardState).length;
  const blackMoves = getAllValidMoves('black', boardState).length;
  score += (blackMoves - whiteMoves) * 0.1;

  // Center control: count pieces in center squares (3,3),(3,4),(4,3),(4,4)
  const centerSquares = [
    [3,3],[3,4],[4,3],[4,4]
  ];
  let whiteCenterControl = 0;
  let blackCenterControl = 0;
  for (const [r,c] of centerSquares) {
    const piece = boardState[r][c];
    if (piece) {
      if (piece === piece.toUpperCase()) whiteCenterControl++;
      else blackCenterControl++;
    }
  }
  score += (blackCenterControl - whiteCenterControl) * 0.5;

  return score;
}

function updateAnalysis() {
  currentPlayerSpan.textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
  movesMadeSpan.textContent = movesMade;
  const evalScore = evaluateBoard(board);
  evalScoreSpan.textContent = evalScore.toFixed(2);

  if (lastBoard !== null) {
    const moveQuality = classifyMove(lastEvalScore, evalScore, currentPlayer === 'white' ? 'black' : 'white');
    moveQualitySpan.textContent = ` - ${moveQuality}`;
    moveQualitySpan.className = '';
    if (moveQuality === 'Excellent move') {
      moveQualitySpan.classList.add('excellent-move');
    } else if (moveQuality === 'Great move') {
      moveQualitySpan.classList.add('great-move');
    } else if (moveQuality === 'Blunder') {
      moveQualitySpan.classList.add('blunder-move');
    } else {
      moveQualitySpan.classList.add('good-move');
    }
    movesMadeSpan.parentNode.appendChild(moveQualitySpan);

    // Also show move quality in game status for player moves
    if (currentPlayer === 'black') { // after player move, before AI move
      setGameStatus(moveQuality);
    }
  }
  lastEvalScore = evalScore;
  lastBoard = copyBoard(board);
}

function updateAnalysis() {
  currentPlayerSpan.textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
  movesMadeSpan.textContent = movesMade;
  const evalScore = evaluateBoard(board);
  evalScoreSpan.textContent = evalScore.toFixed(2);
}

function createBoard() {
  chessboard.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      if ((row + col) % 2 === 0) {
        square.classList.add('light');
      } else {
        square.classList.add('dark');
      }
      square.dataset.row = row;
      square.dataset.col = col;
      square.addEventListener('click', onSquareClick);
      const piece = board[row][col];
      if (piece) {
        square.textContent = piecesUnicode[piece];
      }
      chessboard.appendChild(square);
    }
  }
}

function onSquareClick(e) {
  if (gameOver) return;

  const row = parseInt(e.currentTarget.dataset.row);
  const col = parseInt(e.currentTarget.dataset.col);
  const piece = board[row][col];

  if (selectedSquare) {
    if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
      movePiece(selectedSquare.row, selectedSquare.col, row, col);
      movesMade++;
      updateAnalysis();
      if (isInCheck(currentPlayer, board)) {
        setGameStatus(currentPlayer + ' is in check!');
      } else {
        clearGameStatus();
      }
      if (isCheckmate(currentPlayer, board)) {
        const winner = currentPlayer === 'white' ? 'Black' : 'White';
        setGameStatus('Checkmate! ' + winner + ' wins the game.');
        endGame();
        return;
      }
      if (isStalemate(currentPlayer, board)) {
        setGameStatus('Stalemate! Game is a draw.');
        endGame();
        return;
      }
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
      createBoard();
      clearSelection();
      if (currentPlayer === 'black') {
        setTimeout(makeAIMove, 500);
      }
      return;
    }
    clearSelection();
    createBoard();
  } else {
    if (piece && isCurrentPlayerPiece(piece)) {
      selectedSquare = {row, col};
      highlightSelected(row, col);
    }
  }
}

function makeAIMove() {
  if (gameOver) return;

  const depth = 3;
  const bestMove = minimaxRoot(depth, 'black');
  if (!bestMove) {
    setGameStatus('Game over! No valid moves for AI.');
    endGame();
    return;
  }
  movePiece(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
  movesMade++;
  updateAnalysis();
  if (isInCheck(currentPlayer, board)) {
    setGameStatus(currentPlayer + ' is in check!');
  } else {
    clearGameStatus();
  }
  if (isCheckmate(currentPlayer, board)) {
    const winner = currentPlayer === 'white' ? 'Black' : 'White';
    setGameStatus('Checkmate! ' + winner + ' wins the game.');
    endGame();
    return;
  }
  if (isStalemate(currentPlayer, board)) {
    setGameStatus('Stalemate! Game is a draw.');
    endGame();
    return;
  }
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  createBoard();
}

function isInCheck(player, boardState) {
  const king = player === 'white' ? 'K' : 'k';
  let kingPos = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (boardState[r][c] === king) {
        kingPos = {row: r, col: c};
        break;
      }
    }
    if (kingPos) break;
  }
  if (!kingPos) return false;

  const opponent = player === 'white' ? 'black' : 'white';
  const opponentMoves = getAllValidMoves(opponent, boardState);
  for (const move of opponentMoves) {
    if (move.toRow === kingPos.row && move.toCol === kingPos.col) {
      return true;
    }
  }
  return false;
}

function isCheckmate(player, boardState) {
  if (!isInCheck(player, boardState)) return false;
  const moves = getAllValidMoves(player, boardState);
  for (const move of moves) {
    const boardCopy = copyBoard(boardState);
    makeMoveOnBoard(boardCopy, move);
    if (!isInCheck(player, boardCopy)) {
      return false;
    }
  }
  return true;
}

function isStalemate(player, boardState) {
  if (isInCheck(player, boardState)) return false;
  const moves = getAllValidMoves(player, boardState);
  for (const move of moves) {
    const boardCopy = copyBoard(boardState);
    makeMoveOnBoard(boardCopy, move);
    if (!isInCheck(player, boardCopy)) {
      return false;
    }
  }
  return true;
}

function getAllValidMoves(player, boardState = board) {
  const moves = [];
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      if (boardState[fromRow][fromCol] && (player === 'white' ? boardState[fromRow][fromCol] === boardState[fromRow][fromCol].toUpperCase() : boardState[fromRow][fromCol] === boardState[fromRow][fromCol].toLowerCase())) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMoveOnBoard(boardState, fromRow, fromCol, toRow, toCol, player)) {
              moves.push({fromRow, fromCol, toRow, toCol});
            }
          }
        }
      }
    }
  }
  return moves;
}

function minimaxRoot(depth, player) {
  const moves = getAllValidMoves(player);
  let bestMove = null;
  let bestValue = -Infinity;
  for (const move of moves) {
    const boardCopy = copyBoard(board);
    makeMoveOnBoard(boardCopy, move);
    const value = minimax(boardCopy, depth - 1, -Infinity, Infinity, false);
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  return bestMove;
}

function minimax(boardState, depth, alpha, beta, isMaximizingPlayer) {
  if (depth === 0) {
    return evaluateBoard(boardState);
  }
  const player = isMaximizingPlayer ? 'black' : 'white';
  const moves = getAllValidMoves(player, boardState);
  if (moves.length === 0) {
    return isMaximizingPlayer ? -Infinity : Infinity;
  }
  if (isMaximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(boardState);
      makeMoveOnBoard(newBoard, move);
      const eval = minimax(newBoard, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(boardState);
      makeMoveOnBoard(newBoard, move);
      const eval = minimax(newBoard, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function evaluateBoard(boardState) {
  const pieceValues = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 0,  // King is invaluable, no capture
    'P': -10, 'N': -30, 'B': -30, 'R': -50, 'Q': -90, 'K': 0
  };
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = boardState[row][col];
      if (piece) {
        score += pieceValues[piece] || 0;
      }
    }
  }
  return score;
}

function copyBoard(boardToCopy) {
  return boardToCopy.map(row => row.slice());
}

function makeMoveOnBoard(boardState, move) {
  boardState[move.toRow][move.toCol] = boardState[move.fromRow][move.fromCol];
  boardState[move.fromRow][move.fromCol] = '';
}

function isValidMoveOnBoard(boardState, fromRow, fromCol, toRow, toCol, player) {
  const piece = boardState[fromRow][fromCol];
  if (!piece) return false;
  if (player === 'white' && piece !== piece.toUpperCase()) return false;
  if (player === 'black' && piece !== piece.toLowerCase()) return false;

  const target = boardState[toRow][toCol];
  if (target && ((player === 'white' && target === target.toUpperCase()) || (player === 'black' && target === target.toLowerCase()))) return false;

  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;

  const pieceType = piece.toLowerCase();

  switch(pieceType) {
    case 'p': // Pawn
      const direction = piece === 'P' ? -1 : 1;
      if (colDiff === 0 && rowDiff === direction && !target) {
        return true;
      }
      if (colDiff === 0 && rowDiff === 2 * direction && !target && !boardState[fromRow + direction][fromCol]) {
        if ((piece === 'P' && fromRow === 6) || (piece === 'p' && fromRow === 1)) {
          return true;
        }
      }
      if (Math.abs(colDiff) === 1 && rowDiff === direction && target && !((player === 'white' && target === target.toUpperCase()) || (player === 'black' && target === target.toLowerCase()))) {
        return true;
      }
      return false;

    case 'r': // Rook
      if (rowDiff !== 0 && colDiff !== 0) return false;
      if (!isPathClearOnBoard(boardState, fromRow, fromCol, toRow, toCol)) return false;
      return true;

    case 'n': // Knight
      if ((Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) || (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2)) {
        return true;
      }
      return false;

    case 'b': // Bishop
      if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
      if (!isPathClearOnBoard(boardState, fromRow, fromCol, toRow, toCol)) return false;
      return true;

    case 'q': // Queen
      if (rowDiff === 0 || colDiff === 0) {
        if (!isPathClearOnBoard(boardState, fromRow, fromCol, toRow, toCol)) return false;
        return true;
      }
      if (Math.abs(rowDiff) === Math.abs(colDiff)) {
        if (!isPathClearOnBoard(boardState, fromRow, fromCol, toRow, toCol)) return false;
        return true;
      }
      return false;

    case 'k': // King
      if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {
        return true;
      }
      return false;

    default:
      return false;
  }
}

function isPathClearOnBoard(boardState, fromRow, fromCol, toRow, toCol) {
  const rowStep = Math.sign(toRow - fromRow);
  const colStep = Math.sign(toCol - fromCol);

  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;

  while (currentRow !== toRow || currentCol !== toCol) {
    if (boardState[currentRow][currentCol] !== '') {
      return false;
    }
    currentRow += rowStep;
    currentCol += colStep;
  }
  return true;
}

function isCurrentPlayerPiece(piece) {
  if (currentPlayer === 'white') {
    return piece === piece.toUpperCase();
  } else {
    return piece === piece.toLowerCase();
  }
}

function highlightSelected(row, col) {
  const squares = document.querySelectorAll('.square');
  squares.forEach(sq => {
    if (parseInt(sq.dataset.row) === row && parseInt(sq.dataset.col) === col) {
      sq.classList.add('selected');
    } else {
      sq.classList.remove('selected');
    }
  });
}

function setGameStatus(message) {
  gameStatus.textContent = message;
}

function clearGameStatus() {
  gameStatus.textContent = '';
}

function endGame() {
  gameOver = true;
  restartButton.style.display = 'inline-block';

  // Show win/lose message for human player (white)
  if (isCheckmate('black', board)) {
    setGameStatus('You win! Black is checkmated.');
  } else if (isCheckmate('white', board)) {
    setGameStatus('You lose! White is checkmated.');
  }
}

function resetGame() {
  board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  selectedSquare = null;
  currentPlayer = 'white';
  gameOver = false;
  movesMade = 0;
  restartButton.style.display = 'none';
  clearGameStatus();
  createBoard();
  updateAnalysis();
  if (currentPlayer === 'black') {
    setTimeout(makeAIMove, 500);
  }
}

function clearSelection() {
  selectedSquare = null;
  const squares = document.querySelectorAll('.square');
  squares.forEach(sq => sq.classList.remove('selected'));
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
  return isValidMoveOnBoard(board, fromRow, fromCol, toRow, toCol, currentPlayer);
}

function movePiece(fromRow, fromCol, toRow, toCol) {
  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = '';
}

createBoard();

if (currentPlayer === 'black') {
  setTimeout(makeAIMove, 500);
}

// Simulate a game by making moves for human player and AI alternately
async function simulateGame() {
  console.log('Starting simulated game...');
  resetGame();

  // Helper to make a move for human player (white)
  function makeHumanMove() {
    const moves = getAllValidMoves('white');
    if (moves.length === 0) return false;
    // Pick a random valid move (improved strategy)
    const move = moves[Math.floor(Math.random() * moves.length)];
    movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
    movesMade++;
    updateAnalysis();
    currentPlayer = 'black';
    createBoard();
    clearSelection();
    return true;
  }

  // Helper to make AI move
  function makeAIMoveSync() {
    if (gameOver) return false;
    const depth = 3;
    const bestMove = minimaxRoot(depth, 'black');
    if (!bestMove) {
      setGameStatus('Game over! No valid moves for AI.');
      endGame();
      return false;
    }
    movePiece(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
    movesMade++;
    updateAnalysis();
    if (isInCheck(currentPlayer, board)) {
      setGameStatus(currentPlayer + ' is in check!');
    } else {
      clearGameStatus();
    }
    if (isCheckmate(currentPlayer, board)) {
      const winner = currentPlayer === 'white' ? 'Black' : 'White';
      setGameStatus('Checkmate! ' + winner + ' wins the game.');
      endGame();
      return false;
    }
    if (isStalemate(currentPlayer, board)) {
      setGameStatus('Stalemate! Game is a draw.');
      endGame();
      return false;
    }
    currentPlayer = 'white';
    createBoard();
    return true;
  }

  // Play moves alternately until game over or max moves reached
  let moveCount = 0;
  const maxMoves = 20;
  while (!gameOver && moveCount < maxMoves) {
    const humanMoved = makeHumanMove();
    if (!humanMoved) break;
    console.log(`Human move ${moveCount + 1} made.`);
    if (gameOver) break;
    const aiMoved = makeAIMoveSync();
    if (!aiMoved) break;
    console.log(`AI move ${moveCount + 1} made.`);
    moveCount++;
  }
  console.log('Simulation ended.');
}

// Expose simulateGame to global for manual triggering
window.simulateGame = simulateGame;
