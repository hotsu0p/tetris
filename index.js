const { Client, Intents, MessageActionRow, MessageButton } = require('discord.js');

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]
});

// Define emojis for blocks
const blockEmojis = {
    'I': '🟩',
    'O': '🟨',
    // Add more blocks and emojis as needed
};

let gameState = {
    tetrominoRow: 0,
    tetrominoCol: 0,
    tetromino: ['I', 'I', 'I', 'I'],
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

async function startTetrisGame(message) {
    initializeTetrisBoard();
    const buttonMessage = await sendBoardMessage(message);

    // Create buttons
    const buttons = [
        new MessageButton().setCustomId('left').setLabel('Move Left').setStyle('PRIMARY'),
        new MessageButton().setCustomId('right').setLabel('Move Right').setStyle('SECONDARY'),
        new MessageButton().setCustomId('rotate').setLabel('Rotate').setStyle('DANGER'),
    ];

    // Send the message with the buttons
    const row = new MessageActionRow().addComponents(buttons);
    await buttonMessage.edit({ components: [row] });

    // Add interaction handling logic
    client.on('interactionCreate', async(interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.user.id === message.author.id) {
            switch (interaction.customId) {
                case 'left':
                    await move('left', buttonMessage);
                    break;
                case 'right':
                    await move('right', buttonMessage);
                    break;
                case 'rotate':
                    await rotate(buttonMessage);
                    break;
                default:
                    break;
            }

            await updateMessage(buttonMessage);
        }
    });

    // Start the interval for automatic falling
    gameInterval = setInterval(async() => {
        await move('down', buttonMessage);
    }, 1000);
}

function initializeTetrisBoard() {
    gameState.tetrominoCol = Math.floor(gameState.board[0].length / 2) - 2;
    for (let i = 0; i < 4; i++) {
        gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = gameState.tetromino[i];
    }
}

async function sendBoardMessage(message) {
    const renderedBoard = renderBoard();
    return await message.channel.send(`${renderedBoard}\n\nPress the buttons below to move the Tetromino!`);
}

function renderBoard() {
    return gameState.board.map((row) => row.map((block) => blockEmojis[block] || block).join(' ')).join('\n');
}

async function move(direction, buttonMessage) {
    clearTetromino();
    switch (direction) {
        case 'left':
            if (gameState.tetrominoCol > 0 && canMove('left')) {
                gameState.tetrominoCol -= 1;
            }
            break;
        case 'right':
            if (gameState.tetrominoCol < gameState.board[0].length - 4 && canMove('right')) {
                gameState.tetrominoCol += 1;
            }
            break;
        case 'down':
            await moveDown(buttonMessage);
            return;
    }
    placeTetromino();
    await updateMessage(buttonMessage);
}

async function rotate(buttonMessage) {
    clearTetromino();
    const rotatedTetromino = rotateMatrixClockwise(gameState.tetromino);
    if (canPlaceTetromino(rotatedTetromino)) {
        gameState.tetromino = rotatedTetromino;
    }
    placeTetromino();
    await updateMessage(buttonMessage);
}

async function moveDown(buttonMessage) {
    clearTetromino();
    if (gameState.tetrominoRow < gameState.board.length - 1 && canMove('down')) {
        gameState.tetrominoRow += 1;
    } else {
        clearInterval(gameInterval);
        await buttonMessage.channel.send('Game Over!');
        resetGameState(buttonMessage);
        return;
    }
    placeTetromino();
    await updateMessage(buttonMessage);
}

function canMove(direction) {
    for (let i = 0; i < 4; i++) {
        if (direction === 'left' && gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i - 1] !== '⬛') {
            return false;
        }
        if (direction === 'right' && gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i + 1] !== '⬛') {
            return false;
        }
        if (direction === 'down' && gameState.board[gameState.tetrominoRow + 1][gameState.tetrominoCol + i] !== '⬛') {
            return false;
        }
    }
    return true;
}

async function updateMessage(buttonMessage) {
    await buttonMessage.edit(`${renderBoard()}\n\nButtons pressed:`);
}

function clearTetromino() {
    for (let i = 0; i < 4; i++) {
        if (gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i]) {
            gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = '⬛';
        }
    }
}

function placeTetromino() {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            if (gameState.tetromino[row][col] !== '⬛') {
                gameState.board[gameState.tetrominoRow + row][gameState.tetrominoCol + col] = gameState.tetromino[row][col];
            }
        }
    }
}

function rotateMatrixClockwise(matrix) {
    const transposed = matrix[0].map((col, i) => matrix.map(row => row[i]));
    return transposed.map(row => row.reverse());
}

function canPlaceTetromino(tetromino) {
    for (let row = 0; row < tetromino.length; row++) {
        for (let col = 0; col < tetromino[row].length; col++) {
            if (tetromino[row][col] !== '⬛' && (gameState.board[gameState.tetrominoRow + row] === undefined || gameState.board[gameState.tetrominoRow + row][gameState.tetrominoCol + col] !== '⬛')) {
                return false;
            }
        }
    }
    return true;
}

function resetGameState(buttonMessage) {
    gameState = {
        tetrominoRow: 0,
        tetrominoCol: 0,
        tetromino: ['I', 'I', 'I', 'I'],
        board: Array.from({ length: 20 }, () => Array(10).fill('⬛')),
    };
    gameInterval = setInterval(async() => {
        await moveDown(buttonMessage);
    }, 1000);
}
client.login('');