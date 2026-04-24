import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BoardService } from '../../../../core/services/board.service';
import { SocketService } from '../../../../core/services/socket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Board } from '../../../../core/models/board.model';
import { User } from '../../../../core/models/user.model';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: string;
}

interface CursorData {
  x: number;
  y: number;
  userId: string;
  userName: string;
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  board: Board | null = null;
  currentUser: User | null = null;
  boardId = '';

  // Drawing state
  isDrawing = false;
  currentStroke: Stroke | null = null;
  strokes: Stroke[] = [];
  ctx!: CanvasRenderingContext2D;

  // Tool settings
  currentColor = '#ffffff';
  currentWidth = 3;
  currentTool = 'pen'; // pen, eraser

  // Colors palette
  colors = [
    '#ffffff', '#ff4d4d', '#ff9f43', '#feca57',
    '#48dbfb', '#7c5cfc', '#ff6b81', '#2ecc71',
  ];

  // Stroke widths
  widths = [2, 4, 6, 10];

  // Live cursors from other users
  remoteCursors = new Map<string, CursorData>();

  // Online users
  onlineUsers: { userId: string; userName: string }[] = [];

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private boardService: BoardService,
    private socketService: SocketService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.boardId = this.route.snapshot.paramMap.get('id') || '';

    // Load board details
    this.boardService.getById(this.boardId).subscribe({
      next: (board) => {
        this.board = board;
        this.cdr.detectChanges();
      },
      error: () => {
        this.router.navigate(['/dashboard']);
      },
    });

    // Connect socket and join board room
    this.socketService.connect();
    this.socketService.emit('join-board', {
      boardId: this.boardId,
      userId: this.currentUser?.id,
      userName: this.currentUser?.name,
    });

    // Listen for real-time events
    this.setupSocketListeners();
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
  }

  ngOnDestroy(): void {
    // Leave the board room
    this.socketService.emit('leave-board', { boardId: this.boardId });
    this.socketService.disconnect();

    // Clean up subscriptions
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  // ─── CANVAS SETUP ───
  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60; // Account for toolbar

    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Handle window resize
    window.addEventListener('resize', () => {
      const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 60;
      this.ctx.putImageData(imageData, 0, 0);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    });
  }

  // ─── SOCKET LISTENERS ───
  private setupSocketListeners(): void {
    // When another user draws
    const drawSub = this.socketService.on('draw').subscribe((stroke: Stroke) => {
      this.drawStroke(stroke);
      this.strokes.push(stroke);
    });

    // When another user moves their cursor
    const cursorSub = this.socketService.on('cursor-move').subscribe((cursor: CursorData) => {
      this.remoteCursors.set(cursor.userId, cursor);
      this.cdr.detectChanges();
    });

    // When a user joins
    const joinSub = this.socketService.on('user-joined').subscribe((user: any) => {
      if (!this.onlineUsers.find((u) => u.userId === user.userId)) {
        this.onlineUsers.push(user);
        this.cdr.detectChanges();
      }
    });

    // When a user leaves
    const leaveSub = this.socketService.on('user-left').subscribe((user: any) => {
      this.onlineUsers = this.onlineUsers.filter((u) => u.userId !== user.userId);
      this.remoteCursors.delete(user.userId);
      this.cdr.detectChanges();
    });

    // Current users in room
    const roomSub = this.socketService.on('room-users').subscribe((users: any[]) => {
      this.onlineUsers = users;
      this.cdr.detectChanges();
    });
    // Load saved strokes when joining a board
    const loadSub = this.socketService.on('load-strokes').subscribe((strokes: Stroke[]) => {
      console.log('Loading', strokes.length, 'saved strokes');
      this.strokes = strokes;
      // Redraw all strokes on canvas
      this.redrawCanvas();
      this.cdr.detectChanges();
    });
    // Clear board event
    const clearSub = this.socketService.on('clear-board').subscribe(() => {
      this.clearCanvas();
    });

this.subscriptions.push(drawSub, cursorSub, joinSub, leaveSub, roomSub, clearSub, loadSub);
  }

  // ─── DRAWING METHODS ───
  onMouseDown(event: MouseEvent): void {
    this.isDrawing = true;
    const point = this.getPoint(event);

    this.currentStroke = {
      id: Date.now().toString(),
      points: [point],
      color: this.currentTool === 'eraser' ? '#0f0f1a' : this.currentColor,
      width: this.currentTool === 'eraser' ? 20 : this.currentWidth,
      tool: this.currentTool,
    };

    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
    this.ctx.strokeStyle = this.currentStroke.color;
    this.ctx.lineWidth = this.currentStroke.width;
  }

  onMouseMove(event: MouseEvent): void {
    const point = this.getPoint(event);

    // Send cursor position to others
    this.socketService.emit('cursor-move', {
      boardId: this.boardId,
      cursor: {
        x: point.x,
        y: point.y,
        userId: this.currentUser?.id,
        userName: this.currentUser?.name,
      },
    });

    if (!this.isDrawing || !this.currentStroke) return;

    this.currentStroke.points.push(point);
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
  }

  onMouseUp(): void {
    if (!this.isDrawing || !this.currentStroke) return;

    this.isDrawing = false;

    // Only send if there are actual points drawn
    if (this.currentStroke.points.length > 1) {
      this.strokes.push(this.currentStroke);

      // Send the completed stroke to other users
      this.socketService.emit('draw', {
        boardId: this.boardId,
        stroke: this.currentStroke,
      });
    }

    this.currentStroke = null;
  }

  onMouseLeave(): void {
    this.onMouseUp();
  }

  // Touch support for mobile
  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.onMouseDown(mouseEvent);
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.onMouseMove(mouseEvent);
  }

  onTouchEnd(): void {
    this.onMouseUp();
  }

  // ─── HELPER METHODS ───
  private getPoint(event: MouseEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private drawStroke(stroke: Stroke): void {
    if (stroke.points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    this.ctx.stroke();
  }

  private clearCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.strokes = [];
  }
private redrawCanvas(): void {
  const canvas = this.canvasRef.nativeElement;
  this.ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Redraw all saved strokes
  for (const stroke of this.strokes) {
    this.drawStroke(stroke);
  }
}
  // ─── TOOLBAR ACTIONS ───
  setColor(color: string): void {
    this.currentColor = color;
    this.currentTool = 'pen';
  }

  setWidth(width: number): void {
    this.currentWidth = width;
  }

  setTool(tool: string): void {
    this.currentTool = tool;
  }

  clearBoard(): void {
    this.clearCanvas();
    this.socketService.emit('clear-board', { boardId: this.boardId });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getCursorArray(): CursorData[] {
    return Array.from(this.remoteCursors.values());
  }
}