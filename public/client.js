const socket = io();

// UI Elements
const screenLobby = document.getElementById('screen-lobby');
const screenSetup = document.getElementById('screen-placement');
const screenBattle = document.getElementById('screen-battle');
const screenGameOver = document.getElementById('screen-game-over');

const btnJoinQueue = document.getElementById('btn-join-queue');
const queueStatus = document.getElementById('queue-status');

const setupGridEl = document.getElementById('placement-grid');
const fleetListEl = document.getElementById('fleet-list');
const btnReady = document.getElementById('btn-ready');
const btnRotate = document.getElementById('btn-rotate');
const setupStatus = document.getElementById('placement-status');
const notificationArea = document.getElementById('notification-area');

const ownGridEl = document.getElementById('own-grid');
const targetGridEl = document.getElementById('target-grid');
const turnIndicator = document.getElementById('turn-indicator');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMsg = document.getElementById('game-over-msg');

// Game State
let isPlayer0 = false;
let isMyTurn = false;

// Ship Configuration
const SHIPS_DATA = [
    { id: 'carrier', name: 'Carrier', length: 5 },
    { id: 'battleship', name: 'Battleship', length: 4 },
    { id: 'cruiser', name: 'Cruiser', length: 3 },
    { id: 'submarine', name: 'Submarine', length: 3 },
    { id: 'destroyer', name: 'Destroyer', length: 2 }
];

// Local state
let isHorizontal = true;
let selectedShip = null;
const placedShips = []; // { id, positions: [{x,y}] }
let myGrid = Array(10).fill(null).map(() => Array(10).fill(0)); // 0: empty, 1: ship
let hitCells = new Set();
let missCells = new Set();
let opponentHitCells = new Set();
let opponentMissCells = new Set();


// --- Utility: Screen Navigation ---
function showScreen(screenEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screenEl.classList.add('active');
}

function showNotification(msg, color = 'var(--neon-blue)') {
    const el = document.createElement('div');
    el.classList.add('notification');
    el.innerText = msg;
    el.style.borderLeftColor = color;
    notificationArea.appendChild(el);
    setTimeout(() => {
        el.classList.add('fade-out');
        setTimeout(() => el.remove(), 500);
    }, 4000);
}

// --- Init & Connection ---
btnJoinQueue.addEventListener('click', () => {
    socket.emit('join_queue');
    btnJoinQueue.style.display = 'none';
    queueStatus.classList.remove('hidden');
});

socket.on('waiting_for_match', () => {
    queueStatus.innerText = "Searching local network for opponent...";
});

socket.on('matched', (data) => {
    isPlayer0 = data.playerIndex === 0;
    showScreen(screenSetup);
    initSetupPhase();
});

socket.on('opponent_disconnected', () => {
    alert("Connection lost. The enemy fleet retreated.");
    location.reload();
});

// --- Phase 1: Setup ---
function initSetupPhase() {
    createGrid(setupGridEl, handleSetupCellClick, handleSetupCellHover, handleSetupCellLeave);
    renderFleetList();
    
    // Keybind logic for rotation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            isHorizontal = !isHorizontal;
        }
    });

    btnRotate.addEventListener('click', () => {
        isHorizontal = !isHorizontal;
    });
}

function createGrid(container, onClick, onHover, onLeave) {
    container.innerHTML = '';
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            if (onClick) cell.addEventListener('click', onClick);
            if (onHover) cell.addEventListener('mouseenter', onHover);
            if (onLeave) cell.addEventListener('mouseleave', onLeave);
            container.appendChild(cell);
        }
    }
}

function getCell(container, x, y) {
    return container.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
}

function renderFleetList() {
    fleetListEl.innerHTML = '';
    SHIPS_DATA.forEach((ship, idx) => {
        if (placedShips.find(s => s.id === ship.id)) return;
        
        const el = document.createElement('div');
        el.classList.add('ship-item');
        el.innerText = `${ship.name} (${ship.length})`;
        
        el.addEventListener('click', () => {
            document.querySelectorAll('.ship-item').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected');
            selectedShip = ship;
        });
        
        // Auto-select first available ship
        if (!selectedShip && idx === 0) {
            el.classList.add('selected');
            selectedShip = ship;
        }
        
        fleetListEl.appendChild(el);
    });

    if (placedShips.length === SHIPS_DATA.length) {
        btnReady.disabled = false;
        selectedShip = null;
    } else if (!selectedShip && fleetListEl.firstChild) {
        fleetListEl.firstChild.classList.add('selected');
        // Actually find the first unplaced ship and select it
        const nextShip = SHIPS_DATA.find(s => !placedShips.find(p => p.id === s.id));
        if(nextShip) selectedShip = nextShip;
    }
}

function canPlaceShip(startX, startY, length, isHoriz) {
    for (let i = 0; i < length; i++) {
        let x = startX + (isHoriz ? i : 0);
        let y = startY + (isHoriz ? 0 : i);
        if (x >= 10 || y >= 10 || myGrid[y][x] !== 0) return false;
    }
    return true;
}

