import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin/admin.service';
import { Video } from '../../../core/models/models';
import { VideoPlayerComponent } from '../../../shared/components/video-player/video-player.component';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';

@Component({
  standalone: true,
  selector: 'app-admin-media',
  imports: [CommonModule, FormsModule, VideoPlayerComponent, MatDialogModule, FeatureHeaderComponent],
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.css']
})
export class MediaComponent implements OnInit {
  adminService = inject(AdminService);
  toastService = inject(SimpleToastService);
  dialog = inject(MatDialog);
  videos: Video[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.loadVideos();
  }

  // Fetch all videos from the API and process them for display
  loadVideos(): void {
    this.isLoading = true;
    this.adminService.getAllVideos().subscribe({
      next: (data: Video[]) => {
        this.videos = data.map((video: any) => ({
          ...video,
          url: video.url?.startsWith('http') ? video.url : `http://localhost:3000${video.url}`,
          type: video.type || (video.url?.match(/\.(mp4|webm)$/i) ? 'video' : 'image'),
          createdAt: video.createdAt || video.created_at || '',
        }));
        this.isLoading = false;
      },
      error: () => {
        this.toastService.error('Failed to load media');
        this.isLoading = false;
      }
    });
  }

  // Delete a video after confirming the action with the user
  deleteVideo(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Media',
        message: 'Are you sure you want to delete this media? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.adminService.deleteVideo(id).subscribe({
          next: () => {
            this.videos = this.videos.filter(v => v.id !== id);
            this.isLoading = false;
            this.toastService.success('Media deleted successfully');
          },
          error: () => {
            this.toastService.error('Could not delete media');
            this.isLoading = false;
          }
        });
      }
    });
  }

  // Format timestamp to a readable date string
  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }

  // Handle media loading errors
  onVideoError(event: any, videoUrl: string): void {
    this.toastService.error('Failed to load media');
  }
}
