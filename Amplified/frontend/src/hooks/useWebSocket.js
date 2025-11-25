import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url, token = null) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);

    const connect = useCallback(() => {
        try {
            // Append token as query parameter if provided
            const wsUrl = token ? `${url}?token=${token}` : url;
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
                setIsConnected(true);
                if (reconnectTimeout.current) {
                    clearTimeout(reconnectTimeout.current);
                    reconnectTimeout.current = null;
                }
            };

            ws.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    setLastMessage(message);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.current.onclose = () => {
                console.log('WebSocket Disconnected');
                setIsConnected(false);
                // Auto-reconnect after 3 seconds
                reconnectTimeout.current = setTimeout(() => {
                    console.log('Attempting to reconnect...');
                    connect();
                }, 3000);
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
                ws.current.close();
            };
        } catch (error) {
            console.error('WebSocket Connection Failed:', error);
        }
    }, [url, token]);

    useEffect(() => {
        // Only connect if we have a token
        if (token) {
            connect();
        }
        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
        };
    }, [connect, token]);

    const sendMessage = useCallback((message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected. Message not sent.');
        }
    }, []);

    return { isConnected, lastMessage, sendMessage };
};
