import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  employeeId = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    // Clear any old error messages
    this.errorMessage = '';

    if (!this.employeeId || !this.password) {
      this.errorMessage = 'Please enter both ID and Password.';
      return;
    }

    const success = this.authService.login(this.employeeId, this.password);

    if (success) {
      // Small delay can sometimes help with session synchronization
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = 'Invalid ID or Password.';
    }
  }
}