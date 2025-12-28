import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="flex items-center justify-center h-full p-4">
                    <div className="text-center">
                        <p className="text-red-500 font-semibold mb-2">Something went wrong</p>
                        <p className="text-[var(--color-text-secondary)] text-sm">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
