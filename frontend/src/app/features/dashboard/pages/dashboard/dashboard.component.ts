import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { BoardService } from '../../../../core/services/board.service';
import { Board } from '../../../../core/models/board.model';
import { User } from '../../../../core/models/user.model';
import { Theme, ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  boards: Board[] = [];
  currentUser: User | null = null;
  loading = true;

  // Create board form
  showCreateModal = false;
  newBoardName = '';
  newBoardDescription = '';
  creating = false;

  // Join board form
  showJoinModal = false;
  inviteCode = '';
  joining = false;

  error = '';

  constructor(
    private authService: AuthService,
    private boardService: BoardService,
    private router: Router,
      private cdr: ChangeDetectorRef,
        public themeService: ThemeService,

  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadBoards();
  }

loadBoards(): void {
  this.loading = true;
  this.boardService.getAll().subscribe({
    next: (boards) => {
      console.log('Boards received:', boards);
      this.boards = boards;
      this.loading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Load boards error:', err);
      this.error = 'Failed to load boards';
      this.loading = false;
      this.cdr.detectChanges();
    },
  });
}

createBoard(): void {
  if (!this.newBoardName.trim()) return;
  this.creating = true;

  this.boardService
    .create(this.newBoardName, this.newBoardDescription)
    .subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newBoardName = '';
        this.newBoardDescription = '';
        this.creating = false;
        // Reload all boards to get properly populated data
        this.loadBoards();
      },
      error: () => {
        this.error = 'Failed to create board';
        this.creating = false;
      },
    });
}
  joinBoard(): void {
    if (!this.inviteCode.trim()) return;
    this.joining = true;

    this.boardService.joinByInviteCode(this.inviteCode).subscribe({
      next: (board) => {
        this.boards.unshift(board);
        this.showJoinModal = false;
        this.inviteCode = '';
        this.joining = false;
      },
      error: () => {
        this.error = 'Invalid invite code';
        this.joining = false;
      },
    });
  }

  openBoard(boardId: string): void {
    this.router.navigate(['/board', boardId]);
  }

  deleteBoard(boardId: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this board?')) return;

    this.boardService.delete(boardId).subscribe({
      next: () => {
        this.boards = this.boards.filter((b) => b._id !== boardId);
      },
      error: () => {
        this.error = 'Failed to delete board';
      },
    });
  }

  copyInviteCode(code: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(code);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

 getTimeAgo(date: string): string {
  if (!date) return '';
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000,
  );
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
cycleTheme(): void {
  const current = this.themeService.getTheme();
  const next: Theme = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
  this.themeService.setTheme(next);
}

getThemeIcon(): string {
  const theme = this.themeService.getTheme();
  if (theme === 'dark') return '🌙';
  if (theme === 'light') return '☀️';
  return '💻';
}

getThemeLabel(): string {
  const theme = this.themeService.getTheme();
  if (theme === 'dark') return 'Dark';
  if (theme === 'light') return 'Light';
  return 'System';
}
}