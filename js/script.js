document.addEventListener('DOMContentLoaded', () => {
    let board = null;
    const game = new Chess();
    const moveHistory = document.getElementById('move-history');
    let moveCount = 1;
    let userColor = 'w';
    const historyStack = [];

    var whiteSquareGrey = '#a9a9a9';
    var blackSquareGrey = '#696969';

    // Initialize Stockfish
    const stockfish = new Worker('js/stockfish.js');
    let engineRunning = false;
    let difficulty = 5; // Default depth
    let timeControl = 1000; // Default time control in ms

    // Make a move using Stockfish
    const makeEngineMove = () => {
        if (game.game_over()) {
            alert('Checkmate');
            return;
        }

        stockfish.postMessage('ucinewgame');
        stockfish.postMessage('position fen ' + game.fen());
        stockfish.postMessage(`go depth ${difficulty} movetime ${timeControl}`);

        stockfish.onmessage = function(event) {
            const line = event.data;
            if (line.startsWith('bestmove')) {
                const move = line.split(' ')[1];
                game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: 'q' });
                board.position(game.fen());
                recordMove(move, moveCount);
                moveCount++;
            }
        };
    };

    const recordMove = (move, count) => {
        const formattedMove = count % 2 === 1 ? `${Math.ceil(count / 2)}. ${move}` :
                                                `${move} - `;
        const historyEntry = document.createElement('span');
        historyEntry.textContent = formattedMove + ' ';
        historyEntry.addEventListener('click', () => {
            const fen = historyStack[count - 1];
            game.load(fen);
            board.position(fen);
            moveHistory.textContent = historyStack.slice(0, count).map((move, index) => index % 2 === 0 ? `${Math.ceil(index / 2) + 1}. ${move}` : `${move} - `).join(' ');
        });
        moveHistory.appendChild(historyEntry);
        moveHistory.scrollTop = moveHistory.scrollHeight;
        historyStack.push(game.fen());
    };

    const getHint = () => {
        stockfish.postMessage('ucinewgame');
        stockfish.postMessage('position fen ' + game.fen());
        stockfish.postMessage(`go depth ${difficulty}`);

        stockfish.onmessage = function(event) {
            const line = event.data;
            if (line.startsWith('bestmove')) {
                const move = line.split(' ')[1];
                alert(`Best move: ${move.slice(0, 2)} to ${move.slice(2, 4)}`);
            }
        };
    };

    const onDragStart = (source, piece) => {
        // Allow user to drag only their own pieces
        return !game.game_over() && piece.search(userColor) === 0;
    };

    function onMouseoverSquare (square, piece) {
        // get list of possible moves for this square
        var moves = game.moves({
            square: square,
            verbose: true
        });

        // exit if there are no moves available for this square
        if (moves.length === 0) return;
        // highlight the square they moused over
        greySquare(square);
        // highlight the possible squares for this piece
        for (var i = 0; i < moves.length; i++) {
            greySquare(moves[i].to);
        }
    }

    function onMouseoutSquare (square, piece) {
        removeGreySquares();
    }

    const onDrop = (source, target) => {
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return 'snapback';

        recordMove(move.san, moveCount);
        moveCount++;

        window.setTimeout(makeEngineMove, 250);
    };

    const onSnapEnd = () => {
        board.position(game.fen());
    };

    const boardConfig = {
        showNotation: true,
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onMouseoutSquare: onMouseoutSquare,
        onMouseoverSquare: onMouseoverSquare,
        onSnapEnd: onSnapEnd,
        moveSpeed: 'fast',
        snapBackSpeed: 500,
        snapSpeed: 100
    };

    board = Chessboard('board', boardConfig);

    // Handle modal
    const modal = document.getElementById('settingsModal');
    const btn = document.querySelector('.settings');
    const span = document.getElementsByClassName('close')[0];

    btn.onclick = () => {
        modal.style.display = 'block';
    };

    span.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    document.getElementById('settingsForm').addEventListener('submit', (event) => {
        event.preventDefault();
        difficulty = document.getElementById('difficulty').value;
        timeControl = document.getElementById('timeControl').value;
        modal.style.display = 'none';
    });

    document.querySelector('.play-again').addEventListener('click', () => {
        game.reset();
        board.start();
        moveHistory.textContent = '';
        moveCount = 1;
        userColor = 'w';
        historyStack.length = 0;
    });

    document.querySelector('.set-pos').addEventListener('click', () => {
        const fen = prompt('Enter the FEN notation for the desired position');
        if (fen !== null) {
            if (game.load(fen)) {
                board.position(fen);
                moveHistory.textContent = '';
                moveCount = 1;
                userColor = 'w';
                historyStack.length = 0;
            } else {
                alert('Invalid FEN');
            }
        }
    });

    document.querySelector('.flip-board').addEventListener('click', () => {
        board.flip();
        userColor = userColor === 'w' ? 'b' : 'w';
    });

    document.querySelector('.hint').addEventListener('click', getHint);
});