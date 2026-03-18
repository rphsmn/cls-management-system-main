import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-employee-status',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.html',
  styleUrls: ['./employees.css']
})
export class EmployeeStatusComponent implements OnInit {
  private authService = inject(AuthService);

  searchQuery: string = '';
  selectedDept: string = 'All Departments';
  
  departments = ['All Departments', 'Operations', 'Accounts', 'Administration', 'HR', 'IT', 'Management'];

  // Mock data based on your UI screenshots
  employees = [
    { id: 1, name: 'Reymart L. Prado', dept: 'Operations', initials: 'RL', status: 'In Office' },
    { id: 2, name: 'Domingo N. Reantaso Jr.', dept: 'Operations', initials: 'DN', status: 'Away', leaveType: 'Sick Leave', leaveDate: '2026-03-18' },
    { id: 3, name: 'Olympia B. Oreste', dept: 'Accounts', initials: 'OB', status: 'In Office' },
    { id: 4, name: 'Riza Jane A. Amoncio', dept: 'Administration', initials: 'RJ', status: 'Upcoming Leave', leaveType: 'Birthday Leave', leaveDate: '2026-03-19 to 2026-03-20' },
    { id: 5, name: 'Rosalie Neptuno', dept: 'HR', initials: 'RN', status: 'Upcoming Leave', leaveType: 'Paid Leave', leaveDate: '2026-03-20 - 2026-03-21' },
    { id: 6, name: 'Accounts Employee', dept: 'Accounts', initials: 'AE', status: 'In Office' },
    { id: 7, name: 'Developer', dept: 'IT', initials: 'D', status: 'In Office' },
    { id: 8, name: 'Roy Belen', dept: 'Management', initials: 'RB', status: 'In Office' }
  ];

  workingToday = 0;
  awayToday = 0;

  ngOnInit() {
    this.calculateStats();
  }

  calculateStats() {
    this.workingToday = this.employees.filter(e => e.status === 'In Office').length;
    this.awayToday = this.employees.filter(e => e.status === 'Away').length;
  }

  get filteredEmployees() {
    return this.employees.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                            e.dept.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesDept = this.selectedDept === 'All Departments' || e.dept === this.selectedDept;
      return matchesSearch && matchesDept;
    });
  }
}