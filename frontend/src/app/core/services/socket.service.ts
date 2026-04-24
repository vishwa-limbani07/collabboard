import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  // Connect to the NestJS WebSocket server
  connect(): void {
    if (!this.socket) {
      this.socket = io(environment.wsUrl, {
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Emit an event TO the server
  // Like making a POST request, but over WebSocket
  emit(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Listen for an event FROM the server
  // Returns an Observable — very Angular-friendly!
  on(event: string): Observable<any> {
    return new Observable((subscriber) => {
      if (this.socket) {
        this.socket.on(event, (data: any) => {
          subscriber.next(data);
        });
      }

      // Cleanup when unsubscribed (like ngOnDestroy)
      return () => {
        if (this.socket) {
          this.socket.off(event);
        }
      };
    });
  }
}