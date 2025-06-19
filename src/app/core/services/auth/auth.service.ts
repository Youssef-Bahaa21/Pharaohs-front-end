import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../../models/models';
import { NotificationService } from '../notification/notification.service';
import { environment } from '../../environments/environments';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Use environment apiUrl for consistency
  private baseUrl = `${environment.apiUrl}/auth`;

  // Observable stream of the current authenticated user
  private currentUserSubject = new BehaviorSubject<User | null>(this.getCurrentUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.currentUserSubject.next(this.getCurrentUser());
    console.log('Auth Service initialized with baseUrl:', this.baseUrl);
  }

  // Authenticate user and store credentials
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
        this.notificationService.initialize();
      })
    );
  }

  // Register new user and authenticate
  register(data: RegisterRequest): Observable<AuthResponse> {
    console.log('Registering user, API endpoint:', `${this.baseUrl}/register`);
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, data).pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
        this.notificationService.initialize();
      })
    );
  }

  // Clear auth data and redirect to login
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Check if user is authenticated
  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // Retrieve current user from local storage
  getCurrentUser(): User | null {
    const user = localStorage.getItem('current_user');
    return user ? JSON.parse(user) as User : null;
  }

  // Update user profile data in local storage and observable
  updateCurrentUserData(updatedDetails: Partial<User>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedDetails };
      localStorage.setItem('current_user', JSON.stringify(newUser));
      this.currentUserSubject.next(newUser);
    }
  }

  // Getter for current user value
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }
}