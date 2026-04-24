import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type {
  UserData,
  JoinBoardData,
  DrawData,
  CursorMoveData,
  ShapeData,
  StickyData,
  UndoData,
  ClearBoardData,
} from './board.gateway.types';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeUsers = new Map<string, UserData>();

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    const user = this.activeUsers.get(client.id);
    if (user) {
      client.to(user.boardId).emit('user-left', {
        userId: user.userId,
        userName: user.userName,
      });
      this.activeUsers.delete(client.id);
    }
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('join-board')
  async handleJoinBoard(client: Socket, data: JoinBoardData) {
    await client.join(data.boardId);

    this.activeUsers.set(client.id, {
      userId: data.userId,
      userName: data.userName,
      boardId: data.boardId,
    });

    client.to(data.boardId).emit('user-joined', {
      userId: data.userId,
      userName: data.userName,
    });

    const usersInRoom = Array.from(this.activeUsers.values()).filter(
      (u: UserData) => u.boardId === data.boardId,
    );
    client.emit('room-users', usersInRoom);

    console.log(data.userName, 'joined board', data.boardId);
  }

  @SubscribeMessage('leave-board')
  async handleLeaveBoard(client: Socket, data: JoinBoardData) {
    await client.leave(data.boardId);
    const user = this.activeUsers.get(client.id);
    if (user) {
      client.to(data.boardId).emit('user-left', {
        userId: user.userId,
        userName: user.userName,
      });
      this.activeUsers.delete(client.id);
    }
  }

  @SubscribeMessage('draw')
  handleDraw(client: Socket, data: DrawData) {
    client.to(data.boardId).emit('draw', data.stroke);
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(client: Socket, data: CursorMoveData) {
    client.to(data.boardId).emit('cursor-move', data.cursor);
  }

  @SubscribeMessage('add-shape')
  handleAddShape(client: Socket, data: ShapeData) {
    client.to(data.boardId).emit('add-shape', data.shape);
  }

  @SubscribeMessage('add-sticky')
  handleAddSticky(client: Socket, data: StickyData) {
    client.to(data.boardId).emit('add-sticky', data.sticky);
  }

  @SubscribeMessage('update-sticky')
  handleUpdateSticky(client: Socket, data: StickyData) {
    client.to(data.boardId).emit('update-sticky', data.sticky);
  }

  @SubscribeMessage('undo')
  handleUndo(client: Socket, data: any) {
    client.to(data.boardId).emit('undo', { actionId: data.actionId });
  }

  @SubscribeMessage('clear-board')
  handleClearBoard(client: Socket, data: any) {
    client.to(data.boardId).emit('clear-board');
  }
}
