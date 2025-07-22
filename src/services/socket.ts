import { io, Socket } from 'socket.io-client';

// 환경에 따른 소켓 URL 설정
// const SOCKET_URL = 'http://192.168.35.96:3001'; // 로컬 테스트용
const SOCKET_URL = 'https://week3server-production.up.railway.app'; // Railway 배포용
// const SOCKET_URL = 'http://localhost:3001';


class SocketService {
  public socket: Socket | null = null;

  private skillAssignedHandlers: ((data: any) => void)[] = [];
  private skillReadyCountHandlers: ((data: any) => void)[] = [];
  private allSkillReadyHandlers: (() => void)[] = [];

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

    this.socket.on('skillAssigned', (data) => {
      this.skillAssignedHandlers.forEach(fn => fn(data));
    });
    this.socket.on('skillReadyCount', (data) => {
      this.skillReadyCountHandlers.forEach(fn => fn(data));
    });
    this.socket.on('allSkillReady', () => {
      this.allSkillReadyHandlers.forEach(fn => fn());
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  // 콜백 등록/해제 메서드
  registerSkillAssignedHandler(fn: (data: any) => void) {
    this.skillAssignedHandlers.push(fn);
  }
  unregisterSkillAssignedHandler(fn: (data: any) => void) {
    this.skillAssignedHandlers = this.skillAssignedHandlers.filter(f => f !== fn);
  }
  registerSkillReadyCountHandler(fn: (data: any) => void) {
    this.skillReadyCountHandlers.push(fn);
  }
  unregisterSkillReadyCountHandler(fn: (data: any) => void) {
    this.skillReadyCountHandlers = this.skillReadyCountHandlers.filter(f => f !== fn);
  }
  registerAllSkillReadyHandler(fn: () => void) {
    this.allSkillReadyHandlers.push(fn);
  }
  unregisterAllSkillReadyHandler(fn: () => void) {
    this.allSkillReadyHandlers = this.allSkillReadyHandlers.filter(f => f !== fn);
  }
}

const socket = new SocketService();
export default socket;
