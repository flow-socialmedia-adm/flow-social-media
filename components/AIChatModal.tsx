import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ChatMessage } from '../types';
import { XIcon, SendIcon } from './icons';
import { FlowBrandLogo } from './brand/FlowBrandLogo';
import { GoogleGenAI, Chat } from '@google/genai';

interface AIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose }) => {
    const context = useContext(AppContext);
    const [conversation, setConversation] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    if (!context) return null;
    const { t, tasks, clients } = context;
    
    // Initialize welcome message
    useEffect(() => {
        if (isOpen && conversation.length === 0) {
            setConversation([{ role: 'model', content: t('ai_welcome_message') }]);
        }
    }, [isOpen, t, conversation.length]);

    // Initialize chat session
    useEffect(() => {
        if (isOpen && !chatRef.current) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                
                const taskSummary = tasks.slice(0, 10).map(t => {
                    const client = clients.find(c => c.id === t.clientId);
                    return `- ${t.title} for ${client ? client.name : 'General Task'} due on ${t.date} with status ${t.statusId}`;
                }).join('\n');

                const systemInstruction = `You are an intelligent assistant for Flow Social Media, a CRM for social media agencies. Your name is Flow AI. 
                You can answer questions about social media strategies, help brainstorm content ideas, and analyze task data. Be helpful, friendly, and concise.
                When answering, you can use markdown for lists, bolding, etc.
                Current user's task summary for context:
                ${taskSummary}
                `;

                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction,
                    },
                });
            } catch (error) {
                console.error("Failed to initialize Gemini AI:", error);
                setConversation(prev => [...prev, { role: 'model', content: 'Error initializing AI. Please check the API key.' }]);
            }
        }
    }, [isOpen, tasks, clients]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [conversation]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !chatRef.current) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setConversation(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await chatRef.current.sendMessageStream({ message: input });
            
            let currentResponse = '';
            setConversation(prev => [...prev, { role: 'model', content: '' }]);

            for await (const chunk of result) {
                currentResponse += chunk.text;
                setConversation(prev => {
                    const newConversation = [...prev];
                    newConversation[newConversation.length - 1].content = currentResponse;
                    return newConversation;
                });
            }
        } catch (error) {
            console.error("Gemini API error:", error);
            setConversation(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <FlowBrandLogo variant="symbol" height={28} />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('chat_with_ai')}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="flex-1 overflow-y-auto p-6 space-y-4">
                    {conversation.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-lg'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                            <div className="max-w-[80%] p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-lg">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-75"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-150"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder={t('ask_anything')}
                            disabled={isLoading}
                            className="w-full bg-transparent p-3 text-sm focus:outline-none"
                        />
                        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 text-indigo-600 disabled:text-gray-400 dark:disabled:text-gray-500 hover:text-indigo-800 dark:hover:text-indigo-400 transition-colors">
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AIChatModal;
