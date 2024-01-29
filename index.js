const { Client, Intents, MessageActionRow, MessageButton } = require('discord.js');
const { debounce } = require('lodash'); // Import debounce function for button handling
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]
});

// Define emojis for blocks
const blockEmojis = {
    'I': '🟩',
    'O': '🟨',
    // Add more blocks and emojis as needed
};

// Define all possible Tetrominos
const tetrominos = [
    [
        [1, 1, 1, 1]
    ], // I
    [
        [1, 1],
        [1, 1]
    ], // O
    [
        [1, 1, 1],
        [0, 1, 0]
    ], // S
    [
        [0, 1, 1],
        [1, 1]
    ], // Z
    [
        [1, 1, 0],
        [0, 1, 1]
    ], // T
    [
        [1, 1, 1, 1, 1]
    ], // J
    [
        [1, 1, 1, 1, 1]
    ], // L
];

let gameState = {
    tetrominoRow: 0,
    tetrominoCol: 0,
    tetromino: generateRandomTetromino(),
    board: Array.from({ length: 20 }, () => Array(10).fill('⬛')),
};

let gameInterval; // Variable to store the interval for automatic falling

client.once('ready', () => {
    console.log('Bot is ready');
});

client.on('messageCreate', async(message) => {
    if (message.content.toLowerCase() === '!starttetris') {
        await startTetrisGame(message);
    }
});

function renderBoard(board) {
    return board.map((row) => row.map((block) => blockEmojis[block] || block).join(' ')).join('\n');
}

async function startTetrisGame(message) {
    gameState.board = Array.from({ length: 20 }, () => Array(10).fill('⬛'));
    gameState.tetrominoCol = Math.floor(gameState.board[0].length / 2) - 2;
    const renderedBoard = renderBoard(gameState.board);
    const buttonMessage = await message.channel.send(`${renderedBoard}\n\nPress the buttons below to move the Tetromino!`);

    // Create buttons
    const buttons = [
        new MessageButton().setCustomId('left').setLabel('Move Left').setStyle('PRIMARY'),
        new MessageButton().setCustomId('right').setLabel('Move Right').setStyle('SECONDARY'),
        new MessageButton().setCustomId('rotate').setLabel('Rotate').setStyle('DANGER'),
        new MessageButton().setCustomId('harddrop').setLabel('Hard Drop').setStyle('SUCCESS'), // Added hard drop button
    ];

    // Send the message with the buttons
    const row = new MessageActionRow().addComponents(buttons);
    await buttonMessage.edit({ components: [row] });

    // Add your logic to handle the Tetris game and reactions here
    client.on('interactionCreate', async(interaction) => {
        try {
            if (!interaction.isButton()) return;

            // Debounce button interactions to avoid excessive calls (adjust delay as needed)
            const debouncedHandleInteraction = debounce(async() => {
                console.log(`Clicked ${interaction.customId} from ${interaction.user.username}`);
                if (interaction.user.id === message.author.id) {
                    switch (interaction.customId) {
                        case 'left':
                            await moveLeft(gameState, buttonMessage);
                            break;
                        case 'right':
                            await moveRight(gameState, buttonMessage);
                            break;
                        case 'rotate':
                            await rotate(gameState, buttonMessage);
                            break;
                        case 'harddrop':
                            await hardDrop(gameState, buttonMessage); // New hard drop function
                            break;
                        default:
                            break;
                    }
                    message.channel.send(`Drawing at position: x=${myGamePiece.x}, y=${myGamePiece.y}`);
                    await buttonMessage.edit(`${renderBoard(gameState.board)}\n\nButtons pressed: ${interaction.customId}`);
                }
            }, 100); // Debounce delay of 100ms

            debouncedHandleInteraction();
        } catch (error) {
            console.error('Error handling interaction:', error);
            // Display an error message in the chat
            await interaction.reply('An error occurred while processing your request.');
        }
    });

    // Start the interval for automatic falling
    gameInterval = setInterval(async() => {
        await moveDown(gameState, buttonMessage);
    }, 1000);
}

