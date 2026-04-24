import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BoardService } from '../../../../core/services/board.service';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="join-container">
      <div class="join-card">
        <h2 *ngIf="!error">Joining board...</h2>
        <div *ngIf="error" class="error">
          <h2>Failed to join</h2>
          <p>{{ error }}</p>
          <button (click)="goToDashboard()">Go to Dashboard</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .join-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f0f1a;
    }
    .join-card {
      background: #1a1a2e;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      color: #fff;
    }
    .error p { color: #888; margin: 12px 0; }
    button {
      padding: 10px 20px;
      background: #7c5cfc;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }
  `],
})
export class JoinComponent implements OnInit {
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private boardService: BoardService,
  ) {}

  ngOnInit(): void {
    const inviteCode = this.route.snapshot.paramMap.get('inviteCode') || '';

    this.boardService.joinByInviteCode(inviteCode).subscribe({
      next: (board) => {
        // Successfully joined — redirect to the board
        this.router.navigate(['/board', board._id]);
      },
      error: () => {
        this.error = 'Invalid invite code or board not found.';
      },
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}