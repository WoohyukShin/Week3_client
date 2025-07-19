import { io, Socket } from 'socket.io-client';

// 환경에 따른 소켓 URL 설정
// Railway 배포 후 실제 도메인으로 변경하세요!
// 예: https://your-backend-name.railway.app

// SOCKET_URL
// const SOCKET_URL = 'http://192.168.35.96:3001'; // 로컬 테스트용
const SOCKET_URL = 'https://week3server-production.up.railway.app'; // Railway 배포용

class SocketService {
  public socket: Socket | null = null;

  connect(): void {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string): void {
    this.socket?.off(event);
  }
}

const socket = new SocketService();
export default socket;