function generateRandomTetromino() {
    return tetrominos[Math.floor(Math.random() * tetrominos.length)];
}
async function hardDrop(gameState, buttonMessage) {
    clearInterval(gameInterval); // Stop automatic falling

    // Target column for the "I" tetromino (adjust as needed)
    const targetCol = 4;

    // Iterate through potential drop positions starting from the current row
    for (let row = gameState.tetrominoRow; row < gameState.board.length; row++) {
        // Check if the tetromino can be placed directly below column targetCol
        if (canMove(gameState, 'down', row, targetCol)) {
            gameState.tetrominoRow = row;
            break; // Exit the loop if a valid position is found
        }
    }

    // Merge, send new tetromino, clear rows, etc.
    mergeTetrominoIntoBoard(gameState);
    sendNewTetromino(gameState);
    clearCompleteRows(gameState, buttonMessage);

    gameInterval = setInterval(async() => {
        await moveDown(gameState, buttonMessage);
    }, 1000); // Restart automatic falling
}

// New function to calculate the lowest possible row
function getLowestPossibleRow(gameState) {
    let lowestRow = gameState.tetrominoRow;

    // Loop through each row down from the current position
    for (let row = lowestRow + 1; row < gameState.board.length; row++) {
        // Check if the tetromino can move down to this row without collision
        if (canMove(gameState, 'down', row)) {
            lowestRow = row;
        } else {
            // Break out of the loop if a collision is detected, stopping at the last valid row
            break;
        }
    }

    return lowestRow;
}
async function moveDown(gameState, buttonMessage) {
    // Move down the Tetromino
    clearTetromino(gameState);

    // Check if the Tetromino can move down
    if (canMove(gameState, 'down')) {
        gameState.tetrominoRow += 1;
    } else {
        // Tetromino reached the bottom
        // Merge the Tetromino into the board
        mergeTetrominoIntoBoard(gameState);
        sendNewTetromino(gameState);

        // Check for complete rows and clear them
        clearCompleteRows(gameState, buttonMessage);
    }

    // Place the Tetromino in its new position (or leave it merged if at the bottom)
    placeTetromino(gameState);

    // Update the board
    await updateBoard(gameState, buttonMessage);
}

function mergeTetrominoIntoBoard(gameState) {
    for (let row = 0; row < gameState.tetromino.length; row++) {
        for (let col = 0; col < gameState.tetromino[row].length; col++) {
            if (gameState.tetromino[row][col] !== 0) {
                gameState.board[gameState.tetrominoRow + row][gameState.tetrominoCol + col] = 'I';
            }
        }
    }
}

async function clearCompleteRows(gameState, buttonMessage) {
    let rowsCleared = 0;

    for (let row = gameState.board.length - 1; row >= 0; row--) {
        if (gameState.board[row].every(block => block !== '⬛')) {
            gameState.board.splice(row, 1);
            rowsCleared++;
            gameState.board.unshift(Array(10).fill('⬛')); // Add an empty row at the top
        }
    }

    // Update score or handle game over if needed
    if (rowsCleared > 0) {
        // Update score or display a message
        await buttonMessage.edit(`${renderBoard(gameState.board)}\n\nRows cleared: ${rowsCleared}`);
    }
}

async function moveLeft(gameState, buttonMessage) {
    // Move left the Tetromino
    clearTetromino(gameState);

    // Check if the Tetromino can move left
    if (canMove(gameState, 'left')) {
        gameState.tetrominoCol -= 1;
    }

    // Place the Tetromino in its new position
    placeTetromino(gameState);

    // Update the board
    await updateBoard(gameState, buttonMessage);
}

