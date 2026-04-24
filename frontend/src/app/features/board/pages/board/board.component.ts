import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BoardService } from '../../../../core/services/board.service';
import { SocketService } from '../../../../core/services/socket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Board } from '../../../../core/models/board.model';
import { User } from '../../../../core/models/user.model';

interface DrawItem {
  id: string;
  tool: string;
  points: { x: number; y: number }[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  filled: boolean;
  text: string;
  fontSize: number;
}

interface CursorData {
  x: number;
  y: number;
  userId: string;
  userName: string;
}
interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize: number;
}
@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mainCanvas') mainCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewCanvas') previewCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('textInput') textInputRef!: ElementRef<HTMLInputElement>;

  board: Board | null = null;
  currentUser: User | null = null;
  boardId = '';

  // Drawing state
  isDrawing = false;
  drawItems: DrawItem[] = [];
  mainCtx!: CanvasRenderingContext2D;
  previewCtx!: CanvasRenderingContext2D;

  // Current drawing item
  startX = 0;
  startY = 0;
  currentPoints: { x: number; y: number }[] = [];

  // Tool settings
  currentColor = '#ffffff';
  currentWidth = 3;
  currentTool = 'pen';
  isFilled = false;
  currentFontSize = 20;

  // Text input state
  showTextInput = false;
  textInputX = 0;
  textInputY = 0;
  textInputValue = '';
  // Zoom and pan
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  isPanning = false;
  panStartX = 0;
  panStartY = 0;
  spacePressed = false;
  showCopiedToast = false;

  // Tools list
  tools = [
    { id: 'pen', label: 'Pen', icon: '✏️' },
    { id: 'eraser', label: 'Eraser', icon: '🧹' },
    { id: 'rect', label: 'Rectangle', icon: '⬜' },
    { id: 'circle', label: 'Circle', icon: '⭕' },
    { id: 'line', label: 'Line', icon: '📏' },
    { id: 'arrow', label: 'Arrow', icon: '↗️' },
    { id: 'text', label: 'Text', icon: '🔤' },
    { id: 'sticky', label: 'Sticky note', icon: '📌' },
  ];
  colors = ['#ffffff', '#ff4d4d', '#ff9f43', '#feca57', '#48dbfb', '#7c5cfc', '#ff6b81', '#2ecc71'];

  widths = [2, 4, 6, 10];

  remoteCursors = new Map<string, CursorData>();
  onlineUsers: { userId: string; userName: string }[] = [];

  // Undo/Redo stacks
  undoStack: DrawItem[] = [];

  private subscriptions: Subscription[] = [];
  // Sticky notes
  stickies: StickyNote[] = [];
  draggingSticky: StickyNote | null = null;
  editingSticky: StickyNote | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;

  stickyColors = ['#feca57', '#ff6b81', '#48dbfb', '#2ecc71', '#ff9f43', '#a29bfe'];
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

    this.boardService.getById(this.boardId).subscribe({
      next: (board) => {
        this.board = board;
        this.cdr.detectChanges();
      },
      error: () => {
        this.router.navigate(['/dashboard']);
      },
    });

    this.socketService.connect();
    this.socketService.emit('join-board', {
      boardId: this.boardId,
      userId: this.currentUser?.id,
      userName: this.currentUser?.name,
    });

    this.setupSocketListeners();
  }

  ngAfterViewInit(): void {
    this.setupCanvases();
  }

  ngOnDestroy(): void {
    this.socketService.emit('leave-board', { boardId: this.boardId });
    this.socketService.disconnect();
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.showTextInput) return;

    if (event.code === 'Space') {
      const target = event.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        return; // Allow space in text inputs
      }
      event.preventDefault();
      this.spacePressed = true;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    }
    if (
      ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) ||
      ((event.ctrlKey || event.metaKey) && event.key === 'y')
    ) {
      event.preventDefault();
      this.redo();
    }
    // + / - for zoom
    if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
      event.preventDefault();
      this.zoomIn();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === '-') {
      event.preventDefault();
      this.zoomOut();
    }
    // 0 to reset zoom
    if ((event.ctrlKey || event.metaKey) && event.key === '0') {
      event.preventDefault();
      this.resetZoom();
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyup(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      this.spacePressed = false;
    }
  }

  // ─── CANVAS SETUP ───
  private setupCanvases(): void {
    const mainCanvas = this.mainCanvasRef.nativeElement;
    const previewCanvas = this.previewCanvasRef.nativeElement;

    const w = window.innerWidth;
    const h = window.innerHeight;

    mainCanvas.width = w;
    mainCanvas.height = h;
    previewCanvas.width = w;
    previewCanvas.height = h;

    this.mainCtx = mainCanvas.getContext('2d')!;
    this.previewCtx = previewCanvas.getContext('2d')!;

    this.mainCtx.lineCap = 'round';
    this.mainCtx.lineJoin = 'round';
    this.previewCtx.lineCap = 'round';
    this.previewCtx.lineJoin = 'round';

    window.addEventListener('resize', () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      const imageData = this.mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
      mainCanvas.width = nw;
      mainCanvas.height = nh;
      previewCanvas.width = nw;
      previewCanvas.height = nh;
      this.mainCtx.putImageData(imageData, 0, 0);
      this.mainCtx.lineCap = 'round';
      this.mainCtx.lineJoin = 'round';
      this.previewCtx.lineCap = 'round';
      this.previewCtx.lineJoin = 'round';
    });
  }

  // ─── SOCKET LISTENERS ───
  private setupSocketListeners(): void {
    const drawSub = this.socketService.on('draw').subscribe((item: DrawItem) => {
      this.drawItems.push(item);
      this.drawItem(this.mainCtx, item);
    });

    const loadSub = this.socketService.on('load-strokes').subscribe((items: DrawItem[]) => {
      console.log('Loading', items.length, 'saved items');
      this.drawItems = items;
      this.redrawCanvas();
      this.cdr.detectChanges();
    });

    const cursorSub = this.socketService.on('cursor-move').subscribe((cursor: CursorData) => {
      this.remoteCursors.set(cursor.userId, cursor);
      this.cdr.detectChanges();
    });

    const joinSub = this.socketService.on('user-joined').subscribe((user: any) => {
      if (!this.onlineUsers.find((u) => u.userId === user.userId)) {
        this.onlineUsers.push(user);
        this.cdr.detectChanges();
      }
    });

    const leaveSub = this.socketService.on('user-left').subscribe((user: any) => {
      this.onlineUsers = this.onlineUsers.filter((u) => u.userId !== user.userId);
      this.remoteCursors.delete(user.userId);
      this.cdr.detectChanges();
    });

    const roomSub = this.socketService.on('room-users').subscribe((users: any[]) => {
      this.onlineUsers = users;
      this.cdr.detectChanges();
    });
    const loadStickySub = this.socketService
      .on('load-stickies')
      .subscribe((stickies: StickyNote[]) => {
        console.log('Loading', stickies.length, 'sticky notes');
        this.stickies = stickies;
        this.cdr.detectChanges();
      });

    const addStickySub = this.socketService.on('add-sticky').subscribe((sticky: StickyNote) => {
      this.stickies.push(sticky);
      this.cdr.detectChanges();
    });

    const updateStickySub = this.socketService
      .on('update-sticky')
      .subscribe((sticky: StickyNote) => {
        const index = this.stickies.findIndex((s) => s.id === sticky.id);
        if (index !== -1) {
          this.stickies[index] = sticky;
          this.cdr.detectChanges();
        }
      });

    const deleteStickySub = this.socketService.on('delete-sticky').subscribe((data: any) => {
      this.stickies = this.stickies.filter((s) => s.id !== data.stickyId);
      this.cdr.detectChanges();
    });
    const clearSub = this.socketService.on('clear-board').subscribe(() => {
      this.drawItems = [];
      this.stickies = [];
      this.clearCanvas();
      this.cdr.detectChanges();
    });

    this.subscriptions.push(
      drawSub,
      loadSub,
      cursorSub,
      joinSub,
      leaveSub,
      roomSub,
      clearSub,
      loadStickySub,
      addStickySub,
      updateStickySub,
      deleteStickySub,
    );
  }

  // ─── MOUSE EVENTS ───
  onMouseDown(event: MouseEvent): void {
    // Handle panning with space+drag or middle click
    if (this.spacePressed || event.button === 1) {
      this.isPanning = true;
      this.panStartX = event.clientX - this.offsetX;
      this.panStartY = event.clientY - this.offsetY;
      return;
    }
    const point = this.getPoint(event);
    if (this.currentTool === 'sticky') {
      this.addSticky(point.x, point.y);
      return;
    }
    if (this.currentTool === 'text') {
      this.showTextInput = true;
      this.textInputX = point.x;
      this.textInputY = point.y;
      this.textInputValue = '';
      this.cdr.detectChanges();
      setTimeout(() => this.textInputRef?.nativeElement?.focus(), 10);
      return;
    }

    this.isDrawing = true;
    this.startX = point.x;
    this.startY = point.y;
    this.currentPoints = [point];

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      this.mainCtx.beginPath();
      this.mainCtx.moveTo(point.x, point.y);
      const eraserColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--canvas-bg')
        .trim();
      this.mainCtx.strokeStyle = this.currentTool === 'eraser' ? eraserColor : this.currentColor;
      this.mainCtx.lineWidth = this.currentTool === 'eraser' ? 20 : this.currentWidth;
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      this.offsetX = event.clientX - this.panStartX;
      this.offsetY = event.clientY - this.panStartY;
      this.applyTransform();
      return;
    }
    const point = this.getPoint(event);

    this.socketService.emit('cursor-move', {
      boardId: this.boardId,
      cursor: {
        x: point.x,
        y: point.y,
        userId: this.currentUser?.id,
        userName: this.currentUser?.name,
      },
    });

    if (!this.isDrawing) return;

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      this.currentPoints.push(point);
      this.mainCtx.lineTo(point.x, point.y);
      this.mainCtx.stroke();
    } else {
      // For shapes: draw live preview on the preview canvas
      this.clearPreview();
      const previewItem: DrawItem = {
        id: 'preview',
        tool: this.currentTool,
        points: [],
        startX: this.startX,
        startY: this.startY,
        endX: point.x,
        endY: point.y,
        color: this.currentColor,
        width: this.currentWidth,
        filled: this.isFilled,
        text: '',
        fontSize: this.currentFontSize,
      };
      this.drawItem(this.previewCtx, previewItem);
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const point = this.getPoint(event);

    let newItem: DrawItem;

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      if (this.currentPoints.length < 2) return;
      newItem = {
        id: Date.now().toString(),
        tool: this.currentTool,
        points: this.currentPoints,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        color: this.currentTool === 'eraser' ? '#0f0f1a' : this.currentColor,
        width: this.currentTool === 'eraser' ? 20 : this.currentWidth,
        filled: false,
        text: '',
        fontSize: this.currentFontSize,
      };
    } else {
      // Shape tool
      this.clearPreview();
      newItem = {
        id: Date.now().toString(),
        tool: this.currentTool,
        points: [],
        startX: this.startX,
        startY: this.startY,
        endX: point.x,
        endY: point.y,
        color: this.currentColor,
        width: this.currentWidth,
        filled: this.isFilled,
        text: '',
        fontSize: this.currentFontSize,
      };
      // Draw finalized shape on main canvas
      this.drawItem(this.mainCtx, newItem);
    }

    this.drawItems.push(newItem);
    this.undoStack = []; // Clear redo stack on new action

    this.socketService.emit('draw', {
      boardId: this.boardId,
      stroke: newItem,
    });

    this.currentPoints = [];
  }

  onMouseLeave(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.clearPreview();
    }
  }

  // Touch support
  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    this.onMouseDown(
      new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }),
    );
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    this.onMouseMove(
      new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }),
    );
  }

  onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    this.onMouseUp(new MouseEvent('mouseup', { clientX: touch.clientX, clientY: touch.clientY }));
  }

  // ─── TEXT TOOL ───
  submitText(): void {
    if (!this.textInputValue.trim()) {
      this.showTextInput = false;
      return;
    }

    const newItem: DrawItem = {
      id: Date.now().toString(),
      tool: 'text',
      points: [],
      startX: this.textInputX,
      startY: this.textInputY,
      endX: 0,
      endY: 0,
      color: this.currentColor,
      width: this.currentWidth,
      filled: false,
      text: this.textInputValue,
      fontSize: this.currentFontSize,
    };

    this.drawItems.push(newItem);
    this.drawItem(this.mainCtx, newItem);
    this.undoStack = [];

    this.socketService.emit('draw', {
      boardId: this.boardId,
      stroke: newItem,
    });

    this.showTextInput = false;
    this.textInputValue = '';
  }

  onTextKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.submitText();
    } else if (event.key === 'Escape') {
      this.showTextInput = false;
    }
  }

  // ─── DRAWING METHODS ───
  drawItem(ctx: CanvasRenderingContext2D, item: DrawItem): void {
    ctx.save();
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (item.tool) {
      case 'pen':
      case 'eraser':
        this.drawPen(ctx, item);
        break;
      case 'rect':
        this.drawRect(ctx, item);
        break;
      case 'circle':
        this.drawCircle(ctx, item);
        break;
      case 'line':
        this.drawLine(ctx, item);
        break;
      case 'arrow':
        this.drawArrow(ctx, item);
        break;
      case 'text':
        this.drawText(ctx, item);
        break;
    }

    ctx.restore();
  }

  private drawPen(ctx: CanvasRenderingContext2D, item: DrawItem): void {
    if (item.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(item.points[0].x, item.points[0].y);
    for (let i = 1; i < item.points.length; i++) {
      ctx.lineTo(item.points[i].x, item.points[i].y);
    }
    ctx.stroke();
  }

  private drawRect(ctx: CanvasRenderingContext2D, item: DrawItem): void {
    const x = Math.min(item.startX, item.endX);
    const y = Math.min(item.startY, item.endY);
    const w = Math.abs(item.endX - item.startX);
    const h = Math.abs(item.endY - item.startY);

    if (item.filled) {
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.strokeRect(x, y, w, h);
  }

  private drawCircle(ctx: CanvasRenderingContext2D, item: DrawItem): void {
    const cx = (item.startX + item.endX) / 2;
    const cy = (item.startY + item.endY) / 2;
    const rx = Math.abs(item.endX - item.startX) / 2;
    const ry = Math.abs(item.endY - item.startY) / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

    if (item.filled) {
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.stroke();
  }

  private drawLine(ctx: CanvasRenderingContext2D, item: DrawItem): void {
    ctx.beginPath();
    ctx.moveTo(item.startX, item.startY);
    ctx.lineTo(item.endX, item.endY);
    ctx.stroke();
  }

  private drawArrow(ctx: CanvasRenderingContext2D, item: DrawItem): void {
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(item.startX, item.startY);
    ctx.lineTo(item.endX, item.endY);
    ctx.stroke();

    // Draw the arrowhead
    const angle = Math.atan2(item.endY - item.startY, item.endX - item.startX);
    const headLen = 15;

    ctx.beginPath();
    ctx.moveTo(item.endX, item.endY);
    ctx.lineTo(
      item.endX - headLen * Math.cos(angle - Math.PI / 6),
      item.endY - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(item.endX, item.endY);
    ctx.lineTo(
      item.endX - headLen * Math.cos(angle + Math.PI / 6),
      item.endY - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  }

  private drawText(ctx: CanvasRenderingContext2D, item: DrawItem): void {
    ctx.font = `${item.fontSize}px Inter, sans-serif`;
    ctx.fillText(item.text, item.startX, item.startY);
  }

  // ─── CANVAS OPERATIONS ───
  private clearPreview(): void {
    const canvas = this.previewCanvasRef.nativeElement;
    this.previewCtx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private clearCanvas(): void {
    const canvas = this.mainCanvasRef.nativeElement;
    this.mainCtx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawItems = [];
  }

  private redrawCanvas(): void {
    const canvas = this.mainCanvasRef.nativeElement;
    this.mainCtx.clearRect(0, 0, canvas.width, canvas.height);
    for (const item of this.drawItems) {
      this.drawItem(this.mainCtx, item);
    }
  }

  // ─── UNDO / REDO ───
  undo(): void {
    if (this.drawItems.length === 0) return;
    const item = this.drawItems.pop()!;
    this.undoStack.push(item);
    this.redrawCanvas();
    this.socketService.emit('undo', { boardId: this.boardId, actionId: item.id });
  }

  redo(): void {
    if (this.undoStack.length === 0) return;
    const item = this.undoStack.pop()!;
    this.drawItems.push(item);
    this.drawItem(this.mainCtx, item);
    this.socketService.emit('draw', { boardId: this.boardId, stroke: item });
  }

  // ─── TOOLBAR ACTIONS ───
  setColor(color: string): void {
    this.currentColor = color;
    if (this.currentTool === 'eraser') {
      this.currentTool = 'pen';
    }
  }

  setWidth(width: number): void {
    this.currentWidth = width;
  }

  setTool(tool: string): void {
    this.currentTool = tool;
    this.showTextInput = false;
  }

  toggleFill(): void {
    this.isFilled = !this.isFilled;
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

  private getPoint(event: MouseEvent): { x: number; y: number } {
    const canvas = this.mainCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
  exportAsPng(): void {
    const canvas = this.mainCanvasRef.nativeElement;

    // Create a temporary canvas with white/dark background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Fill background (otherwise PNG has transparent background)
    tempCtx.fillStyle = '#0f0f1a';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw existing content on top
    tempCtx.drawImage(canvas, 0, 0);

    // Trigger download
    const link = document.createElement('a');
    link.download = `${this.board?.name || 'board'}-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }
  shareBoard(): void {
    if (!this.board) return;

    const shareUrl = `${window.location.origin}/join/${this.board.inviteCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.showCopiedToast = true;
      setTimeout(() => {
        this.showCopiedToast = false;
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
    });
  }
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(Math.max(this.scale + delta, 0.2), 5);

    // Zoom towards mouse position
    const point = this.getPoint(event as any);
    this.offsetX -= point.x * (newScale - this.scale);
    this.offsetY -= point.y * (newScale - this.scale);
    this.scale = newScale;

    this.applyTransform();
    this.cdr.detectChanges();
  }

  zoomIn(): void {
    this.scale = Math.min(this.scale + 0.2, 5);
    this.applyTransform();
    this.cdr.detectChanges();
  }

  zoomOut(): void {
    this.scale = Math.max(this.scale - 0.2, 0.2);
    this.applyTransform();
    this.cdr.detectChanges();
  }

  resetZoom(): void {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.applyTransform();
    this.cdr.detectChanges();
  }

  private applyTransform(): void {
    const container = document.querySelector('.canvas-container') as HTMLElement;
    if (container) {
      container.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
      container.style.transformOrigin = '0 0';
    }
  }
  // ─── STICKY NOTES ───
  addSticky(x: number, y: number): void {
    const colorIndex = this.stickies.length % this.stickyColors.length;
    const newSticky: StickyNote = {
      id: Date.now().toString(),
      text: '',
      x: x - 100,
      y: y - 75,
      width: 200,
      height: 150,
      color: this.stickyColors[colorIndex],
      fontSize: 14,
    };

    this.stickies.push(newSticky);
    this.editingSticky = newSticky;

    this.socketService.emit('add-sticky', {
      boardId: this.boardId,
      sticky: newSticky,
    });

    this.cdr.detectChanges();
  }

  onStickyMouseDown(event: MouseEvent, sticky: StickyNote): void {
    event.stopPropagation();
    if (this.editingSticky?.id === sticky.id) return;

    this.draggingSticky = sticky;
    this.dragOffsetX = event.clientX - sticky.x;
    this.dragOffsetY = event.clientY - sticky.y;
  }

  onStickyDrag(event: MouseEvent): void {
    if (!this.draggingSticky) return;

    this.draggingSticky.x = event.clientX - this.dragOffsetX;
    this.draggingSticky.y = event.clientY - this.dragOffsetY;
    this.cdr.detectChanges();
  }

  onStickyDragEnd(): void {
    if (!this.draggingSticky) return;

    this.socketService.emit('update-sticky', {
      boardId: this.boardId,
      sticky: this.draggingSticky,
    });

    this.draggingSticky = null;
  }

  startEditSticky(event: MouseEvent, sticky: StickyNote): void {
    event.stopPropagation();
    this.editingSticky = sticky;
    this.cdr.detectChanges();
  }

  onStickyTextChange(sticky: StickyNote): void {
    this.socketService.emit('update-sticky', {
      boardId: this.boardId,
      sticky: sticky,
    });
  }

  finishEditSticky(): void {
    this.editingSticky = null;
  }

  deleteSticky(event: MouseEvent, sticky: StickyNote): void {
    event.stopPropagation();
    this.stickies = this.stickies.filter((s) => s.id !== sticky.id);

    this.socketService.emit('delete-sticky', {
      boardId: this.boardId,
      stickyId: sticky.id,
    });

    this.cdr.detectChanges();
  }
  changeStickyColor(event: MouseEvent, sticky: StickyNote, color: string): void {
    event.stopPropagation();
    sticky.color = color;

    this.socketService.emit('update-sticky', {
      boardId: this.boardId,
      sticky: sticky,
    });

    this.cdr.detectChanges();
  }
}
