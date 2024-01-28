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
    board: []
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
    gameState.board = Array.from({ length: 10 }, () => Array(10).fill('⬛'));
    gameState.tetrominoCol = Math.floor(gameState.board[0].length / 2) - 2;
    for (let i = 0; i < 4; i++) {
        gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = 'I';
    }
    const renderedBoard = renderBoard(gameState.board);
    const newMessage = await message.channel.send(`${renderedBoard}\n\nUse the buttons to move the Tetromino!`);

    // Create buttons
    const buttons = [
        new MessageButton().setCustomId('left').setLabel('Move Left').setStyle('PRIMARY'),
        new MessageButton().setCustomId('right').setLabel('Move Right').setStyle('SECONDARY'),
        new MessageButton().setCustomId('rotate').setLabel('Rotate').setStyle('DANGER'),
    ];

    const row = new MessageActionRow().addComponents(buttons);
    await newMessage.edit({ content: 'Use the buttons below to control the Tetromino:', components: [row] });

    client.on('interactionCreate', async(interaction) => {
        try {
            if (!interaction.isButton()) return;

            console.log(`Clicked ${interaction.customId} from ${interaction.user.username}`);
            if (interaction.user.id === message.author.id) {
                switch (interaction.customId) {
                    case 'left':
                        // Move left
                        await moveLeft(gameState, newMessage);
                        break;
                    case 'right':
                        // Move right
                        await moveRight(gameState, newMessage);
                        break;
                    case 'rotate':
                        // Rotate
                        rotate(gameState);
                        break;
                    default:
                        break;
                }

                // Update the message with the new board state
                await newMessage.edit(`${renderBoard(gameState.board)}\n\nUse the buttons to move the Tetromino!`);
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
        }
    });

    // Start the interval for automatic falling
    gameInterval = setInterval(async() => {
        await moveDown(gameState, newMessage);
    }, 1000);

    function renderBoard(board) {
        return board.map((row) => row.map((block) => blockEmojis[block] || block).join(' ')).join('\n');
    }

    async function moveLeft(gameState, newMessage) {
        // Clear the current position of the Tetromino
        for (let i = 0; i < 4; i++) {
            gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = '⬛';
        }

        // Check if the Tetromino can move left
        if (gameState.tetrominoCol > 0 && canMove(gameState, 'left')) {
            // Move left
            gameState.tetrominoCol -= 1;
        }

        // Place the Tetromino in its new position
        for (let i = 0; i < 4; i++) {
            gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = 'I';
        }

        // Update the board
        await updateBoard(gameState, newMessage);
    }

    async function moveRight(gameState, newMessage) {
        // Clear the current position of the Tetromino
        for (let i = 0; i < 4; i++) {
            gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = '⬛';
        }

        // Check if the Tetromino can move right
        if (gameState.tetrominoCol < gameState.board[0].length - 4 && canMove(gameState, 'right')) {
            // Move right
            gameState.tetrominoCol += 1;
        }

        // Place the Tetromino in its new position
        for (let i = 0; i < 4; i++) {
            gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = 'I';
        }

        // Update the board
        await updateBoard(gameState, newMessage);
    }

    async function updateBoard(gameState, newMessage) {
        // Update the message with the new board state
        await newMessage.edit(`${renderBoard(gameState.board)}\n\nUse the buttons to move the Tetromino!`);
    }

    function canMove(gameState, direction) {
        // Add logic to check if the Tetromino can move in the specified direction
        // For now, let's assume it can always move
        return true;
    }

    async function moveDown(gameState, newMessage) {
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
                clearInterval(gameInterval);
                // Send a message indicating that the game is over
                await newMessage.channel.send('Game Over!');

                // Reset the game state
                gameState = {
                    tetrominoRow: 0,
                    tetrominoCol: 0,
                    board: [],
                };
            }
        } else {
            // If the Tetromino is already at the bottom, stop the game
            clearInterval(gameInterval);
            // Send a message indicating that the game is over
            await newMessage.channel.send('Game Over!');

            // Reset the game state
            gameState = {
                tetrominoRow: 0,
                tetrominoCol: 0,
                board: [],
            };
        }

        // Place the Tetromino in its new position
        for (let i = 0; i < 4; i++) {
            gameState.board[gameState.tetrominoRow][gameState.tetrominoCol + i] = 'I';
        }

        // Update the board
        await updateBoard(gameState, newMessage);
    }

    function rotate(gameState) {
        // This is a bit more complex and depends on the shape of the Tetromino
        // ill do this later
    }
}

client.login('MTIwMDkzODgzNDc1NDU1NjAxNg.GjAt1F.cQLVKA5fwVfgWJGTDnHCxm25OvGEAbr9XtzMzs');