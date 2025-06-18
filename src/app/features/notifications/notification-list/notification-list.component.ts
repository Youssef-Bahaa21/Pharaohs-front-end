import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, } from '../../../core/services/notification/notification.service';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { Notification } from '../../../core/models/models';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    FeatureHeaderComponent
  ],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss']
})
export class NotificationListComponent implements OnInit {
  notifications: Notification[] = [];
  loading = true;
  totalNotifications = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25];
  Math = Math;

  constructor(
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
  }

  // Fetches paginated notifications from the service
  loadNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications(this.pageIndex + 1, this.pageSize)
      .subscribe({
        next: (response) => {
          this.notifications = response.notifications;
          this.totalNotifications = response.pagination.total;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notifications', error);
          this.loading = false;
          this.snackBar.open('Failed to load notifications', 'Close', {
            duration: 3000
          });
        }
      });
  }

  // Handles paginator events and reloads notifications
  handlePageEvent(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadNotifications();
  }

  // Updates notification read status
  markAsRead(notification: Notification): void {
    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.is_read = true;
        },
        error: (error) => {
          console.error('Error marking notification as read', error);
          this.snackBar.open('Failed to mark notification as read', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  // Marks all notifications as read
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(notification => {
          notification.is_read = true;
        });
        this.snackBar.open('All notifications marked as read', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error marking all notifications as read', error);
        this.snackBar.open('Failed to mark all notifications as read', 'Close', {
          duration: 3000
        });
      }
    });
  }

  // Removes a notification from the list
  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();

    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
        this.totalNotifications--;
        this.snackBar.open('Notification deleted', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error deleting notification', error);
        this.snackBar.open('Failed to delete notification', 'Close', {
          duration: 3000
        });
      }
    });
  }

  // Formats timestamp to relative time (e.g., "5 minutes ago")
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }

    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
}
