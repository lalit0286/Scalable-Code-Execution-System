import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@code-exec/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket?.connected) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(API_URL, {
    transports: ['websocket', 'polling'], // websocket preferred, polling fallback
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10_000,
    // Compression for low-bandwidth environments
    perMessageDeflate: true,
  });

  socket.on('connect', () => {
    console.debug('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.debug('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
}

export function subscribeToExecution(execution_id: string): void {
  const s = getSocket();
  s.emit(SOCKET_EVENTS.SUBSCRIBE, { execution_id });
}

export function unsubscribeFromExecution(execution_id: string): void {
  const s = getSocket();
  s.emit(SOCKET_EVENTS.UNSUBSCRIBE, { execution_id });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
