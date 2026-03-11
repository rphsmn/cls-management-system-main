import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: string;
  name: string;
  role: string;
  credits: { paidLeave: number; birthdayLeave: number; sickLeave: number; };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly REQ_KEY = 'cls_leave_requests';
  private readonly USER_KEY = 'cls_user_session';

  private users: User[] = [
    { id: 'HR-001', name: 'Rosalie G. Neptuno', role: 'HR', credits: { paidLeave: 18, birthdayLeave: 1, sickLeave: 12 } },
    { id: 'OPS-SUP', name: 'Ops Supervisor', role: 'Ops Sup', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'OPS-STF', name: 'Ralph', role: 'Ops Staff', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } }
  ];

  private currentUserSubject = new BehaviorSubject<User | null>(this.getInitialUser());
  currentUser$ = this.currentUserSubject.asObservable();

  private requestsSubject = new BehaviorSubject<any[]>(this.getSavedRequests());
  requests$ = this.requestsSubject.asObservable();

  private getInitialUser(): User | null {
    const saved = localStorage.getItem(this.USER_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  private getSavedRequests(): any[] {
    const saved = localStorage.getItem(this.REQ_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  // FIXED: Missing login method
  login(id: string, pass: string): boolean {
    const user = this.users.find(u => u.id === id);
    if (user) {
      this.currentUserSubject.next(user);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  }

  logout() {
    this.currentUserSubject.next(null);
    localStorage.removeItem(this.USER_KEY);
  }

  // FIXED: Missing addRequest method
  addRequest(request: any) {
    const user = this.currentUserSubject.value;
    if (!user) return;
    const newReq = { 
      ...request, 
      requesterName: user.name, 
      status: 'Pending', 
      targetReviewer: user.role === 'Ops Staff' ? 'Ops Sup' : 'HR' 
    };
    const updated = [newReq, ...this.requestsSubject.value];
    this.requestsSubject.next(updated);
    localStorage.setItem(this.REQ_KEY, JSON.stringify(updated));
  }

  updateRequestStatus(requestToUpdate: any, status: string) {
    const updated = this.requestsSubject.value.map(req => {
      if (req.dateFiled === requestToUpdate.dateFiled && req.requesterName === requestToUpdate.requesterName) {
        return { ...req, status, targetReviewer: status === 'Approved' && req.targetReviewer !== 'HR' ? 'HR' : req.targetReviewer };
      }
      return req;
    });
    this.requestsSubject.next(updated);
    localStorage.setItem(this.REQ_KEY, JSON.stringify(updated));
  }
}