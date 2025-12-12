
import React from 'react';
import { Theme } from '../types';

interface ThemeSelectorProps {
    themes: Theme[];
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
    onClose: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themes, currentTheme, setTheme, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-5xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">🎨 Select a Theme</h3>
                    <button onClick={onClose} aria-label="Close" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {themes.map(theme => {
                        const isSelected = theme.id === currentTheme.id;
                        return (
                            <div
                                key={theme.id}
                                onClick={() => setTheme(theme)}
                                className={`rounded-lg p-4 cursor-pointer border-2 transition-all duration-200 relative ${isSelected ? 'border-[var(--color-accent)] scale-105 shadow-lg' : 'border-transparent hover:border-gray-500'}`}
                                style={{ backgroundColor: theme.colors['--color-card-bg'] }}
                            >
                                <h4 className="font-semibold mb-3" style={{ color: theme.colors['--color-text-primary'] }}>
                                    {theme.name}
                                </h4>
                                <div className="flex gap-2">
                                    <div className="w-1/5 h-8 rounded" style={{ backgroundColor: theme.colors['--color-bg-primary'] }}></div>
                                    <div className="w-1/5 h-8 rounded" style={{ backgroundColor: theme.colors['--color-text-primary'] }}></div>
                                    <div className="w-1/5 h-8 rounded" style={{ backgroundColor: theme.colors['--color-text-secondary'] }}></div>
                                    <div className="w-1/5 h-8 rounded" style={{ backgroundColor: theme.colors['--color-accent'] }}></div>
                                    <div className="w-1/5 h-8 rounded" style={{ backgroundColor: theme.colors['--color-accent-secondary'] }}></div>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-2 right-2 text-white bg-[var(--color-accent)] rounded-full p-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                 <div className="p-4 bg-black/20 rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2 px-6 rounded-lg transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThemeSelector;