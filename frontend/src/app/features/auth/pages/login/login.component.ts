import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  emailError = '';
  passwordError = '';

  validateEmail(): boolean {
    if (!this.email) {
      this.emailError = 'Email is required';
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.emailError = 'Please enter a valid email address';
      return false;
    }
    this.emailError = '';
    return true;
  }

  validatePassword(): boolean {
    if (!this.password) {
      this.passwordError = 'Password is required';
      return false;
    }
    if (this.password.length < 6) {
      this.passwordError = 'Password must be at least 6 characters';
      return false;
    }
    this.passwordError = '';
    return true;
  }

  onSubmit(): void {
    const emailValid = this.validateEmail();
    const passwordValid = this.validatePassword();
    if (!emailValid || !passwordValid) return;

    this.loading = true;
    this.error = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Invalid email or password';
        this.loading = false;
      },
    });
  }
}
