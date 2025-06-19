import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Video, User } from '../../models/models';
import { environment } from '../../environments/environments';

// System log entry representation
export interface SystemLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
  showDetails?: boolean;
}

// Response format for paginated logs
export interface LogsResponse {
  logs: SystemLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Filter options for log queries
export interface LogFilter {
  startDate?: string;
  endDate?: string;
  action?: string;
  entityType?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  // Use environment variables for API URL
  private baseUrl = `${environment.apiUrl}/admin`;

  constructor() {
    console.log('Admin Service initialized with baseUrl:', this.baseUrl);
  }

  // Video Management API
  getAllVideos(): Observable<Video[]> {
    return this.http.get<Video[]>(`${this.baseUrl}/media`);
  }

  deleteVideo(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/media/${id}`);
  }

  // User Management API
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${id}`);
  }

  updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/${id}/status`, { status });
  }

  resetUserPassword(id: string): Observable<{ message: string; tempPassword: string }> {
    return this.http.post<{ message: string; tempPassword: string }>(`${this.baseUrl}/users/${id}/reset-password`, {});
  }

  // System Logs API
  getSystemLogs(filters?: LogFilter): Observable<LogsResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.action) params = params.set('action', filters.action);
      if (filters.entityType) params = params.set('entityType', filters.entityType);
      if (filters.userId) params = params.set('userId', filters.userId.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.offset) params = params.set('offset', filters.offset.toString());
    }

    return this.http.get<LogsResponse>(`${this.baseUrl}/logs`, { params });
  }

  // Comment Management API
  deleteComment(commentId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/player/videos/comment/${commentId}`);
  }

  // Tryout Location Management API
  getTryoutLocations(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/locations`);
  }

  addTryoutLocation(location: string): Observable<{ message: string; location: string }> {
    return this.http.post<{ message: string; location: string }>(`${this.baseUrl}/locations`, { location });
  }

  deleteTryoutLocation(location: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/locations/${encodeURIComponent(location)}`);
  }
}
