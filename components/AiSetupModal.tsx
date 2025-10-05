import React, { useState, useRef, useEffect } from 'react';
import type { DebateFormat } from '../types';
import { parseTournamentDetailsFromPrompt } from '../services/geminiService';
import { XIcon, SparklesIcon } from './IconComponents';
import LoadingSpinner from './LoadingSpinner';

interface AiSetupModalProps {
    onClose: () => void;
    onSetupComplete: (name: string, format: DebateFormat) => void;
}

type Message = {
    sender: 'user' | 'ai';
    text: string;
};

const AiSetupModal: React.FC<AiSetupModalProps> = ({ onClose, onSetupComplete }) => {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: "Hello! Tell me about the tournament you want to create. For example: 'Set up a British Parliamentary tournament called the Winter Championship'." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input.trim();
        setInput('');
        setIsLoading(true);

        try {
            const { name, format } = await parseTournamentDetailsFromPrompt(currentInput);
            
            if (!name || !format) {
                 const aiClarification: Message = { sender: 'ai', text: `I think the format is ${format}, but I missed the tournament name. Could you please provide it?` };
                 setMessages(prev => [...prev, aiClarification]);
            } else {
                const aiConfirmation: Message = { sender: 'ai', text: `Great! I've set up a ${format} tournament named "${name}". You'll see the details filled in when you close this window.` };
                setMessages(prev => [...prev, aiConfirmation]);
                onSetupComplete(name, format);
                // No need to close automatically, let the user close it.
            }
        } catch (error) {
            const errorMessage: Message = { sender: 'ai', text: "I'm sorry, I had trouble understanding that. Could you please try rephrasing? Make sure to include the tournament name and format." };
            setMessages(prev => [...prev, errorMessage]);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-dark-charcoal-secondary w-full max-w-lg rounded-2xl shadow-2xl flex flex-col h-[70vh] border border-gray-700">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-primary-orange" />
                        <h2 className="text-xl font-bold text-cream-white">AI Tournament Setup</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md rounded-xl px-4 py-2 ${msg.sender === 'user' ? 'bg-primary-orange text-white' : 'bg-dark-charcoal text-gray-200'}`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className="max-w-md rounded-xl px-4 py-2 bg-dark-charcoal text-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                </div>
                             </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-gray-700">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your setup command..."
                            className="input-field flex-1"
                            disabled={isLoading}
                        />
                        <button type="submit" className="btn-primary" disabled={isLoading || !input.trim()}>
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AiSetupModal;