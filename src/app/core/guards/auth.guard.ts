import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth';
import { Observable, map, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    // 1. Check localStorage immediately (Synchronous)
    const savedUser = localStorage.getItem('cls_user_session');
    
    if (savedUser) {
      // If data exists in storage, allow the route.
      return true;
    }

    // 2. If nothing is in storage, they are definitely not logged in.
    return this.router.createUrlTree(['/login']);
  }
}