import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ShapesService } from '../shapes/shapes.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
})
export class BoardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private activeUsers = new Map();

  constructor(private shapesService: ShapesService) {}

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
  async handleJoinBoard(client: Socket, data: any) {
    client.join(data.boardId);

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
      (u: any) => u.boardId === data.boardId,
    );
    client.emit('room-users', usersInRoom);

    // NEW: Load all saved strokes and send to the joining user
    try {
      const savedStrokes = await this.shapesService.getStrokesByBoard(
        data.boardId,
      );

      // Convert MongoDB documents to the format the frontend expects
      const strokes = savedStrokes.map((s) => ({
        id: s.strokeId,
        points: s.points,
        color: s.color,
        width: s.width,
        tool: s.tool,
      }));

      client.emit('load-strokes', strokes);
      console.log(
        data.userName,
        'joined board',
        data.boardId,
        '- loaded',
        strokes.length,
        'strokes',
      );
    } catch (err) {
      console.error('Error loading strokes:', err);
      client.emit('load-strokes', []);
    }
  }

  @SubscribeMessage('leave-board')
  handleLeaveBoard(client: Socket, data: any) {
    client.leave(data.boardId);
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
  async handleDraw(client: Socket, data: any) {
    // Broadcast to others
    client.to(data.boardId).emit('draw', data.stroke);

    // NEW: Save stroke to database
    try {
      await this.shapesService.saveStroke(data.boardId, data.stroke);
    } catch (err) {
      console.error('Error saving stroke:', err);
    }
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(client: Socket, data: any) {
    client.to(data.boardId).emit('cursor-move', data.cursor);
  }

  @SubscribeMessage('add-shape')
  handleAddShape(client: Socket, data: any) {
    client.to(data.boardId).emit('add-shape', data.shape);
  }

  @SubscribeMessage('add-sticky')
  handleAddSticky(client: Socket, data: any) {
    client.to(data.boardId).emit('add-sticky', data.sticky);
  }

  @SubscribeMessage('update-sticky')
  handleUpdateSticky(client: Socket, data: any) {
    client.to(data.boardId).emit('update-sticky', data.sticky);
  }

  @SubscribeMessage('undo')
  handleUndo(client: Socket, data: any) {
    client.to(data.boardId).emit('undo', { actionId: data.actionId });
  }

  @SubscribeMessage('clear-board')
  async handleClearBoard(client: Socket, data: any) {
    client.to(data.boardId).emit('clear-board');

    // NEW: Delete all strokes from database
    try {
      await this.shapesService.deleteStrokesByBoard(data.boardId);
      console.log('Cleared all strokes for board', data.boardId);
    } catch (err) {
      console.error('Error clearing strokes:', err);
    }
  }
}