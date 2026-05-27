import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { IFrame, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useLocation } from 'react-router-dom';

interface ChatWebSocketContextType {
    isConnected: boolean;
    subscribe: (topic: string, callback: (message: IMessage) => void) => () => void;
}

const ChatWebSocketContext = createContext<ChatWebSocketContextType | null>(null);

export const useChatWebSocket = () => {
    const context = useContext(ChatWebSocketContext);
    if (!context) {
        throw new Error('useChatWebSocket must be used within a ChatWebSocketProvider');
    }
    return context;
};

export const ChatWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef<Client | null>(null);
    const location = useLocation();

    // Determine if we are in admin area
    const isAdmin = location.pathname.startsWith('/admin');

    // Get appropriate token
    const token = isAdmin ? localStorage.getItem('adminToken') : localStorage.getItem('customerToken');
    const userId = isAdmin ? 1 : (localStorage.getItem('customerUserId') ? Number(localStorage.getItem('customerUserId')) : null);

    useEffect(() => {
        // Only connect if user is logged in
        if (!token || !userId) {
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Endpoint riêng của chat-service: /chat-ws
        const socketUrl = `${import.meta.env.VITE_API_URL}/chat-ws`;

        const client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: (str) => {
                console.log('CHAT-STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = (frame: IFrame) => {
            console.log('CHAT-STOMP Connected: ' + frame);
            setIsConnected(true);
        };

        client.onStompError = (frame: IFrame) => {
            console.error('CHAT-STOMP Error: ' + frame.body);
            setIsConnected(false);
        };

        client.onDisconnect = () => {
            console.log('CHAT-STOMP Disconnected');
            setIsConnected(false);
        };

        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [token, userId]);

    const subscribe = (topic: string, callback: (message: IMessage) => void) => {
        if (!clientRef.current || !isConnected) {
            console.warn(`CHAT-STOMP: Cannot subscribe to ${topic} - Client not connected`, {
                isConnected,
                hasClient: !!clientRef.current
            });
            return () => { };
        }

        const subscription = clientRef.current.subscribe(topic, (message) => {
            console.log(`CHAT-STOMP: Message received on ${topic}`);
            callback(message);
        });

        console.log(`CHAT-STOMP: ✅ Subscribed to ${topic}`);

        return () => {
            subscription.unsubscribe();
            console.log(`CHAT-STOMP: ❌ Unsubscribed from ${topic}`);
        };
    };

    return (
        <ChatWebSocketContext.Provider value={{ isConnected, subscribe }}>
            {children}
        </ChatWebSocketContext.Provider>
    );
};
