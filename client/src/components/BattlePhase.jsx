import { useEffect } from 'react';

export default function BattlePhase({
    socket, isMyTurn, setIsMyTurn, isPlayer0, placedShips,
    hitCells, setHitCells, missCells, setMissCells,
    opponentHitCells, setOpponentHitCells, opponentMissCells, setOpponentMissCells,
    sunkCells, setSunkCells, opponentSunkCells, setOpponentSunkCells,
    addNotification, setScreen, setWinnerIsPlayer0
}) {

    useEffect(() => {
        const handleFireResult = (data) => {
            const { x, y, isHit, shooterIsPlayer0, sunkShip, sunkShipPositions } = data;
            const myShot = (shooterIsPlayer0 === isPlayer0);
            const coordString = `${x},${y}`;

            if (myShot) {
                if (isHit) setHitCells(prev => new Set([...prev, coordString]));
                else setMissCells(prev => new Set([...prev, coordString]));
            } else {
                if (isHit) setOpponentHitCells(prev => new Set([...prev, coordString]));
                else setOpponentMissCells(prev => new Set([...prev, coordString]));
            }

            if (sunkShip) {
                const name = sunkShip.charAt(0).toUpperCase() + sunkShip.slice(1);
                if (myShot) {
                    addNotification(`Enemy ${name} sunk!`, 'var(--neon-green)');
                    if (sunkShipPositions) {
                        setSunkCells(prev => {
                            const next = new Set(prev);
                            sunkShipPositions.forEach(p => next.add(`${p.x},${p.y}`));
                            return next;
                        });
                    }
                } else {
                    addNotification(`Your ${name} was sunk!`, 'var(--alert-red)');
                    if (sunkShipPositions) {
                        setOpponentSunkCells(prev => {
                            const next = new Set(prev);
                            sunkShipPositions.forEach(p => next.add(`${p.x},${p.y}`));
                            return next;
                        });
                    }
                }
            }
        };

        const handleTurnChanged = (data) => {
            setIsMyTurn(data.turn === socket.id);
        };

        const handleGameOver = (data) => {
            setWinnerIsPlayer0(data.winnerIsPlayer0);
            setScreen('gameover');
        };

        socket.on('fire_result', handleFireResult);
        socket.on('turn_changed', handleTurnChanged);
        socket.on('game_over', handleGameOver);

        return () => {
            socket.off('fire_result', handleFireResult);
            socket.off('turn_changed', handleTurnChanged);
            socket.off('game_over', handleGameOver);
        };
    }, [socket, isPlayer0, addNotification, setHitCells, setMissCells, setOpponentHitCells, setOpponentMissCells, setSunkCells, setOpponentSunkCells, setIsMyTurn, setScreen, setWinnerIsPlayer0]);

    const handleTargetClick = (x, y) => {
        if (!isMyTurn) return;
        const coordString = `${x},${y}`;
        if (hitCells.has(coordString) || missCells.has(coordString)) return;

        socket.emit('fire', { x, y });
    };

    const renderOwnGrid = () => {
        const cells = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const coordString = `${x},${y}`;
                let className = "cell";
                const isShip = placedShips.some(ship => ship.positions.some(pos => pos.x === x && pos.y === y));
                if (isShip) className += " ship-segment";
                if (opponentHitCells.has(coordString)) className += " hit";
                if (opponentMissCells.has(coordString)) className += " miss";
                if (opponentSunkCells.has(coordString)) className += " sunk";
                cells.push(<div key={`own-${x}-${y}`} className={className}></div>);
            }
        }
        return cells;
    };

    const renderTargetGrid = () => {
        const cells = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const coordString = `${x},${y}`;
                let className = "cell";
                if (hitCells.has(coordString)) className += " hit";
                if (missCells.has(coordString)) className += " miss";
                if (sunkCells.has(coordString)) className += " sunk";
                cells.push(
                    <div
                        key={`target-${x}-${y}`}
                        className={className}
                        onClick={() => handleTargetClick(x, y)}
                        style={{ cursor: isMyTurn ? 'crosshair' : 'default' }}
                    ></div>
                );
            }
        }
        return cells;
    };

    return (
        <section id="screen-battle" className="screen active">
            <div className={`turn-indicator ${!isMyTurn ? 'enemy-turn' : ''}`}>
                {isMyTurn ? "YOUR TURN TO FIRE!" : "ENEMY IS TARGETING..."}
            </div>
            <div className="battlefield">
                <div className="grid-wrapper">
                    <h3>Target Grid</h3>
                    <div className={`game-grid target ${isMyTurn ? '' : 'disabled'}`} style={{
                        pointerEvents: isMyTurn ? 'auto' : 'none',
                        opacity: isMyTurn ? 1 : 0.7
                    }}>
                        {renderTargetGrid()}
                    </div>
                </div>
                <div className="grid-wrapper">
                    <h3>Your Fleet</h3>
                    <div className="game-grid">
                        {renderOwnGrid()}
                    </div>
                </div>
            </div>
        </section>
    );
}
