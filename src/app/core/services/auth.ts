import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly REQ_KEY = 'cls_leave_requests';
  private readonly USER_KEY = 'cls_user_session';

  private users: User[] = [
    { id: 'MGR-001', name: 'Sarah Johnson', password: 'password123', role: 'Manager', credits: { paidLeave: 20, birthdayLeave: 1, sickLeave: 15 } },
    { id: 'HR-001', name: 'Jennifer Lee', password: 'password123', role: 'HR', credits: { paidLeave: 18, birthdayLeave: 1, sickLeave: 12 } },
    { id: 'ADM-001', name: 'Admin Boss', password: 'password123', role: 'Admin Manager', credits: { paidLeave: 20, birthdayLeave: 1, sickLeave: 15 } },
    { id: 'OPS-SUP', name: 'Ops Supervisor', password: 'password123', role: 'Ops Sup', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'OPS-STF', name: 'Ralph', password: 'password123', role: 'Ops Staff', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } }
  ];

  private currentUserSubject = new BehaviorSubject<User | null>(this.getInitialUser());
  currentUser$ = this.currentUserSubject.asObservable();

  private requestsSubject = new BehaviorSubject<any[]>(this.getSavedRequests());
  requests$ = this.requestsSubject.asObservable();

  constructor() {}

  private getInitialUser(): User | null {
    const saved = localStorage.getItem(this.USER_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  private getSavedRequests(): any[] {
    const saved = localStorage.getItem(this.REQ_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  login(id: string, pass: string): boolean {
    const user = this.users.find(u => u.id === id && u.password === pass);
    if (user) {
      this.currentUserSubject.next({ ...user });
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  }

  logout() {
    this.currentUserSubject.next(null);
    localStorage.removeItem(this.USER_KEY);
  }

  private syncRequests() {
    localStorage.setItem(this.REQ_KEY, JSON.stringify(this.requestsSubject.value));
  }

  addRequest(request: any) {
    const user = this.currentUserSubject.value;
    if (!user) return;

    const requestWithUser = { 
      ...request, 
      requesterName: user.name, 
      requesterRole: user.role,
      status: 'Pending',
      stage: 'Initial',
      targetReviewer: this.getInitialReviewer(user.role) 
    };
    
    const updated = [requestWithUser, ...this.requestsSubject.value];
    this.requestsSubject.next(updated);
    this.syncRequests();
  }

  private getInitialReviewer(role: string): string {
    switch (role) {
      case 'Ops Staff': return 'Ops Sup';
      case 'Ops Sup':
      case 'IT Dev': return 'Manager';
      case 'HR': return 'Admin Manager';
      default: return 'Manager';
    }
  }

  updateRequestStatus(requestToUpdate: any, newStatus: string) {
    const currentRequests = this.requestsSubject.value.map(req => {
      const isMatch = req.dateFiled === requestToUpdate.dateFiled && 
                      req.requesterName === requestToUpdate.requesterName;

      if (isMatch) {
        if (newStatus === 'Rejected') return { ...req, status: 'Rejected', targetReviewer: 'None' };
        if (newStatus === 'Approved') {
          if (req.stage === 'Initial') {
            return { ...req, stage: 'Final', status: 'Awaiting HR Approval', targetReviewer: 'HR' };
          } else {
            return { ...req, status: 'Approved', targetReviewer: 'None' };
          }
        }
      }
      return req;
    });
    this.requestsSubject.next(currentRequests);
    this.syncRequests();
  }
}