function handleSetupCellHover(e) {
    if (!selectedShip) return;
    const startX = parseInt(e.target.dataset.x);
    const startY = parseInt(e.target.dataset.y);
    const valid = canPlaceShip(startX, startY, selectedShip.length, isHorizontal);
    
    for(let i=0; i<selectedShip.length; i++) {
        let cx = startX + (isHorizontal ? i : 0);
        let cy = startY + (isHorizontal ? 0 : i);
        if (cx < 10 && cy < 10) {
            const cEl = getCell(setupGridEl, cx, cy);
            if(cEl) {
                cEl.classList.add('ship-preview');
                if(!valid) cEl.classList.add('invalid');
            }
        }
    }
}

function handleSetupCellLeave(e) {
    setupGridEl.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('ship-preview', 'invalid');
    });
}

function handleSetupCellClick(e) {
    if (!selectedShip) return;
    const startX = parseInt(e.target.dataset.x);
    const startY = parseInt(e.target.dataset.y);
    
    if (canPlaceShip(startX, startY, selectedShip.length, isHorizontal)) {
        const positions = [];
        for(let i=0; i<selectedShip.length; i++) {
            let cx = startX + (isHorizontal ? i : 0);
            let cy = startY + (isHorizontal ? 0 : i);
            myGrid[cy][cx] = 1;
            positions.push({x: cx, y: cy});
            
            const cEl = getCell(setupGridEl, cx, cy);
            if(cEl) cEl.classList.add('ship-segment');
        }
        
        placedShips.push({ id: selectedShip.id, positions });
        selectedShip = null;
        handleSetupCellLeave(); // Clear previews
        renderFleetList();
    }
}

btnReady.addEventListener('click', () => {
    if (placedShips.length !== SHIPS_DATA.length) return;
    
    socket.emit('ships_placed', placedShips);
    btnReady.style.display = 'none';
    setupStatus.classList.remove('hidden');
});

socket.on('waiting_opponent_placement', () => {
    setupStatus.innerText = "Awaiting enemy fleet deployment...";
});

// --- Phase 2: Battle ---
socket.on('game_start', (data) => {
    isMyTurn = (data.turn === socket.id);
    initBattlePhase();
});

function initBattlePhase() {
    showScreen(screenBattle);
    
    // Copy ships from setup to battle view
    createGrid(ownGridEl);
    placedShips.forEach(ship => {
        ship.positions.forEach(pos => {
            const cell = getCell(ownGridEl, pos.x, pos.y);
            if(cell) cell.classList.add('ship-segment');
        });
    });

    createGrid(targetGridEl, handleTargetClick);
    updateTurnIndicator();
}

function updateTurnIndicator() {
    if (isMyTurn) {
        turnIndicator.innerText = "YOUR TURN TO FIRE!";
        turnIndicator.classList.remove('enemy-turn');
        targetGridEl.style.pointerEvents = 'auto';
        targetGridEl.style.opacity = '1';
    } else {
        turnIndicator.innerText = "ENEMY IS TARGETING...";
        turnIndicator.classList.add('enemy-turn');
        targetGridEl.style.pointerEvents = 'none';
        targetGridEl.style.opacity = '0.7';
    }
}

function handleTargetClick(e) {
    if (!isMyTurn) return;
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);
    const coordString = `${x},${y}`;

    if (hitCells.has(coordString) || missCells.has(coordString)) return;

    socket.emit('fire', { x, y });
}

socket.on('fire_result', (data) => {
    const { x, y, isHit, shooterIsPlayer0, sunkShip } = data;
    const myShot = (shooterIsPlayer0 === isPlayer0);
    const coordString = `${x},${y}`;

    if (myShot) {
        // I fired a shot
        const cell = getCell(targetGridEl, x, y);
        if (isHit) {
            cell.classList.add('hit');
            hitCells.add(coordString);
        } else {
            cell.classList.add('miss');
            missCells.add(coordString);
        }
    } else {
        // Enemy fired a shot at me
        const cell = getCell(ownGridEl, x, y);
        if (isHit) {
            cell.classList.add('hit');
            opponentHitCells.add(coordString);
        } else {
            cell.classList.add('miss');
            opponentMissCells.add(coordString);
        }
    }

    if (sunkShip) {
        const shipDef = SHIPS_DATA.find(s => s.id === sunkShip);
        const name = shipDef ? shipDef.name : 'Ship';
        if (myShot) {
            showNotification(`Enemy ${name} sunk!`, 'var(--neon-green)');
        } else {
            showNotification(`Your ${name} was sunk!`, 'var(--alert-red)');
        }
    }
});

socket.on('turn_changed', (data) => {
    isMyTurn = (data.turn === socket.id);
    updateTurnIndicator();
});

socket.on('game_over', (data) => {
    showScreen(screenGameOver);
    const iWon = (data.winnerIsPlayer0 === isPlayer0);
    
    if (iWon) {
        gameOverTitle.innerText = "VICTORY!";
        gameOverTitle.style.color = "var(--neon-green)";
        gameOverMsg.innerText = "You have decimated the enemy fleet. Return to base.";
    } else {
        gameOverTitle.innerText = "DEFEAT";
        gameOverTitle.style.color = "var(--alert-red)";
        gameOverMsg.innerText = "Your fleet has been destroyed. The ocean belongs to the enemy.";
    }
});
