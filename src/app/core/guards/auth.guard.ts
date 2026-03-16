import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    // Check if user session exists in localStorage
    const savedUser = localStorage.getItem('cls_user_session');
    
    if (savedUser) {
      // Session exists, allow access to protected routes
      return true;
    }

    // No session, redirect to login
    return this.router.createUrlTree(['/login']);
  }
}