async function moveRight(gameState, buttonMessage) {
    // Move right the Tetromino
    clearTetromino(gameState);

    // Check if the Tetromino can move right
    if (canMove(gameState, 'right')) {
        gameState.tetrominoCol += 1;
    }

    // Place the Tetromino in its new position
    placeTetromino(gameState);

    // Update the board
    await updateBoard(gameState, buttonMessage);
}

async function rotate(gameState, buttonMessage) {
    clearTetromino(gameState);
    const rotatedTetromino = rotateMatrixClockwise(gameState.tetromino);

    // Check if the rotated Tetromino can fit in the new position
    if (canPlaceTetromino(gameState, rotatedTetromino)) {
        gameState.tetromino = rotatedTetromino;
    }

    placeTetromino(gameState);
    await updateBoard(gameState, buttonMessage);
}

function canMove(gameState, direction) {
    const newRow = gameState.tetrominoRow + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0);
    const newCol = gameState.tetrominoCol + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0);

    for (let row = 0; row < gameState.tetromino.length; row++) {
        for (let col = 0; col < gameState.tetromino[row].length; col++) {
            if (gameState.tetromino[row][col] !== 0) {
                const boardRow = newRow + row;
                const boardCol = newCol + col;

                if (
                    boardRow < 0 ||
                    boardRow >= gameState.board.length ||
                    boardCol < 0 ||
                    boardCol >= gameState.board[0].length ||
                    gameState.board[boardRow][boardCol] !== '⬛'
                ) {
                    return false;
                }
            }
        }
    }

    return true;
}

function sendNewTetromino(gameState) {
    // Create a new Tetromino (you can customize this part)
    const newTetromino = generateRandomTetromino();
    gameState.tetromino = newTetromino;
    gameState.tetrominoRow = 0;
    gameState.tetrominoCol = Math.floor((gameState.board[0].length - newTetromino[0].length) / 2);
}

function deactivateTetromino(gameState) {
    // Deactivate the current Tetromino
    // You can add further logic here if needed
}

function canPlaceTetromino(gameState, tetromino) {
    // Check if the Tetromino can be placed in the new position
    for (let row = 0; row < tetromino.length; row++) {
        for (let col = 0; col < tetromino[row].length; col++) {
            if (
                tetromino[row][col] !== 0 &&
                (gameState.board[gameState.tetrominoRow + row] === undefined ||
                    gameState.board[gameState.tetrominoRow + row][gameState.tetrominoCol + col] !== '⬛')
            ) {
                return false;
            }
        }
    }
    return true;
}

function clearTetromino(gameState) {
    // Clear the current position of the Tetromino
    for (let row = 0; row < gameState.tetromino.length; row++) {
        for (let col = 0; col < gameState.tetromino[row].length; col++) {
            if (
                gameState.tetromino[row][col] !== 0 &&
                gameState.board[gameState.tetrominoRow + row] &&
                gameState.board[gameState.tetrominoRow + row][gameState.tetrominoCol + col]
            ) {
                gameState.board[gameState.tetrominoRow + row][gameState.tetrominoCol + col] = '⬛';
            }
        }
    }
}

function placeTetromino(gameState) {
    // Place the Tetromino in its new position
    for (let row = 0; row < gameState.tetromino.length; row++) {
        for (let col = 0; col < gameState.tetromino[row].length; col++) {
            if (
                gameState.tetromino[row][col] !== 0 &&
                gameState.board[gameState.tetrominoRow + row] &&
                gameState.board[gameState.tetrominoRow + row][gameState.tetrominoCol + col]
            ) {
                gameState.board[gameState.tetrominoRow + row][gameState.tetrominoCol + col] = 'I';
            }
        }
    }
}

async function updateBoard(gameState, buttonMessage) {
    // Update the message with the new board state
    await buttonMessage.edit(`${renderBoard(gameState.board)}\n\nButtons pressed:`);
}
client.login('MTIwMDkzODgzNDc1NDU1NjAxNg.Gjb8F3.WZy8u0oX88437UJ74srUC9uoz6pwa9ZsJChNvk');