import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PlayerProfile, Video, PlayerStats } from '../../../core/models/models';
import { PlayerService } from '../../../core/services/player/player.service';
import { RouterLink } from '@angular/router';
import { VideoPlayerComponent } from '../../../shared/components/video-player/video-player.component';
import { LazyLoadImageDirective } from '../../../shared/directives/lazy-load-image.directive';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import Chart from 'chart.js/auto';
import { RatingUtil } from '../../../core/utils/rating.util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    VideoPlayerComponent,
    LazyLoadImageDirective,
    FeatureHeaderComponent,
    MatDialogModule
  ],
  templateUrl: './profile.component.html',
  styles: []
})
export class ProfileComponent implements OnInit, AfterViewInit {
  playerService = inject(PlayerService);
  sanitizer = inject(DomSanitizer);
  cdr = inject(ChangeDetectorRef);
  toastService = inject(SimpleToastService);
  dialog = inject(MatDialog);
  profile: PlayerProfile | null = null;
  selectedProfileImage: File | null = null;
  isLoading = false;
  isUpdating = false;
  isLoadingChart = false;
  isDeleting: { [key: string]: boolean } = {};
  today: string = new Date().toISOString().split('T')[0];
  showPerformanceForm = false;
  performanceStats: PlayerStats = {
    matches_played: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0
  };
  isUpdatingStats = false;

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('statsChart') chartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | undefined;

  activeTab: string = 'details';
  tabs = [
    { id: 'details', name: 'Profile Details' },
    { id: 'media', name: 'Media Gallery' },
    { id: 'invitations', name: 'Invitations' },
    { id: 'statistics', name: 'Statistics' }
  ];

  showCanvas: boolean = false;
  chartData: { labels: string[]; datasets: any[] } = { labels: [], datasets: [] };
  chartType: string = 'pie';
  analyticsMetric: string = 'performance';
  playerStats: any = null;
  mediaByTypeData: any = { video: 0, image: 0 };
  timelineData: any[] = [];

  pendingInvitationsCount: number = 0;
  defaultProfileImage = '/profile2.png';

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onMediaError(event: Event, url: string): void {
    const element = event.target as HTMLImageElement | HTMLVideoElement;
    if (element) {
      const container = element.closest('.aspect-video') || element.parentElement;
      if (container) {
        const existingError = container.querySelector('.media-error-message');
        if (!existingError) {
          const errorMessage = document.createElement('div');
          errorMessage.className = 'media-error-message absolute inset-0 flex items-center justify-center bg-black/70 text-white text-center p-2';
          errorMessage.innerHTML = `
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Media failed to load</p>
            </div>
          `;
          (container as HTMLElement).style.position = 'relative';
          container.appendChild(errorMessage);
        }
      }
    }
  }

  calculateAge(dateOfBirth: string | undefined): number | undefined {
    if (!dateOfBirth) return undefined;

    const dob = new Date(dateOfBirth);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age;
  }

