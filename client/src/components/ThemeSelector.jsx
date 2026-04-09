import React from 'react';
import ReactDOM from 'react-dom';

export default function ThemeSelector({ currentTheme, setTheme }) {
    return ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 1000, background: 'var(--panel-bg)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px', backdropFilter: 'blur(10px)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--heading-color)', textTransform: 'uppercase', letterSpacing: '1px' }}>Theme:</span>
            <button
                onClick={() => setTheme('manas')}
                style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: currentTheme === 'manas' ? '#00e5ff' : 'transparent',
                    color: currentTheme === 'manas' ? '#0a0e17' : '#00e5ff',
                    border: '1px solid #00e5ff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.3s'
                }}
            >
                Manas
            </button>
            <button
                onClick={() => setTheme('anusha')}
                style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: currentTheme === 'anusha' ? '#ff69b4' : 'transparent',
                    color: currentTheme === 'anusha' ? '#4a001f' : '#ff69b4',
                    border: '1px solid #ff69b4',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.3s'
                }}
            >
                Anusha
            </button>
        </div>,
        document.body
    );
}
