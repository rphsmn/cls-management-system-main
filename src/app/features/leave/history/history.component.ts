import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent {
  // FIXED: Defines the property the HTML is looking for
  public requests$: Observable<any[]>;

  constructor(private authService: AuthService) {
    this.requests$ = this.authService.requests$;
  }
}