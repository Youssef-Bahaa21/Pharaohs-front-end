import { Component, OnInit, inject, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DateFormatUtil } from '../../../../core/utils/date-format.util';
import { PlayerService } from '../../../../core/services/player/player.service';
import { PlayerProfile, PlayerStats, Video } from '../../../../core/models/models';
import { SimpleToastService } from '../../../../shared/components/toast/simple-toast.service';
import { ProfileSkeletonComponent } from '../../../../shared/components/skeleton/profile-skeleton.component';
import { MediaGridSkeletonComponent } from '../../../../shared/components/skeleton/media-grid-skeleton.component';
import { LazyLoadImageDirective } from '../../../../shared/directives/lazy-load-image.directive';
import { ImageOptimizationService } from '../../../../core/services/image/image-optimization.service';
import { VideoPlayerComponent } from '../../../../shared/components/video-player/video-player.component';
import { FeatureHeaderComponent } from '../../../../shared/components/feature-header/feature-header.component';
import { RatingUtil } from '../../../../core/utils/rating.util';

@Component({
  selector: 'app-view-profile',
  standalone: true,
  imports: [
    CommonModule,
    DateFormatUtil,
    ProfileSkeletonComponent,
    MediaGridSkeletonComponent,
    LazyLoadImageDirective,
    VideoPlayerComponent,
    FeatureHeaderComponent
  ],
  templateUrl: './view-profile.component.html',
  styleUrls: ['./view-profile.component.css']
})
export class ViewProfileComponent implements OnInit {
  route = inject(ActivatedRoute);
  playerService = inject(PlayerService);
  sanitizer = inject(DomSanitizer);
  toastService = inject(SimpleToastService);
  imageService = inject(ImageOptimizationService);

  player: PlayerProfile | null = null;
  isLoading = false;
  isMediaLoading = false;
  playerId!: number;

  activeTab: string = 'overview';

  defaultStats: PlayerStats = {
    matches_played: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0
  };

  videoMedia: Video[] = [];
  imageMedia: Video[] = [];
  currentPlayingVideo: HTMLVideoElement | null = null;
  isFullscreen: boolean = false;

  showProfileImageModal = false;
  profileImageToShow: string | null = null;
  isImageZoomed = false;

  touchStartY = 0;
  touchEndY = 0;

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  @HostListener('document:mozfullscreenchange')
  @HostListener('document:MSFullscreenChange')
  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.showProfileImageModal) {
      this.closeProfileImageModal();
    }
  }


  ngOnInit(): void {
    this.playerId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.playerId) {
      this.loadPlayer();
    }
  }

  setActiveTab(tabName: string): void {
    this.activeTab = tabName;

    if (tabName === 'media' && this.player?.videos?.length) {
      this.isMediaLoading = true;
      setTimeout(() => {
        this.isMediaLoading = false;
      }, 800);
    }
  }

  calculateEfficiencyRating(): number {
    if (!this.player?.stats) return 1;
    return RatingUtil.calculateRating(this.player.stats);
  }

  getRatingString(): string {
    if (!this.player?.stats) return '1.0';
    return RatingUtil.getRatingString(this.player.stats);
  }

  getRatingClass(): string {
    const rating = this.calculateEfficiencyRating();
    return RatingUtil.getRatingClass(rating);
  }

  getPositionCategory(): string {
    if (!this.player?.position) return 'Unknown';

    const position = this.player.position.toLowerCase();
    if (position.includes('forward') || position.includes('striker') || position.includes('winger')) {
      return 'Forward';
    } else if (position.includes('midfield')) {
      return 'Midfielder';
    } else if (position.includes('defender') || position.includes('back')) {
      return 'Defender';
    } else if (position.includes('keeper') || position.includes('goalie')) {
      return 'Goalkeeper';
    }
    return this.player.position;
  }

  sanitizeUrl(url: string): string {
    return url;
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // Open profile image modal
  openProfileImageModal(imageUrl: string): void {
    this.profileImageToShow = imageUrl;
    this.showProfileImageModal = true;
  }

  closeProfileImageModal(): void {
    this.showProfileImageModal = false;
    setTimeout(() => {
      this.profileImageToShow = null;
      this.isImageZoomed = false;
    }, 300);
  }

  toggleImageZoom(): void {
    this.isImageZoomed = !this.isImageZoomed;
  }

  handleTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
  }

  handleTouchEnd(event: TouchEvent): void {
    this.touchEndY = event.changedTouches[0].clientY;
    this.handleGesture();
  }

  handleGesture(): void {
    const swipeDistance = this.touchEndY - this.touchStartY;

    if (swipeDistance > 100) {
      this.closeProfileImageModal();
    }
  }

  onMediaError(event: Event, url: string): void {
    console.error('Media load error:', url, event);
    const element = event.target as HTMLImageElement | HTMLVideoElement;
    element.style.display = 'none';

    const parent = element.parentElement;
    if (parent) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'text-red-500 text-sm mt-1';
      errorMsg.textContent = 'Media failed to load';
      parent.appendChild(errorMsg);

      this.toastService.error('Failed to load media content');
    }
  }

  playVideo(videoElement: HTMLVideoElement, event?: any): void {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }

    if (this.currentPlayingVideo && this.currentPlayingVideo !== videoElement) {
      this.currentPlayingVideo.pause();
    }

    if (videoElement.paused) {
      videoElement.play()
        .then(() => {
          this.currentPlayingVideo = videoElement;
        })
        .catch(error => {
          console.error('Error playing video:', error);
          this.toastService.error('Failed to play video');
        });
    } else {
      videoElement.pause();
      this.currentPlayingVideo = null;
    }
  }

  // Toggle fullscreen for a video
  toggleFullscreen(videoContainer: HTMLElement, event?: any): void {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }

    try {
      if (!document.fullscreenElement) {
        videoContainer.requestFullscreen()
          .then(() => {
          })
          .catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
            this.toastService.error('Failed to enter fullscreen mode');
          });
      } else {
        document.exitFullscreen()
          .catch(err => {
            console.error('Error attempting to exit fullscreen:', err);
            this.toastService.error('Failed to exit fullscreen mode');
          });
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      this.toastService.error('Fullscreen is not supported in your browser');
    }
  }

  loadPlayer(): void {
    this.isLoading = true;
    this.isMediaLoading = true;

    this.playerService.getPublicProfile(this.playerId).subscribe({
      next: (data) => {
        this.player = {
          ...data,
          profileImage: data.profileImage?.startsWith('http') ? data.profileImage : `http://localhost:3000${data.profileImage}`,
          videos: data.videos?.filter((v: Video) => v.status !== 'rejected').map((v: Video) => ({
            ...v,
            url: v.url.startsWith('http') ? v.url : `http://localhost:3000${v.url}`
          })) || [],
          stats: data.stats || this.defaultStats
        };

        this.videoMedia = this.player.videos?.filter(v => v.type === 'video') || [];
        this.imageMedia = this.player.videos?.filter(v => v.type === 'image') || [];

        setTimeout(() => {
          this.isLoading = false;

          setTimeout(() => {
            this.isMediaLoading = false;
          }, 500);
        }, 300);
      },
      error: (err) => {
        console.error('Failed to load player profile:', err);
        this.toastService.error('Unable to load player profile');
        this.isLoading = false;
        this.isMediaLoading = false;
      }
    });
  }
}

