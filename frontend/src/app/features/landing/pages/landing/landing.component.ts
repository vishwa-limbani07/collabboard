import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  features = [
    {
      icon: '✏️',
      title: 'Freehand drawing',
      desc: 'Sketch ideas naturally with pen, shapes, and text tools',
    },
    {
      icon: '👥',
      title: 'Real-time collaboration',
      desc: 'See cursors move and drawings appear instantly across users',
    },
    {
      icon: '🔗',
      title: 'Share with a link',
      desc: 'Invite anyone to your board with a simple invite code',
    },
    {
      icon: '📥',
      title: 'Export as PNG',
      desc: 'Download your board as a high-quality image anytime',
    },
    {
      icon: '💾',
      title: 'Auto-save',
      desc: 'Your work is saved automatically — pick up where you left off',
    },
    {
      icon: '🌙',
      title: 'Dark and light themes',
      desc: 'Switch between dark, light, or match your system preference',
    },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }
}