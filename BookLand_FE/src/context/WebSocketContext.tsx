import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { IFrame, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useLocation } from 'react-router-dom';

interface WebSocketContextType {
    isConnected: boolean;
    subscribe: (topic: string, callback: (message: IMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef<Client | null>(null);
    const location = useLocation();

    // Determine if we are in admin area
    const isAdmin = location.pathname.startsWith('/admin');

    // Get appropriate token and userId
    const token = isAdmin ? localStorage.getItem('adminToken') : localStorage.getItem('customerToken');
    // For admin, use ID 1 (or extract from token if implemented). For customer, get from storage
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

        const socketUrl = `${import.meta.env.VITE_API_URL}/ws`;

        const client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: (str) => {
                console.log('STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = (frame: IFrame) => {
            console.log('STOMP Connected: ' + frame);
            setIsConnected(true);
        };

        client.onStompError = (frame: IFrame) => {
            console.error('STOMP Error: ' + frame.body);
            setIsConnected(false);
        };

        client.onDisconnect = () => {
            console.log('STOMP Disconnected');
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
            console.warn(`STOMP: Cannot subscribe to ${topic} - Client not connected`, {
                isConnected,
                hasClient: !!clientRef.current
            });
            return () => { };
        }

        const subscription = clientRef.current.subscribe(topic, (message) => {
            console.log(`STOMP: Message received on ${topic}`);
            callback(message);
        });

        console.log(`STOMP: ✅ Subscribed to ${topic}`);

        return () => {
            subscription.unsubscribe();
            console.log(`STOMP: ❌ Unsubscribed from ${topic}`);
        };
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
};
