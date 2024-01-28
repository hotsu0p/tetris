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
    board: [],
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
    gameState.board = Array.from({ length: 20 }, () => Array(10).fill('⬛'));
    gameState.tetrominoCol = Math.floor(gameState.board[0].length / 2) - 2;
    for (let i = 0; i < 4; i++) {
        gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = 'I';
    }
    const renderedBoard = renderBoard(gameState.board);
    const buttonMessage = await message.channel.send(`${renderedBoard}\n\nPress the buttons below to move the Tetromino!`);

    // Create buttons
    const buttons = [
        new MessageButton().setCustomId('left').setLabel('Move Left').setStyle('PRIMARY'),
        new MessageButton().setCustomId('right').setLabel('Move Right').setStyle('SECONDARY'),
        new MessageButton().setCustomId('rotate').setLabel('Rotate').setStyle('DANGER'),
    ];

    // Send the message with the buttons
    const row = new MessageActionRow().addComponents(buttons);
    await buttonMessage.edit({ components: [row] });

    // Add your logic to handle the Tetris game and reactions here
    client.on('interactionCreate', async(interaction) => {
        try {
            if (!interaction.isButton()) return;

            console.log(`Clicked ${interaction.customId} from ${interaction.user.username}`);
            if (interaction.user.id === message.author.id) {
                switch (interaction.customId) {
                    case 'left':
                        // Move left
                        await moveLeft(gameState, buttonMessage);
                        break;
                    case 'right':
                        // Move right
                        await moveRight(gameState, buttonMessage);
                        break;
                    case 'rotate':
                        // Rotate
                        rotate(gameState, buttonMessage); // Use buttonMessage instead of newMessage
                        break;

                    default:
                        break;
                }

                // Update the message with the new board state
                await buttonMessage.edit(`${renderBoard(gameState.board)}\n\nButtons pressed: ${interaction.customId}`);
            }
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

    function renderBoard(board) {
        return board.map((row) => row.map((block) => blockEmojis[block] || block).join(' ')).join('\n');
    }

    async function moveLeft(gameState, buttonMessage) {
        // Clear the current position of the Tetromino
        clearTetromino(gameState);

        // Check if the Tetromino can move left
        if (gameState.tetrominoCol > 0 && canMove(gameState, 'left')) {
            // Move left
            gameState.tetrominoCol -= 1;
        }

        // Place the Tetromino in its new position
        placeTetromino(gameState);

        // Update the board
        await updateBoard(gameState, buttonMessage);
    }

    async function moveRight(gameState, buttonMessage) {
        // Clear the current position of the Tetromino
        clearTetromino(gameState);

        // Check if the Tetromino can move right
        if (gameState.tetrominoCol < gameState.board[0].length - 4 && canMove(gameState, 'right')) {
            // Move right
            gameState.tetrominoCol += 1;
        }

        // Place the Tetromino in its new position
        placeTetromino(gameState);

        // Update the board
        await updateBoard(gameState, buttonMessage);
    }

    async function updateBoard(gameState, buttonMessage) {
        // Update the message with the new board state
        await buttonMessage.edit(`${renderBoard(gameState.board)}\n\nButtons pressed:`);
    }

    function canMove(gameState, direction) {
        // Add logic to check if the Tetromino can move in the specified direction
        // For now, let's assume it can always move
        return true;
    }

    async function moveDown(gameState, buttonMessage) {
        // Clear the current position of the Tetromino
        for (let i = 0; i < 4; i++) {
            gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = '⬛';
        }

        // Check if the Tetromino can move down
        if (gameState.tetrominoRow < gameState.board.length - 1) {
            // Check if the space below is empty
            let canMoveDown = true;
            for (let i = 0; i < 4; i++) {
                if (gameState.board[gameState.tetrominoRow + 1][gameState.tetrominoCol + i] !== '⬛') {
                    canMoveDown = false;
                    break;
                }
            }

            if (canMoveDown) {
                gameState.tetrominoRow += 1; // Move down
            } else {
                // Stop the game if it cannot move down further
                clearInterval(gameState.tetrominoInterval);
                // Send a message indicating that the game is over
                await buttonMessage.channel.send('Game Over!');

                // Reset the game state
                resetGameState();
            }
        } else {
            // If the Tetromino is already at the bottom, stop the game
            clearInterval(gameState.tetrominoInterval);
            // Send a message indicating that the game is over
            await buttonMessage.channel.send('Game Over!');

            // Reset the game state
            resetGameState();
        }

        // Place the Tetromino in its new position
        for (let i = 0; i < 4; i++) {
            gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = 'I';
        }

        // Update the board
        await updateBoard(gameState, buttonMessage);
    }

    function rotate(gameState) {
        // Clone the Tetromino's current state
        const currentTetromino = gameState.board.map(row => row.slice(gameState.tetrominoCol, gameState.tetrominoCol + 4));

        // Clear the current position of the Tetromino
        clearTetromino(gameState);

        // Rotate the Tetromino (simple rotation for 'I' block)
        const rotatedTetromino = rotateMatrix(currentTetromino);

        // Check if the rotated Tetromino can fit in the new position
        if (canPlaceTetromino(gameState, rotatedTetromino)) {
            // Update the Tetromino's position and state
            gameState.board.forEach((row, rowIndex) => {
                row.splice(gameState.tetrominoCol, 4, ...rotatedTetromino[rowIndex]);
            });
        }

        // Place the Tetromino in its new position
        placeTetromino(gameState);

        // Update the board
        updateBoard(gameState);
    }


    function rotateMatrix(matrix) {
        // Transpose the matrix
        const transposed = matrix[0].map((col, i) => matrix.map(row => row[i]));

        // Reverse each row to rotate clockwise
        const rotated = transposed.map(row => row.reverse());

        return rotated;
    }


    function canPlaceTetromino(gameState, tetromino) {
        // Check if the Tetromino can be placed in the new position
        for (let row = 0; row < tetromino.length; row++) {
            for (let col = 0; col < tetromino[row].length; col++) {
                if (
                    tetromino[row][col] !== '⬛' &&
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
        for (let i = 0; i < 4; i++) {
            if (gameState.board[gameState.tetrominoRow] && gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i]) {
                gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = '⬛';
            }
        }
    }

    function placeTetromino(gameState) {
        // Place the Tetromino in its new position
        for (let i = 0; i < 4; i++) {
            if (gameState.board[gameState.tetrominoRow] && gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i]) {
                gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = 'I';
            }
        }
    }

    function resetGameState() {
        // Reset the game state
        gameState = {
            tetrominoRow: 0,
            tetrominoCol: 0,
            board: [],
        };

        // Restart the game interval
        gameInterval = setInterval(async() => {
            await moveDown(gameState, buttonMessage);
        }, 1000);
    }
}

client.login('');