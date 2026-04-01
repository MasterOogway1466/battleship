const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Application State
let waitingSocket = null;
const games = {}; // roomId -> game state

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Provide the user a way to start matchmaking
    socket.on('join_queue', () => {
        if (waitingSocket && waitingSocket.id !== socket.id) {
            // Find a match
            const roomId = `room-${Date.now()}`;
            socket.join(roomId);
            waitingSocket.join(roomId);

            games[roomId] = {
                roomId,
                player0: waitingSocket.id,
                player1: socket.id,
                playersReady: 0,
                // Array of strings 'x,y' for quick lookup
                ships: {
                    [waitingSocket.id]: [],
                    [socket.id]: []
                },
                // All fired shots 'x,y'
                shots: {
                    [waitingSocket.id]: [],
                    [socket.id]: []
                },
                shipsData: {
                    [waitingSocket.id]: [],
                    [socket.id]: []
                },
                turn: waitingSocket.id // waiting socket goes first
            };

            io.to(waitingSocket.id).emit('matched', { roomId, playerIndex: 0, isTurn: true });
            io.to(socket.id).emit('matched', { roomId, playerIndex: 1, isTurn: false });

            waitingSocket = null;
        } else {
            waitingSocket = socket;
            socket.emit('waiting_for_match');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (waitingSocket && waitingSocket.id === socket.id) {
            waitingSocket = null;
        }
        
        // Find if they are in a game
        const roomId = Object.keys(games).find(r => 
            games[r].player0 === socket.id || games[r].player1 === socket.id
        );

        if (roomId) {
            io.to(roomId).emit('opponent_disconnected');
            delete games[roomId];
        }
    });

    socket.on('ships_placed', (shipsData) => {
        const roomId = Object.keys(games).find(r => 
            games[r].player0 === socket.id || games[r].player1 === socket.id
        );

        if (!roomId) return;
        const game = games[roomId];

        // Store ship coordinates
        let shipCoords = [];
        shipsData.forEach(ship => {
            ship.positions.forEach(pos => {
                shipCoords.push(`${pos.x},${pos.y}`);
            });
        });

        game.ships[socket.id] = shipCoords;
        game.shipsData[socket.id] = shipsData;
        game.playersReady++;

        if (game.playersReady === 2) {
            io.to(roomId).emit('game_start', { turn: game.turn });
        } else {
            socket.emit('waiting_opponent_placement');
        }
    });

    socket.on('fire', (coords) => {
        const roomId = Object.keys(games).find(r => 
            games[r].player0 === socket.id || games[r].player1 === socket.id
        );

        if (!roomId) return;
        const game = games[roomId];

        // Ensure it's this player's turn
        if (game.turn !== socket.id) return;

        const opponentId = game.player0 === socket.id ? game.player1 : game.player0;
        const coordString = `${coords.x},${coords.y}`;

        // Ensure they haven't fired here already
        if (game.shots[socket.id].includes(coordString)) return;

        game.shots[socket.id].push(coordString);

        const isHit = game.ships[opponentId].includes(coordString);

        // Check for win condition and sunk ships
        let isWin = false;
        let sunkShip = null;
        let sunkShipPositions = null;

        if (isHit) {
            let hitCount = 0;
            game.shots[socket.id].forEach(shot => {
                if (game.ships[opponentId].includes(shot)) hitCount++;
            });
            if (hitCount === 17) isWin = true;

            // Check if this specific shot sunk a ship
            const targetShips = game.shipsData[opponentId];
            for (let ship of targetShips) {
                const isSunkNow = ship.positions.every(pos => 
                    game.shots[socket.id].includes(`${pos.x},${pos.y}`) || (pos.x === coords.x && pos.y === coords.y)
                );
                if (isSunkNow) {
                    const wasSunkBefore = ship.positions.every(pos => {
                        if (pos.x === coords.x && pos.y === coords.y) return false;
                        return game.shots[socket.id].includes(`${pos.x},${pos.y}`);
                    });
                    if (!wasSunkBefore) {
                        sunkShip = ship.id;
                        sunkShipPositions = ship.positions;
                    }
                }
            }
        }

        const isPlayer0 = game.player0 === socket.id;

        // Broadcast fire result
        io.to(roomId).emit('fire_result', {
            x: coords.x,
            y: coords.y,
            isHit,
            sunkShip,
            sunkShipPositions,
            shooterIsPlayer0: isPlayer0
        });

        if (isWin) {
            io.to(roomId).emit('game_over', { winnerIsPlayer0: isPlayer0 });
            delete games[roomId];
            return;
        }

        // Pass turn ONLY if it was a miss
        if (!isHit) {
            game.turn = opponentId;
        }
        io.to(roomId).emit('turn_changed', { turn: game.turn });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Battleship server running on http://0.0.0.0:${PORT}`);
});
