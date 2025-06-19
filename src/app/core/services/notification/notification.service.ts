import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environments';
import { Notification, NotificationResponse } from '../../models/models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Use direct Railway URL in production, local API in development
  private apiUrl = environment.production ?
    'https://pharaoh-s-backend.railway.app/api/notifications' :
    `${environment.apiUrl}/notifications`;

  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    if (localStorage.getItem('auth_token')) {
      this.startPollingUnreadCount();
    }
    console.log('Notification Service initialized with apiUrl:', this.apiUrl);
  }

  // Fetch paginated notifications and update unread count
  getNotifications(page: number = 1, limit: number = 10): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(`${this.apiUrl}?page=${page}&limit=${limit}`).pipe(
      tap(response => {
        this.unreadCountSubject.next(response.unreadCount);
      })
    );
  }

  // Fetch unread notification count and update state
  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(response => {
        this.unreadCountSubject.next(response.unreadCount);
      })
    );
  }

  // Mark individual notification as read and update counter
  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const currentCount = this.unreadCountSubject.value;
        if (currentCount > 0) {
          this.unreadCountSubject.next(currentCount - 1);
        }
      })
    );
  }

  // Mark all notifications as read and reset counter
  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.unreadCountSubject.next(0);
      })
    );
  }

  // Remove notification
  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Begin periodic checking for new notifications
  startPollingUnreadCount(intervalMs: number = 60000): void {
    interval(intervalMs)
      .pipe(
        switchMap(() => this.getUnreadCount())
      )
      .subscribe();
  }

  // Set up service after authentication
  initialize(): void {
    this.getUnreadCount().subscribe();
  }
}
