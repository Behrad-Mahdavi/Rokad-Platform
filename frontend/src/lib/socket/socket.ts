import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../auth/auth-store';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;

    socket = io('/chat', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: {
        token: `Bearer ${token}`,
      },
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  const token = useAuthStore.getState().accessToken;

  if (s.disconnected) {
    s.auth = { token: `Bearer ${token}` };
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
