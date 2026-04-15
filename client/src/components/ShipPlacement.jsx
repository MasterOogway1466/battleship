import { useState, useEffect } from 'react';

const SHIPS_DATA = [
    { id: 'carrier', name: 'Carrier', length: 5 },
    { id: 'battleship', name: 'Battleship', length: 4 },
    { id: 'cruiser', name: 'Cruiser', length: 3 },
    { id: 'submarine', name: 'Submarine', length: 3 },
    { id: 'destroyer', name: 'Destroyer', length: 2 }
];

export default function ShipPlacement({ socket, setScreen, setPlacedShips }) {
    const [isHorizontal, setIsHorizontal] = useState(true);
    const [placedLocalShips, setPlacedLocalShips] = useState([]);
    
    // Auto-select next unplaced ship
    const nextShip = SHIPS_DATA.find(s => !placedLocalShips.find(p => p.id === s.id)) || null;
    const [selectedShip, setSelectedShip] = useState(null);

    const [pendingPlacement, setPendingPlacement] = useState(null);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [status, setStatus] = useState(''); 
    const [isReady, setIsReady] = useState(false);
    
    const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

    useEffect(() => {
        socket.on('waiting_opponent_placement', () => {
            setStatus("Awaiting enemy fleet deployment...");
        });

        // game_start is handled by App.jsx, but we need to cleanup this listener just in case
        return () => {
            socket.off('waiting_opponent_placement');
        };
    }, [socket]);

    useEffect(() => {
        if (!selectedShip && nextShip && !isReady) {
            setSelectedShip(nextShip);
        } else if (selectedShip && placedLocalShips.find(p => p.id === selectedShip.id)) {
            setSelectedShip(nextShip);
            setPendingPlacement(null);
        }
    }, [placedLocalShips, selectedShip, nextShip, isReady]);

    const canPlaceShip = (startX, startY, length, isHoriz) => {
        for (let i = 0; i < length; i++) {
            let x = startX + (isHoriz ? i : 0);
            let y = startY + (isHoriz ? 0 : i);
            if (x >= 10 || y >= 10) return false;
            const occupied = placedLocalShips.some(ship => 
                ship.positions.some(pos => pos.x === x && pos.y === y)
            );
            if (occupied) return false;
        }
        return true;
    };

    const toggleRotation = () => {
        const newHoriz = !isHorizontal;
        setIsHorizontal(newHoriz);
        
        if (pendingPlacement) {
            const { ship, startX, startY } = pendingPlacement;
            let newX = startX;
            let newY = startY;
            
            if (newHoriz) {
                if (newX + ship.length > 10) newX = 10 - ship.length;
            } else {
                if (newY + ship.length > 10) newY = 10 - ship.length;
            }
            
            const valid = canPlaceShip(newX, newY, ship.length, newHoriz);
            if (valid) {
                setPendingPlacement({
                    ship,
                    startX: newX,
                    startY: newY,
                    isHoriz: newHoriz
                });
            } else {
                setPendingPlacement(null);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'r' || e.key === 'R') {
                toggleRotation();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isHorizontal, pendingPlacement, placedLocalShips]);

    const handleCellHover = (x, y) => {
        if (!selectedShip || isReady || pendingPlacement) return;
        setHoveredCell({ x, y });
    };

    const handleCellLeave = () => {
        setHoveredCell(null);
    };

    const handleCellClick = (x, y) => {
        if (!selectedShip || isReady) return;
        
        const valid = canPlaceShip(x, y, selectedShip.length, isHorizontal);
        if (valid) {
            setPendingPlacement({
                ship: selectedShip,
                startX: x,
                startY: y,
                isHoriz: isHorizontal
            });
            setHoveredCell(null);
        } else {
            setPendingPlacement(null);
        }
    };

    const handleConfirm = () => {
        if (!pendingPlacement) return;
        const { ship, startX, startY, isHoriz } = pendingPlacement;
        const positions = [];
        for(let i=0; i < ship.length; i++) {
            positions.push({
                x: startX + (isHoriz ? i : 0),
                y: startY + (isHoriz ? 0 : i)
            });
        }
        const newShips = [...placedLocalShips, { id: ship.id, positions }];
        setPlacedLocalShips(newShips);
        setPendingPlacement(null);
    };

    const handleReady = () => {
        setIsReady(true);
        setSelectedShip(null);
        setPlacedShips(placedLocalShips);
        socket.emit('ships_placed', placedLocalShips);
    };

    const renderGrid = () => {
        const cells = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                let hasPlaced = false;
                placedLocalShips.forEach(ship => {
                    if (ship.positions.some(pos => pos.x === x && pos.y === y)) hasPlaced = true;
                });

                let isPreview = false;
                let isInvalidPreview = false;
                if (pendingPlacement && !hasPlaced) {
                    const { ship, startX, startY, isHoriz } = pendingPlacement;
                    for (let i = 0; i < ship.length; i++) {
                        if (x === startX + (isHoriz ? i : 0) && y === startY + (isHoriz ? 0 : i)) {
                            isPreview = true;
                            // validation if needed (already validated on drop)
                            break;
                        }
                    }
                } else if (hoveredCell && !pendingPlacement && !hasPlaced && selectedShip) {
                    const startX = hoveredCell.x;
                    const startY = hoveredCell.y;
                    const isHoriz = isHorizontal;
                    const valid = canPlaceShip(startX, startY, selectedShip.length, isHoriz);
                    for (let i = 0; i < selectedShip.length; i++) {
                        if (x === startX + (isHoriz ? i : 0) && y === startY + (isHoriz ? 0 : i)) {
                            isPreview = true;
                            if (!valid) isInvalidPreview = true;
                            break;
                        }
                    }
                }

                let className = "cell";
                if (hasPlaced) className += " ship-segment";
                else if (isPreview) {
                    className += " ship-preview";
                    if (pendingPlacement) className += " pending";
                    if (isInvalidPreview) className += " invalid";
                }

                cells.push(
                    <div 
                        key={`${x},${y}`} 
                        className={className}
                        onClick={() => handleCellClick(x, y)}
                        onMouseEnter={!isTouchDevice ? () => handleCellHover(x, y) : undefined}
                        onMouseLeave={!isTouchDevice ? handleCellLeave : undefined}
                        style={{ cursor: (!hasPlaced && selectedShip && !isReady) ? 'pointer' : 'default' }}
                    ></div>
                );
            }
        }
        return cells;
    };

    return (
        <section id="screen-placement" className="screen active">
            <div className="glass-panel layout-row">
                <div className="fleet-controls">
                    <h2>Deploy Your Fleet</h2>
                    <p>Select a location, use [R] to rotate, then confirm.</p>
                    <div>
                        <button className="btn placement-action-btn" onClick={toggleRotation}>Rotate Ship</button>
                        {pendingPlacement && !isReady && (
                            <button className="btn placement-confirm-btn" onClick={handleConfirm}>Confirm Placement</button>
                        )}
                    </div>
                <div className="fleet-list">
                    {SHIPS_DATA.map(ship => {
                        const isPlaced = placedLocalShips.some(p => p.id === ship.id);
                        const isSelected = selectedShip && selectedShip.id === ship.id;
                        return (
                            <div 
                                key={ship.id}
                                className={`ship-item ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                    if (!isPlaced && !isReady) {
                                        setSelectedShip(ship);
                                        setPendingPlacement(null);
                                    }
                                }}
                            >
                                {ship.name} ({ship.length})
                            </div>
                        );
                    })}
                </div>
                    {placedLocalShips.length === SHIPS_DATA.length && !isReady && (
                        <button className="btn success-btn" onClick={handleReady}>Ready for Battle</button>
                    )}
                    {status && <div className="status-text">{status}</div>}
                </div>
                <div className="grid-container">
                    <div className="game-grid">
                        {renderGrid()}
                    </div>
                </div>
            </div>
        </section>
    );
}
