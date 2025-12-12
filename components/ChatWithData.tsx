import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import type { ClientDataRecord, AccountDetailsRecord, ChatMessage, GoogleAnalyticsRecord } from '../types';

interface ChatWithDataProps {
    clientData: ClientDataRecord[];
    accountDetails: AccountDetailsRecord | null;
    systemPrompt: string;
    googleAnalyticsData: GoogleAnalyticsRecord[] | null;
}

const RobotAvatar: React.FC = () => (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center border-2 border-slate-500">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Hat */}
            <path d="M12 2L8 4V6H16V4L12 2Z" fill="var(--color-accent)" />
            <path d="M7 6L5 7V9H19V7L17 6H7Z" fill="var(--color-accent)" />
            {/* Sunglasses */}
            <path d="M4 10H20V14H4V10Z" fill="var(--color-bg-primary)" stroke="var(--color-accent-secondary)" strokeWidth="1"/>
            {/* Face */}
            <rect x="5" y="10" width="14" height="10" rx="2" fill="var(--color-text-secondary)"/>
            {/* Mouth */}
            <line x1="9" y1="17" x2="15" y2="17" stroke="#37474f" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    </div>
);

const TypingIndicator: React.FC = () => (
    <div className="flex items-end gap-2">
        <RobotAvatar />
        <div className="px-4 py-3 rounded-lg bg-[var(--color-card-bg)]">
            <div className="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    </div>
);

const ChatWithData: React.FC<ChatWithDataProps> = ({ clientData, accountDetails, systemPrompt, googleAnalyticsData }) => {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);

    const API_KEY = (process.env as any).API_KEY;
    
    useEffect(() => {
        if (!isInitialized.current) {
            setChatHistory([
                {
                    role: 'model',
                    text: `Greetings! DataBot 3000 online and ready to analyze. I have access to this client's performance history, account details, and Google Analytics data.

You can ask me to:
*   Summarize performance for a specific period (e.g., 'Summarize Q2 performance').
*   Analyze trends (e.g., 'Why did profit drop in the last 3 months?').
*   Compare different months or years.
*   Provide insights from Google Analytics (e.g., 'What was the top traffic source last month?').

What would you like to know?`
                }
            ]);
            isInitialized.current = true;
        }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || !clientData.length) return;

        const currentInput = userInput;
        const newUserMessage: ChatMessage = { role: 'user', text: currentInput };
        
        // Create an up-to-date history array for the API call and state update
        const updatedHistory = [...chatHistory, newUserMessage];
        setChatHistory(updatedHistory);
        setUserInput('');
        setIsLoading(true);
        setError(null);
        
        if (!API_KEY) {
            setError("API_KEY environment variable not found. Cannot connect to the AI service.");
            setIsLoading(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            const dataContext = JSON.stringify({
                performanceData: clientData,
                accountDetails: accountDetails,
                googleAnalyticsData: googleAnalyticsData,
            }, null, 2);
            
            // Construct a valid history for the API, ensuring it alternates roles
            // and injecting context only into the very last user message.
            const contents = updatedHistory
                .slice(1) // Exclude the initial greeting from the API history
                .map((msg, index, arr) => {
                    // Check if this is the last message and it's from the user
                    if (index === arr.length - 1 && msg.role === 'user') {
                        return {
                            role: 'user',
                            parts: [{ text: `Given the following data, answer the question.\n\nClient Data:\n${dataContext}\n\nQuestion:\n${msg.text}` }]
                        };
                    }
                    return {
                        role: msg.role,
                        parts: [{ text: msg.text }]
                    };
                });

            const stream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    systemInstruction: systemPrompt,
                }
            });

            let currentModelResponse = '';
            let messageAdded = false;

            for await (const chunk of stream) {
                currentModelResponse += chunk.text;
                if (!messageAdded) {
                    setChatHistory(prev => [...prev, { role: 'model', text: '' }]);
                    messageAdded = true;
                }
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'model') {
                      newHistory[newHistory.length - 1] = { role: 'model', text: currentModelResponse };
                    }
                    return newHistory;
                });
            }

        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to get response from AI: ${errorMessage}`);
             setChatHistory(prev => [...prev, { role: 'model', text: `Whoa, bogus! My circuits got crossed. Please try again. (${errorMessage})`}]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-[500px] bg-black/10 rounded-lg border border-[var(--color-border)]">
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-6">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         {msg.role === 'model' && <RobotAvatar />}
                        <div className={`prose max-w-xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-card-bg)] text-[var(--color-text-primary)]'}`}
                             dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}>
                        </div>
                    </div>
                ))}
                {isLoading && <TypingIndicator />}
            </div>
             {error && (
                <div className="p-4 border-t border-[var(--color-border)] text-center text-[var(--color-negative)] bg-[var(--color-negative-bg)]">
                    {error}
                </div>
            )}
            <div className="p-4 border-t border-[var(--color-border)]">
                <form onSubmit={handleSendMessage} className="flex gap-4">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ask about this client's data..."
                        className="flex-grow bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                        disabled={isLoading || !clientData.length}
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !userInput.trim() || !clientData.length}
                        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        {isLoading ? 'Thinking...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWithData;