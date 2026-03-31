import { useState, useEffect } from 'react';

export default function Lobby({ socket, setScreen, setIsPlayer0 }) {
    const [status, setStatus] = useState('');

    useEffect(() => {
        socket.on('waiting_for_match', () => {
            setStatus("Searching local network for opponent...");
        });

        socket.on('matched', (data) => {
            setIsPlayer0(data.playerIndex === 0);
            setScreen('setup');
        });

        socket.on('opponent_disconnected', () => {
            alert("Connection lost. The enemy fleet retreated.");
            window.location.reload();
        });

        return () => {
            socket.off('waiting_for_match');
            socket.off('matched');
            socket.off('opponent_disconnected');
        };
    }, [socket, setScreen, setIsPlayer0]);

    const joinQueue = () => {
        socket.emit('join_queue');
        setStatus('Joining Matchmaking...');
    };

    return (
        <section id="screen-lobby" className="screen active">
            <div className="glass-panel">
                <h2>Welcome Commander</h2>
                <p>Engage in real-time naval combat against other players on the local network.</p>
                {!status ? (
                    <button className="btn primary-btn" onClick={joinQueue}>Join Matchmaking</button>
                ) : (
                    <div className="status-text">{status}</div>
                )}
            </div>
        </section>
    );
}
