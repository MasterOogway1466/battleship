import React from 'react';
import ReactDOM from 'react-dom';

export default function ThemeSelector({ currentTheme, setTheme }) {
    return ReactDOM.createPortal(
        <div className="theme-selector">
            <span className="theme-selector-label">Theme:</span>
            <button 
                className={`theme-btn theme-btn-manas ${currentTheme === 'manas' ? 'active' : ''}`}
                onClick={() => setTheme('manas')}
            >
                Manas
            </button>
            <button 
                className={`theme-btn theme-btn-anusha ${currentTheme === 'anusha' ? 'active' : ''}`}
                onClick={() => setTheme('anusha')}
            >
                Anusha
            </button>
        </div>,
        document.body
    );
}
