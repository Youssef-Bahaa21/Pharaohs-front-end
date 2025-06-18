import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService } from '../../core/services/notification/notification.service';
import { Subscription } from 'rxjs';
import { Notification } from '../../core/models/models';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatBadgeModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  recentNotifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) { }

  ngOnInit(): void {
    // Subscribe to unread count changes
    this.subscription.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );

    // Load recent notifications
    this.loadRecentNotifications();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadRecentNotifications(): void {
    this.subscription.add(
      this.notificationService.getNotifications(1, 5).subscribe(response => {
        this.recentNotifications = response.notifications;
      })
    );
  }

  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();

    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.is_read = true;
      });
    }
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();

    this.notificationService.markAllAsRead().subscribe(() => {
      this.recentNotifications.forEach(notification => {
        notification.is_read = true;
      });
    });
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days}d`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo`;
    }

    const years = Math.floor(months / 12);
    return `${years}y`;
  }
}
