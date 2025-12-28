import React, { useState, useRef, useEffect } from 'react';

const NotificationsButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={buttonRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded-lg transition-colors relative"
                title="Notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3-3z" />
                </svg>
                {hasUnread && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg p-4 z-50">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Notifications</h3>
                    <div className="text-center text-sm text-[var(--color-text-secondary)] py-6">
                        No new notifications
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsButton;
