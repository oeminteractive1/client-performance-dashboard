
import React from 'react';
import { Theme } from '../types';

interface LoginProps {
    onLoginSuccess: () => void;
    theme: Theme;
    onGoogleSignIn?: () => void;
    isGoogleReady?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, theme, onGoogleSignIn, isGoogleReady }) => {
    const [name, setName] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    // Check if we are on the specific OEM dashboard domain
    const isOemDomain = window.location.hostname.includes('dashboard.oeminteractive.com');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Default credentials
        if (name === 'OEM' && password === 'Oemparts999') {
            onLoginSuccess();
        } else {
            setError('Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] min-h-screen flex items-center justify-center text-[var(--color-text-primary)] font-sans p-4">
            <div className="w-full max-w-md bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-2xl p-8">
                <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary)] text-transparent bg-clip-text mb-6">
                    Dashboard Login
                </h1>
                
                {isOemDomain ? (
                    // Google Sign-In Flow for OEM Domain
                    <div className="space-y-6 text-center">
                        <p className="text-[var(--color-text-secondary)] mb-4">Please sign in with your Google account to access the dashboard.</p>
                        <button
                            onClick={onGoogleSignIn}
                            disabled={!isGoogleReady}
                            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 px-6 rounded-lg transition-colors text-lg border border-gray-300 shadow-sm"
                        >
                            {!isGoogleReady ? (
                                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                    <path fill="none" d="M0 0h48v48H0z"/>
                                </svg>
                            )}
                            <span>Sign in with Google</span>
                        </button>
                    </div>
                ) : (
                    // Standard Username/Password Flow for other domains
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-3 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition"
                                placeholder="Enter your name"
                                required
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-3 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition"
                                placeholder="Enter your password"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        {error && (
                            <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm text-center" role="alert">
                                {error}
                            </div>
                        )}
                        <div>
                            <button
                                type="submit"
                                className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
                            >
                                Login
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