  triggerFileInput(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  getPendingInvitationsCount(): number {
    if (this.pendingInvitationsCount > 0) {
      return this.pendingInvitationsCount;
    }

    if (!this.profile || !this.profile.invitations) return 0;

    this.pendingInvitationsCount = this.profile.invitations.filter(inv => inv.status === 'pending').length;
    return this.pendingInvitationsCount;
  }

  updateInvitationStatus(invitationId: number, status: 'accepted' | 'declined'): void {
    this.playerService.updateInvitationStatus(invitationId, status).subscribe({
      next: (response) => {
        if (this.profile?.invitations) {
          const invIndex = this.profile.invitations.findIndex(inv => inv.invitation_id === invitationId);
          if (invIndex !== -1) {
            this.profile.invitations[invIndex].status = status;
            this.pendingInvitationsCount = this.profile.invitations.filter(inv => inv.status === 'pending').length;
            this.cdr.detectChanges();
          }
        }
      },
      error: (err) => {
        this.toastService.error(err.message || 'Failed to update invitation');
      }
    });
  }

  onProfileImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedProfileImage = input.files[0];
      this.updateProfileImage();
    }
  }

  updateProfileImage(): void {
    if (!this.selectedProfileImage) return;

    this.isUpdating = true;
    const formData = new FormData();
    formData.append('profileImage', this.selectedProfileImage);

    // Add a flag to indicate this is only a profile image update
    formData.append('updateType', 'profileImageOnly');

    this.playerService.updateProfile(formData).subscribe({
      next: (response) => {
        console.log('Profile image updated successfully:', response);
        this.selectedProfileImage = null;

        // Only reload the profile image, not the entire profile
        if (this.profile && response.profileImage) {
          this.profile.profileImage = response.profileImage.startsWith('http')
            ? response.profileImage
            : `http://localhost:3000${response.profileImage}`;
        } else {
          // If no image URL is returned, refresh the entire profile
          this.loadProfile();
        }

        this.isUpdating = false;
        this.toastService.success('Profile image updated successfully');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to update profile image:', err);
        this.toastService.error('Failed to update profile image');
        this.isUpdating = false;
      }
    });
  }

  updateProfileDetails(): void {
    if (!this.profile) return;

    this.isUpdating = true;
    const formData = new FormData();

    // Include all necessary fields from the current profile
    formData.append('name', this.profile.name);
    formData.append('position', this.profile.position || '');
    formData.append('club', this.profile.club || '');
    formData.append('date_of_birth', this.profile.date_of_birth || '');
    formData.append('bio', this.profile.bio || '');

    // Add a flag to indicate this is a details update
    formData.append('updateType', 'profileDetailsOnly');

    this.playerService.updateProfile(formData).subscribe({
      next: (response) => {
        console.log('Profile updated successfully:', response);
        this.toastService.success('Profile updated successfully');
        this.isUpdating = false;

        // No need to reload the entire profile since we're only updating what we already have
        // Just update the local profile object with the response if provided
        if (response.updatedProfile && this.profile) {
          // Preserve existing data that might not be in the response
          this.profile = {
            ...this.profile,
            ...response.updatedProfile,
            // Ensure we keep the original profileImage and videos
            profileImage: this.profile.profileImage,
            videos: this.profile.videos
          };
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to update profile:', err);
        this.toastService.error('Failed to update profile');
        this.isUpdating = false;
      }
    });
  }

  deleteVideo(videoId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Media',
        message: 'Are you sure you want to delete this media?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isDeleting[videoId] = true;

        this.playerService.deleteVideo(videoId).subscribe({
          next: () => {
            if (this.profile && this.profile.videos) {
              this.profile.videos = this.profile.videos.filter(v => v.id !== videoId);
            }
            this.isDeleting[videoId] = false;
            this.toastService.success('Media deleted successfully');
          },
          error: (err) => {
            console.error('Failed to delete media:', err);
            this.toastService.error('Failed to delete media');
            this.isDeleting[videoId] = false;
          }
        });
      }
    });
  }

  logInvitations(): void {
    console.log('Current invitations in profile:', this.profile?.invitations);
    if (this.profile?.invitations?.length) {
      console.log('Number of invitations:', this.profile.invitations.length);
      console.log('First invitation:', this.profile.invitations[0]);
    } else {
      console.log('No invitations found in profile');
    }
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadPlayerAnalytics();
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'statistics' && this.chartRef) {
      // Only generate chart if we're on the statistics tab
      this.generateChartIfNeeded();
    }
    this.cdr.detectChanges();
  }

  switchTab(tabId: string): void {
    this.activeTab = tabId;

    if (tabId === 'statistics') {
      // Reset chart state
      if (this.chart) {
        this.chart.destroy();
        this.chart = undefined;
      }

      // Only load player analytics if not already loaded
      if (!this.playerStats) {
        this.loadPlayerAnalytics();
      } else {
        this.isLoadingChart = true;

        // Generate chart with a longer timeout to ensure DOM is ready
        setTimeout(() => {
          this.generateChartIfNeeded();
          this.isLoadingChart = false;
          this.cdr.detectChanges();
        }, 500);
      }
    }
  }

  // Method to generate chart only when needed
  private generateChartIfNeeded(): void {
    if (this.activeTab === 'statistics' && this.chartRef?.nativeElement) {
      console.log('Attempting to generate chart - chartRef exists:', !!this.chartRef);
      this.generateChartData();
      this.executeChart();
    } else {
      console.log('Cannot generate chart - either not on statistics tab or chartRef missing');
      console.log('Active tab:', this.activeTab);
      console.log('Chart reference exists:', !!this.chartRef);
    }
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.playerService.getProfile().subscribe({
      next: (data) => {
        console.log('Profile data:', data);
        console.log('Profile image from API:', data.profileImage);

        this.profile = {
          ...data,
          profileImage: data.profileImage ?
            (data.profileImage.startsWith('http') ? data.profileImage : `http://localhost:3000${data.profileImage}`) :
            null,
          videos: data.videos?.map((v: Video) => ({
            ...v,
            url: v.url?.startsWith('http') ? v.url : `http://localhost:3000${v.url}`
          })) || []
        };

        console.log('Processed profile image:', this.profile.profileImage);

        this.isLoading = false;
        this.calculateMediaByType();
        this.generateTimelineData();

        // Load invitations only after profile is loaded
        this.loadInvitations();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
        this.toastService.error('Failed to load profile');
        this.isLoading = false;
      }
    });
  }

  private loadInvitations(): void {
    // Only load if profile exists
    if (!this.profile) return;

    this.playerService.getInvitations().subscribe({
      next: (invitations) => {
        console.log('Invitations loaded:', invitations);
        if (this.profile) {
          this.profile.invitations = invitations;

          // Process scout profile images
          this.profile.invitations.forEach(invitation => {
            if (invitation.scoutProfileImage) {
              invitation.scoutProfileImage = invitation.scoutProfileImage.startsWith('http')
                ? invitation.scoutProfileImage
                : `http://localhost:3000${invitation.scoutProfileImage}`;
            }
          });

          // Reset cached count when new invitations are loaded
          this.pendingInvitationsCount = invitations.filter(inv => inv.status === 'pending').length;
          console.log('Updated profile with invitations:', this.profile);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Failed to load invitations:', err);
      }
    });
  }

  reloadProfile(): void {
    this.loadProfile();
  }

  loadPlayerAnalytics(): void {
    // Skip if already loaded
    if (this.playerStats) return;

    this.isLoadingChart = true;
    this.playerService.getPlayerStats().subscribe({
      next: (stats) => {
        console.log('Player stats loaded:', stats);
        this.playerStats = stats;

        // Generate chart if we're on the statistics tab
        if (this.activeTab === 'statistics') {
          this.generateChartIfNeeded();
        }

        this.isLoadingChart = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load player analytics:', err);
        this.isLoadingChart = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateMediaByType(): void {
    this.mediaByTypeData = { video: 0, image: 0 };

    if (this.profile?.videos?.length) {
      this.profile.videos.forEach((media: any) => {
        if (media.type === 'video') this.mediaByTypeData.video++;
        else if (media.type === 'image') this.mediaByTypeData.image++;
      });
    }
  }

  generateTimelineData(): void {
    const today = new Date();
    const dates: string[] = [];
    const mediaData: number[] = [];
    const inviteData: number[] = [];

    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString());
      mediaData.push(0);
      inviteData.push(0);
    }

    if (this.profile?.videos?.length) {
      this.profile.videos.forEach((media: any) => {
        const mediaDate = new Date(media.createdAt).toLocaleDateString();
        const index = dates.indexOf(mediaDate);
        if (index !== -1) {
          mediaData[index]++;
        }
      });
    }

    if (this.profile?.invitations?.length) {
      this.profile.invitations.forEach((inv: any) => {
        const invDate = new Date(inv.date).toLocaleDateString();
        const index = dates.indexOf(invDate);
        if (index !== -1) {
          inviteData[index]++;
        }
      });
    }

    this.timelineData = dates.map((date, index) => {
      return {
        date,
        media: mediaData[index],
        invites: inviteData[index]
      };
    });
  }

  changeChartType(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.chartType = select.value;
    this.executeChart();
  }

  changeAnalyticsMetric(metric: string): void {
    this.analyticsMetric = metric;
    this.generateChartData();
    this.executeChart();
  }

  generateChartData(): void {
    switch (this.analyticsMetric) {
      case 'performance':
        if (this.playerStats?.performanceStats) {
          const stats = this.playerStats.performanceStats;
          this.chartData = {
            labels: ['Goals', 'Assists', 'Yellow Cards', 'Red Cards'],
            datasets: [{
              label: 'Performance Stats',
              data: [
                stats.goals || 0,
                stats.assists || 0,
                stats.yellow_cards || 0,
                stats.red_cards || 0
              ],
              backgroundColor: [
                'rgba(34, 197, 94, 0.6)',  // Green - Goals
                'rgba(59, 130, 246, 0.6)', // Blue - Assists
                'rgba(250, 204, 21, 0.6)', // Yellow - Yellow Cards
                'rgba(244, 63, 94, 0.6)'   // Red - Red Cards
              ]
            }]
          };
        } else {
          this.chartData = {
            labels: ['No Performance Data'],
            datasets: [{
              data: [1],
              backgroundColor: ['rgba(156, 163, 175, 0.6)'] // Gray for no data
            }]
          };
        }
        break;

      case 'media_type':
        this.calculateMediaByType();

        this.chartData = {
          labels: ['Images', 'Videos'],
          datasets: [{
            label: 'Media Types',
            data: [
              this.mediaByTypeData.image || 0,
              this.mediaByTypeData.video || 0
            ],
            backgroundColor: [
              'rgba(59, 130, 246, 0.6)', // Blue
              'rgba(34, 197, 94, 0.6)'   // Green
            ]
          }]
        };
        break;

      default:
        this.analyticsMetric = 'performance';
        this.generateChartData();
    }
  }

  executeChart(): void {
    if (!this.chartRef || !this.chartRef.nativeElement) {
      console.error('Chart reference is not available');
      return;
    }

    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    // Clean up old chart if it exists
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }

    console.log('Creating chart with data:', this.chartData);

    const chartColors = [
      'rgba(34, 197, 94, 0.6)',  // Green
      'rgba(59, 130, 246, 0.6)', // Blue
      'rgba(139, 92, 246, 0.6)', // Purple
      'rgba(249, 115, 22, 0.6)', // Orange
      'rgba(236, 72, 153, 0.6)', // Pink
      'rgba(244, 63, 94, 0.6)',  // Red
      'rgba(250, 204, 21, 0.6)', // Yellow
      'rgba(6, 182, 212, 0.6)'   // Cyan
    ];

    const datasets = this.chartData.datasets.map((dataset, i) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor ||
        (Array.isArray(dataset.data)
          ? dataset.data.map((_: any, j: number) => chartColors[j % chartColors.length])
          : chartColors[i % chartColors.length])
    }));

    const isPieChart = this.chartType === 'pie' || this.chartType === 'doughnut';

    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: this.getChartTitle(),
          font: {
            size: 16
          }
        }
      }
    };

    if (!isPieChart) {
      options.scales = {
        y: {
          beginAtZero: true
        }
      };
    }

    this.chart = new Chart(ctx, {
      type: this.chartType as any,
      data: {
        labels: this.chartData.labels,
        datasets: datasets
      },
      options: options
    });
  }

  getChartTitle(): string {
    switch (this.analyticsMetric) {
      case 'media_timeline': return 'Media Upload Timeline';
      case 'media_type': return 'Media Types Distribution';
      case 'performance': return 'Performance Statistics';
      case 'invitations': return 'Activity Overview';
      default: return 'Player Analytics';
    }
  }

  togglePerformanceForm(): void {
    this.showPerformanceForm = !this.showPerformanceForm;

    if (this.showPerformanceForm && this.playerStats?.performanceStats) {
      this.performanceStats = { ...this.playerStats.performanceStats };
    }
  }

  updatePerformanceStats(): void {
    this.isUpdatingStats = true;

    this.playerService.updatePerformanceStats(this.performanceStats).subscribe({
      next: (response) => {
        console.log('Performance stats updated:', response);
        this.isUpdatingStats = false;
        this.showPerformanceForm = false;
        this.loadPlayerAnalytics();
        this.toastService.success('Performance statistics updated successfully!');
      },
      error: (err) => {
        console.error('Failed to update performance stats:', err);
        this.isUpdatingStats = false;
        this.toastService.error('Failed to update performance statistics. Please try again.');
      }
    });
  }

  getPlayerRating(): string {
    if (!this.playerStats?.performanceStats) return '1.0';
    return RatingUtil.getRatingString(this.playerStats.performanceStats);
  }

  calculateEfficiency(): number {
    if (!this.playerStats?.performanceStats) return 1;
    return RatingUtil.calculateRating(this.playerStats.performanceStats);
  }

  getRatingPosition(): number {
    const rating = this.calculateEfficiency();
    return RatingUtil.getRatingPercentage(rating);
  }

  getRatingClass(): string {
    const rating = this.calculateEfficiency();
    return RatingUtil.getRatingClass(rating);
  }

  getGoalsPerMatch(): string {
    if (!this.playerStats?.performanceStats) return '0.00';

    const stats = this.playerStats.performanceStats;
    const matches = stats.matches_played || 1;
    const goalsPerMatch = (stats.goals || 0) / matches;

    return goalsPerMatch.toFixed(2);
  }

  getAssistsPerMatch(): string {
    if (!this.playerStats?.performanceStats) return '0.00';

    const stats = this.playerStats.performanceStats;
    const matches = stats.matches_played || 1;
    const assistsPerMatch = (stats.assists || 0) / matches;

    return assistsPerMatch.toFixed(2);
  }

  getTotalCards(): number {
    if (!this.playerStats?.performanceStats) return 0;

    const stats = this.playerStats.performanceStats;
    return (stats.yellow_cards || 0) + (stats.red_cards || 0);
  }

  deleteProfileImage(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Profile Image',
        message: 'Are you sure you want to delete your profile image? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isUpdating = true;

        this.playerService.deleteProfilePicture().subscribe({
          next: () => {
            if (this.profile) {
              // Clear the profile image
              this.profile.profileImage = null;

              // Log the state after update
              console.log('Profile image deleted, updated profile:', this.profile);
            }
            this.isUpdating = false;
            this.toastService.success('Profile image deleted successfully');
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Failed to delete profile image:', err);
            this.toastService.error('Failed to delete profile image');
            this.isUpdating = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }
}