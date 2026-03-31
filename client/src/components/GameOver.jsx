export default function GameOver({ isPlayer0, winnerIsPlayer0 }) {
    const iWon = (isPlayer0 === winnerIsPlayer0);
    return (
        <section id="screen-game-over" className="screen active">
            <div className="glass-panel">
                <h2 style={{ color: iWon ? 'var(--neon-green)' : 'var(--alert-red)' }}>
                    {iWon ? 'Victory!' : 'Defeat'}
                </h2>
                <p>
                    {iWon ? "You have annihilated the enemy fleet." : "Your fleet has been destroyed."}
                </p>
                <button className="btn primary-btn" onClick={() => window.location.reload()} style={{marginTop: '20px'}}>
                    Return to Fleet Command
                </button>
            </div>
        </section>
    );
}
