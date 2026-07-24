import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: true,
});

export function joinUserRoom(userId: string) {
  socket.emit('join-user', userId);
}

export function joinMarketRoom(marketId: string) {
  socket.emit('join-market', marketId);
}

export function leaveMarketRoom(marketId: string) {
  socket.emit('leave-market', marketId);
}

export default socket;
