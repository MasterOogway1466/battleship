import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Lobby from './components/Lobby';
import ShipPlacement from './components/ShipPlacement';
import BattlePhase from './components/BattlePhase';
import GameOver from './components/GameOver';
import ThemeSelector from './components/ThemeSelector';

function App() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState('lobby'); // lobby, setup, battle, gameover
  const [isPlayer0, setIsPlayer0] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [theme, setTheme] = useState('manas');

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // Game state
  const [placedShips, setPlacedShips] = useState([]);
  const [hitCells, setHitCells] = useState(new Set());
  const [missCells, setMissCells] = useState(new Set());
  const [opponentHitCells, setOpponentHitCells] = useState(new Set());
  const [opponentMissCells, setOpponentMissCells] = useState(new Set());
  const [sunkCells, setSunkCells] = useState(new Set());
  const [opponentSunkCells, setOpponentSunkCells] = useState(new Set());

  const [notifications, setNotifications] = useState([]);
  const [winnerIsPlayer0, setWinnerIsPlayer0] = useState(false);

  useEffect(() => {
    // Connect to backend
    const newSocket = io();
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('game_start', (data) => {
      setIsMyTurn(data.turn === socket.id);
      setScreen('battle');
    });
    socket.on('opponent_disconnected', () => {
      alert("Connection lost. The enemy fleet retreated!");
      window.location.reload();
    });
    return () => {
      socket.off('game_start');
      socket.off('opponent_disconnected');
    };
  }, [socket]);

  const addNotification = (msg, color) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, msg, color }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  if (!socket) return <div style={{ color: 'var(--heading-color)', textAlign: 'center', marginTop: '20vh' }}>Connecting to fleet command...</div>;

  return (
    <>
      {['lobby', 'setup'].includes(screen) && (
        <ThemeSelector currentTheme={theme} setTheme={setTheme} />
      )}

      {screen === 'lobby' && (
        <Lobby socket={socket} setScreen={setScreen} setIsPlayer0={setIsPlayer0} />
      )}

      {screen === 'setup' && (
        <ShipPlacement socket={socket} setScreen={setScreen} setPlacedShips={setPlacedShips} />
      )}

      {screen === 'battle' && (
        <BattlePhase
          socket={socket}
          isMyTurn={isMyTurn}
          setIsMyTurn={setIsMyTurn}
          isPlayer0={isPlayer0}
          placedShips={placedShips}
          hitCells={hitCells}
          setHitCells={setHitCells}
          missCells={missCells}
          setMissCells={setMissCells}
          opponentHitCells={opponentHitCells}
          setOpponentHitCells={setOpponentHitCells}
          opponentMissCells={opponentMissCells}
          setOpponentMissCells={setOpponentMissCells}
          sunkCells={sunkCells}
          setSunkCells={setSunkCells}
          opponentSunkCells={opponentSunkCells}
          setOpponentSunkCells={setOpponentSunkCells}
          addNotification={addNotification}
          setScreen={setScreen}
          setWinnerIsPlayer0={setWinnerIsPlayer0}
        />
      )}

      {screen === 'gameover' && (
        <GameOver
          isPlayer0={isPlayer0}
          winnerIsPlayer0={winnerIsPlayer0}
        />
      )}

      {/* Notifications */}
      <div id="notification-area" className="notification-area">
        {notifications.map(n => (
          <div key={n.id} className="notification" style={{ borderLeftColor: n.color }}>
            {n.msg}
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
