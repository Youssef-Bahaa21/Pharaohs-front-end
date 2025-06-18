import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PlayerProfile, Comment, Video, Tryout } from '../../core/models/models';
import { PlayerService } from '../../core/services/player/player.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { UploadEventService } from '../../core/services/upload-event.service';
import { ScoutService } from '../../core/services/scout/scout.service';
import { AdminService } from '../../core/services/admin/admin.service';
import { Subscription } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { environment } from '../../core/environments/environments';
import { FeatureHeaderComponent } from '../../shared/components/feature-header/feature-header.component';
import { SimpleToastService } from '../../shared/components/toast/simple-toast.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { RatingUtil } from '../../core/utils/rating.util';
import { FilterComponent } from '../../shared/components/filter/filter.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PlayerCardComponent } from '../../shared/components/player-card/player-card.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    FeatureHeaderComponent,
    MatDialogModule,
    MatSnackBarModule,
    FilterComponent,
    ModalComponent,
    PlayerCardComponent
  ],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit, OnDestroy {
  playerService = inject(PlayerService);
  sanitizer = inject(DomSanitizer);
  router = inject(Router);
  authService = inject(AuthService);
  route = inject(ActivatedRoute);
  cdr = inject(ChangeDetectorRef);
  uploadEventService = inject(UploadEventService);
  scoutService = inject(ScoutService);
  httpClient = inject(HttpClient);
  toastService = inject(SimpleToastService);
  dialog = inject(MatDialog);
  adminService = inject(AdminService);

  players: PlayerProfile[] = [];
  filteredPlayers: PlayerProfile[] = [];
  userRole: string = '';
  currentUserInitial: string = 'U';
  currentUserProfileImage: string | null = null;
  searchQuery: string = '';
  filterClub: string = '';
  filterPosition: string = '';
  filterRating: string = '';

  positions: string[] = [];
  clubs: string[] = [];
  isLoadingFilterOptions: boolean = false;

  currentPage = 1;
  totalPages = 1;
  totalPlayers = 0;
  pageSize = 10;

  private filterTimeout: any = null;

  displayedVideos: Video[] = [];
  allVideos: Video[] = [];
  videosPerPage: number = 5;
  currentVideoPage: number = 1;
  isLoadingMore: boolean = false;
  hasMoreVideos: boolean = true;

  showModal = false;
  modalTitle = '';
  modalType: 'upload' | 'update' | 'tryout' = 'upload';
  uploadType: 'video' | 'image' = 'video';
  selectedFile: File | null = null;
  uploadDescription: string = '';
  uploadProgress: number = 0;
  uploadError: string | null = null;
  isUploading: boolean = false;

  comments: Record<string, Comment[]> = {};
  newComments: Record<string, string> = {};
  likes: Record<string, { likeCount: number; likedByUser: boolean; loading: boolean }> = {};
  isDeletingComment: Record<string, boolean> = {};
  currentUserId: string = '';
  loading: boolean = true;

  shortlistedPlayers = new Set<number>();
  invitedPlayers = new Set<number>();
  tryouts: Tryout[] = [];
  selectedTryoutId: number | null = null;
  showTryoutSelector: boolean = false;
  isLoadingTryouts = false;
  actionMessages: { [key: string]: { message: string, isError: boolean, timestamp: number } } = {};
  currentInvitingPlayerId: number | null = null;

  addingToShortlist: Set<number> = new Set<number>();
  removingFromShortlist: Set<number> = new Set<number>();

  playerTryoutMap: Map<number, Set<string | number>> = new Map();

  private uploadSubscription: Subscription;

  editingPostId: string | null = null;
  editedDescription: string = '';
  isEditingPost: boolean = false;
  isDeletingPost: Record<string, boolean> = {};

  showUpdateModal = false;
  updatePostId: string | null = null;
  updateType: 'video' | 'image' = 'video';
  updateFile: File | null = null;
  updateDescription: string = '';
  updateProgress: number = 0;
  updateError: string | null = null;
  isUpdating: boolean = false;
  postBeingUpdated: Video | null = null;

  isLoading: boolean = false;
  isRefreshing: boolean = false;

  // Handles modal form submission depending on modal type
  handleModalSubmit(event: Event): void {
    event.preventDefault();

    if (this.modalType === 'upload') {
      this.uploadMedia(event);
    } else if (this.modalType === 'update') {
      this.updatePost(event);
    }
  }

  constructor() {
    this.uploadSubscription = this.uploadEventService.uploadCompleted$.subscribe(() => {
      this.loadFeed();
    });
  }

  // Initializes component, loads necessary data
  ngOnInit(): void {
    this.getCurrentUserInfo();
    this.loadFilterOptions();

    window.addEventListener('scroll', this.onScroll.bind(this));

    if (this.userRole === 'scout') {
      this.loadScoutData();
    }

    this.route.data.subscribe(data => {
      if (data['feedData']) {
        const feedData = data['feedData'];

        this.totalPages = feedData.pagination.totalPages;
        this.totalPlayers = feedData.pagination.total;
        this.currentPage = feedData.pagination.page;

        this.players = feedData.players.map((player: PlayerProfile) => ({
          ...player,
          videos: player.videos?.map((video: Video) => ({
            ...video,
            url: video.url?.startsWith('http') ? video.url : `http://localhost:3000${video.url}`,
            type: video.type || (video.url?.match(/\.(mp4|webm)$/i) ? 'video' : 'image')
          })) || []
        }));

        this.applyFilters();
        this.loading = false;

        if (this.userRole === 'scout' && !this.shortlistedPlayers.size) {
          this.loadScoutData();
        }
      } else {
        this.loadFeed();
      }
    });
  }

  // Cleans up resources on component destruction
  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll.bind(this));
    this.uploadSubscription?.unsubscribe();
  }

  // Gets current user information from auth service
  getCurrentUserInfo(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userRole = user.role;
      this.currentUserInitial = user.name.charAt(0).toUpperCase();
      this.currentUserId = user.id.toString();

      this.loadCurrentUserProfileImage();
    } else {
      this.toastService.error('User not authenticated. Please log in.');
      this.router.navigate(['/login']);
      this.loading = false;
    }
  }

  // Loads the profile image for the current user
  loadCurrentUserProfileImage(): void {
    if (this.userRole === 'player' && this.currentUserId) {
      const userId = parseInt(this.currentUserId, 10);
      this.playerService.getPublicProfile(userId).subscribe({
        next: (profile: PlayerProfile) => {
          if (profile && profile.profileImage) {
            this.currentUserProfileImage = profile.profileImage;
          }
          this.cdr.detectChanges();
        },
        error: (err: unknown) => {
          console.error('[LoadCurrentUserProfileImage] Error loading profile image:', err);
        }
      });
    } else if (this.userRole === 'scout') {
    }
  }

  // Loads position and club options for filters
  loadFilterOptions(): void {
    this.isLoadingFilterOptions = true;
    this.playerService.getFilterOptions().subscribe({
      next: (data) => {
        this.positions = data.positions;
        this.clubs = data.clubs;
        this.isLoadingFilterOptions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[LoadFilterOptions] Failed to load filter options:', err);
        this.toastService.error('Failed to load filter options. Some features may be limited.');
        this.isLoadingFilterOptions = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Checks if the comment belongs to the current user
  isCurrentUserComment(comment: Comment): boolean {
    if (!comment || !this.currentUserId) {
      return false;
    }

    const commentUserId = comment.player_id?.toString();
    const currentUserId = this.currentUserId?.toString();

    return commentUserId === currentUserId || this.userRole === 'admin';
  }

  // Deletes a comment with confirmation dialog
  deleteComment(videoId: string, commentId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Comment',
        message: 'Are you sure you want to delete this comment?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.isDeletingComment) {
          this.isDeletingComment = {};
        }

        this.isDeletingComment[commentId] = true;
        this.cdr.detectChanges();

        const deleteMethod = this.userRole === 'admin' ?
          this.adminService.deleteComment(commentId) :
          this.playerService.deleteComment(commentId);

        deleteMethod.subscribe({
          next: () => {
            if (this.comments[videoId]) {
              this.comments[videoId] = this.comments[videoId].filter(c => c.id !== commentId);
            }

            this.isDeletingComment[commentId] = false;
            this.toastService.success('Comment deleted successfully');
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error(`[DeleteComment] Failed to delete comment ${commentId}:`, err);

            this.isDeletingComment[commentId] = false;
            this.cdr.detectChanges();

            if (err.status === 403) {
              this.toastService.error('You do not have permission to delete this comment.');
            } else if (err.status === 404) {
              if (this.comments[videoId]) {
                this.comments[videoId] = this.comments[videoId].filter(c => c.id !== commentId);
              }
              this.toastService.info('Comment no longer exists');
            } else {
              this.toastService.error('Failed to delete comment. Please try again.');
            }
          }
        });
      }
    });
  }

  // Opens upload modal with initial settings
  openUploadModal(): void {
    this.modalType = 'upload';
    this.modalTitle = 'Upload Highlight';
    this.showModal = true;
    this.resetUploadForm();
  }

  // Closes the modal and resets form data
  closeModal(): void {
    this.showModal = false;
    this.resetUploadForm();
    this.resetUpdateForm();
    setTimeout(() => {
      this.isUploading = false;
      this.isUpdating = false;
      this.uploadProgress = 0;
      this.updateProgress = 0;
    }, 300);

    if (this.modalType === 'tryout') {
      this.currentInvitingPlayerId = null;
    }
  }

  // Handles file selection in modal forms
  onFileSelected(event: Event): void {
    if (this.modalType === 'upload') {
      const fileInput = event.target as HTMLInputElement;
      if (fileInput.files && fileInput.files.length > 0) {
        this.selectedFile = fileInput.files[0];
      }
    } else if (this.modalType === 'update') {
      const fileInput = event.target as HTMLInputElement;
      if (fileInput.files && fileInput.files.length > 0) {
        this.updateFile = fileInput.files[0];
      }
    }
  }

  onFileTypeChange(type: 'video' | 'image'): void {
    if (this.modalType === 'upload') {
      this.uploadType = type;
    } else {
      this.updateType = type;
    }
  }

  onDescriptionChange(desc: string): void {
    if (this.modalType === 'upload') {
      this.uploadDescription = desc;
    } else {
      this.updateDescription = desc;
    }
  }

  removeSelectedFile(event: Event): void {
    event.stopPropagation();
    if (this.modalType === 'upload') {
      this.selectedFile = null;
    } else if (this.modalType === 'update') {
      this.updateFile = null;
    }
  }

  // Uploads media file with progress tracking
  uploadMedia(event: Event): void {
    event.preventDefault();
    if (this.isUploading) {
      return;
    }

    if (!this.selectedFile) {
      this.uploadError = 'Please select a file to upload';
      return;
    }

    if (!this.uploadType) {
      this.uploadError = 'Please select a media type';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadError = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('type', this.uploadType);
    formData.append('description', this.uploadDescription);

    this.httpClient.post<any>('http://localhost:3000/api/player/upload', formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        this.isUploading = false;
        this.uploadError = error.message || 'An error occurred during upload';
        this.toastService.error('Upload failed. Please try again.');
        return throwError(() => error);
      })
    ).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * (event.loaded / event.total));
          this.cdr.detectChanges();
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.uploadProgress = 100;

          const response = event.body;

          if (response && response.data) {
            const newVideo: Video = {
              id: new Date().getTime().toString(),
              url: response.data.url,
              type: this.uploadType,
              description: this.uploadDescription,
              playerId: this.currentUserId,
              player_name: this.authService.getCurrentUser()?.name || 'You',
              createdAt: new Date().toISOString()
            };

            this.allVideos = [newVideo, ...this.allVideos];
            this.displayedVideos = [newVideo, ...this.displayedVideos.slice(0, this.videosPerPage - 1)];

            this.comments[newVideo.id] = [];
            this.likes[newVideo.id] = { likeCount: 0, likedByUser: false, loading: false };

            this.selectedFile = null;
            this.uploadDescription = '';
            this.toastService.success('Media uploaded successfully!');
            this.closeModal();

            this.cdr.detectChanges();

            setTimeout(() => {
              this.refreshFeedData();
            }, 500);
          } else {
            this.selectedFile = null;
            this.uploadDescription = '';
            this.toastService.success('Media uploaded successfully!');
            this.closeModal();
            this.refreshFeedData();
          }
        }
      },
      error: (err: unknown) => {
        console.error('Upload error:', err);
        this.isUploading = false;
        this.uploadError = 'Failed to upload media. Please try again.';
        this.toastService.error('Failed to upload media. Please try again.');
        this.cdr.detectChanges();
      },
      complete: () => {
        if (this.isUploading) {
          this.isUploading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // Navigates to a player's profile page
  goToPlayerProfile(playerId: string | number): void {
    this.router.navigate(['/profile', playerId]);
  }

  // Navigates to a commenter's profile page
  goToCommenterProfile(comment: Comment): void {
    if (comment.player_id) {
      this.router.navigate(['/profile', comment.player_id]);
    } else {
      this.toastService.error('Cannot navigate to profile - player information not available');
    }
  }

  // Applies filters with debounce and reloads data
  applyFilters(): void {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }

    this.filterTimeout = setTimeout(() => {
      this.allVideos = [];
      this.displayedVideos = [];
      this.currentVideoPage = 1;
      this.hasMoreVideos = true;

      const filters: {
        club?: string,
        position?: string,
        search?: string,
        minRating?: string
      } = {};

      if (this.searchQuery) {
        filters.search = this.searchQuery;
      }
      if (this.filterClub) {
        filters.club = this.filterClub;
      }
      if (this.filterPosition) {
        filters.position = this.filterPosition;
      }
      if (this.filterRating) {
        const ratingValue = this.parseNumber(this.filterRating);
        filters.minRating = ratingValue.toString();
        console.log(`[ApplyFilters] Filtering by minimum rating: ${ratingValue}`);
      }

      this.loadFeed(1, filters);
    }, 300);
  }

  // Loads feed data with pagination and filters
  loadFeed(page: number = 1, additionalFilters = {}): void {
    this.loading = true;
    this.currentPage = page;

    const filters: {
      club?: string,
      position?: string,
      search?: string,
      minRating?: string
    } = { ...additionalFilters };

    if (!filters.search && this.searchQuery) {
      filters.search = this.searchQuery;
    }
    if (!filters.club && this.filterClub) {
      filters.club = this.filterClub;
    }
    if (!filters.position && this.filterPosition) {
      filters.position = this.filterPosition;
    }
    if (!filters.minRating && this.filterRating) {
      const ratingValue = this.parseNumber(this.filterRating);
      filters.minRating = ratingValue.toString();
      console.log(`[LoadFeed] Filtering by minimum rating: ${ratingValue}`);
    }

    this.playerService.getAllPlayers(this.currentPage, this.pageSize, '', filters).subscribe({
      next: (response) => {
        this.totalPages = response.pagination.totalPages;
        this.totalPlayers = response.pagination.total;

        if (filters.minRating) {
          console.log(`[LoadFeed] Received ${response.players.length} players after filtering by rating >= ${filters.minRating}`);
          response.players.forEach((player: PlayerProfile) => {
            console.log(`[LoadFeed] Player ${player.name} has rating: ${player.rating}`);
          });
        }

        this.players = response.players.map((player: PlayerProfile) => ({
          ...player,
          videos: player.videos?.map((video: Video) => ({
            ...video,
            url: video.url?.startsWith('http') ? video.url : `http://localhost:3000${video.url}`,
            type: video.type || (video.url?.match(/\.(mp4|webm)$/i) ? 'video' : 'image')
          })) || []
        }));

        this.filteredPlayers = this.players;

        if (this.filteredPlayers.length === 0) {
          this.allVideos = [];
          this.displayedVideos = [];
          this.hasMoreVideos = false;
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.allVideos = this.getAllVideos();
        this.initializeDisplayedVideos();

        this.initializeComments();
        this.loadCommentsAndLikes();

        if (this.userRole === 'scout') {
          this.loadScoutData();
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        this.toastService.error('Failed to load player feed. Please try again later.');
        console.error('[Load Feed Error]', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Loads next page of players
  loadNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.loadFeed(this.currentPage + 1);
    }
  }

  // Loads previous page of players
  loadPreviousPage(): void {
    if (this.currentPage > 1) {
      this.loadFeed(this.currentPage - 1);
    }
  }

  // Initializes comment structures for all videos
  initializeComments(): void {
    this.filteredPlayers.forEach(player => {
      player.videos?.forEach(video => {
        if (!this.newComments[video.id]) {
          this.newComments[video.id] = '';
        }
      });
    });
  }

  // Toggles like/unlike status for a video
  toggleLike(videoId: string): void {
    if (this.userRole === 'admin') {
      this.toastService.info('Admin users cannot like posts. This is limited to players and scouts.');
      return;
    }

    if (!this.likes[videoId]) {
      this.likes[videoId] = { likeCount: 0, likedByUser: false, loading: false };
    }

    if (this.likes[videoId].loading) {
      return;
    }

    this.likes[videoId].loading = true;
    const isLiked = this.likes[videoId].likedByUser;

    const newLikeCount = isLiked ? Math.max(0, this.likes[videoId].likeCount - 1) : this.likes[videoId].likeCount + 1;
    this.likes[videoId] = {
      likeCount: newLikeCount,
      likedByUser: !isLiked,
      loading: true
    };
    this.cdr.detectChanges();

    if (isLiked) {
      this.playerService.unlikeVideo(videoId).subscribe({
        next: (response) => {
          if (response.likeCount !== undefined) {
            this.likes[videoId] = {
              likeCount: response.likeCount,
              likedByUser: false,
              loading: false
            };
            this.cdr.detectChanges();
          } else {
            this.refreshLikes(videoId);
          }
        },
        error: (err: unknown) => {
          this.handleLikeError(videoId, isLiked, err);
        }
      });
    } else {
      this.playerService.likeVideo(videoId).subscribe({
        next: (response) => {
          if (response.likeCount !== undefined) {
            this.likes[videoId] = {
              likeCount: response.likeCount,
              likedByUser: true,
              loading: false
            };
            this.cdr.detectChanges();
          } else {
            this.refreshLikes(videoId);
          }
        },
        error: (err: unknown) => {
          this.handleLikeError(videoId, isLiked, err);
        }
      });
    }
  }

  // Refreshes like data for a specific video
  private refreshLikes(videoId: string): void {
    if (this.userRole === 'admin') {
      if (this.likes[videoId]) {
        this.likes[videoId].loading = false;
        this.cdr.detectChanges();
      }
      return;
    }

    this.playerService.getVideoLikes().subscribe({
      next: (likes) => {
        const videoLike = likes.find(like => like.video_id === videoId);
        if (videoLike) {
          this.likes[videoId] = {
            likeCount: videoLike.likeCount || 0,
            likedByUser: videoLike.likedByUser === 1,
            loading: false
          };
        } else {
          this.likes[videoId] = {
            likeCount: 0,
            likedByUser: false,
            loading: false
          };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`[RefreshLikes] Error fetching updated likes for video ${videoId}:`, err);
        this.likes[videoId].loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Handles errors when liking/unliking videos
  private handleLikeError(videoId: string, wasLiked: boolean, err: unknown): void {
    console.error(`[ToggleLike] Error for video ${videoId}:`, err);

    this.likes[videoId] = {
      likeCount: wasLiked ? this.likes[videoId].likeCount + 1 : Math.max(0, this.likes[videoId].likeCount - 1),
      likedByUser: wasLiked,
      loading: false
    };

    if (err && (err as any).status === 403) {
      this.toastService.error('You do not have permission to like/unlike this video.');
    } else {
      this.toastService.error(`Failed to ${wasLiked ? 'unlike' : 'like'} video.`);
    }

    this.cdr.detectChanges();
  }

  // Loads both comments and likes data for all videos
  loadCommentsAndLikes(): void {
    const videos = this.getAllVideos();
    if (videos.length === 0) {
      return;
    }

    const allVideoIds = videos.map(video => video.id);

    allVideoIds.forEach(videoId => {
      if (!this.likes[videoId]) {
        this.likes[videoId] = { likeCount: 0, likedByUser: false, loading: false };
      } else {
        this.likes[videoId].loading = false;
      }
    });

    if (this.userRole !== 'admin') {
      this.playerService.getVideoLikes().subscribe({
        next: (likes) => {
          likes.forEach(like => {
            const videoId = like.video_id.toString();
            if (this.likes[videoId]) {
              this.likes[videoId] = {
                likeCount: like.likeCount || 0,
                likedByUser: like.likedByUser === 1,
                loading: false
              };
            } else {
              this.likes[videoId] = {
                likeCount: like.likeCount || 0,
                likedByUser: like.likedByUser === 1,
                loading: false
              };
            }
          });

          allVideoIds.forEach(videoId => {
            if (!likes.some(like => like.video_id.toString() === videoId.toString())) {
              if (!this.likes[videoId] || this.likes[videoId].loading) {
                this.likes[videoId] = {
                  likeCount: 0,
                  likedByUser: false,
                  loading: false
                };
              }
            }
          });

          this.cdr.detectChanges();
        },
        error: (err: unknown) => {
          this.toastService.error('Failed to load video likes. Please try again.');
          console.error('[LoadVideoLikes] Error:', err);

          allVideoIds.forEach(videoId => {
            if (this.likes[videoId]) {
              this.likes[videoId].loading = false;
            }
          });
          this.cdr.detectChanges();
        }
      });
    }

    videos.forEach(video => {
      this.playerService.getComments(video.id).subscribe({
        next: (comments) => {
          this.comments[video.id] = comments;
          this.cdr.detectChanges();
        },
        error: (err: unknown) => {
          console.error(`[Load Comments Error for Video ${video.id}]`, err);
        }
      });
    });
  }

  // Calculates player rating using the shared utility
  calculatePlayerRating(player: PlayerProfile): number {
    if (!player) return 1;

    const stats = player.performanceStats || player.stats;
    return RatingUtil.calculateRating(stats);
  }

  // Gets player rating as a string with one decimal place
  getPlayerRating(player: PlayerProfile): string {
    if (player.rating !== undefined && player.rating !== null) {
      return parseFloat(player.rating.toString()).toFixed(1);
    }

    const stats = player.performanceStats || player.stats;
    return RatingUtil.getRatingString(stats);
  }

  // Gets CSS class for rating based on its value
  getRatingClass(player: PlayerProfile): string {
    const rating = this.calculatePlayerRating(player);
    return RatingUtil.getRatingClass(rating);
  }

  // Gets all videos from filtered players
  getAllVideos(): Video[] {
    if (!this.filteredPlayers || this.filteredPlayers.length === 0) {
      return [];
    }

    if (this.allVideos.length > 0) {
      return this.allVideos;
    }

    const allVideos = this.filteredPlayers.reduce((videos, player) => {
      const matchesClub = !this.filterClub || player.club === this.filterClub;
      const matchesPosition = !this.filterPosition || player.position === this.filterPosition;

      let matchesRating = true;
      if (this.filterRating) {
        const minRating = this.parseNumber(this.filterRating);
        const playerRating = player.rating ? parseFloat(player.rating.toString()) : this.calculatePlayerRating(player);
        matchesRating = playerRating >= minRating;

        console.log(`[getAllVideos] Player ${player.name} has rating ${playerRating.toFixed(1)}, min rating filter: ${minRating.toFixed(1)}, matches: ${matchesRating}`);
      }

      if (matchesClub && matchesPosition && matchesRating && player.videos && player.videos.length > 0) {
        const approvedVideos = player.videos.filter(v => v.status !== 'rejected');
        return [...videos, ...approvedVideos];
      }
      return videos;
    }, [] as Video[]);

    const sortedVideos = allVideos.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    this.allVideos = sortedVideos;

    this.initializeDisplayedVideos();

    return sortedVideos;
  }

  // Initializes displayed videos with the first batch
  initializeDisplayedVideos(): void {
    this.currentVideoPage = 1;
    this.displayedVideos = this.allVideos.slice(0, this.videosPerPage);
    this.hasMoreVideos = this.allVideos.length > this.videosPerPage;
  }

  // Loads more videos for infinite scrolling
  loadMoreVideos(): void {
    if (this.isLoadingMore || !this.hasMoreVideos) {
      return;
    }

    this.isLoadingMore = true;

    setTimeout(() => {
      const nextPage = this.currentVideoPage + 1;
      const startIndex = this.currentVideoPage * this.videosPerPage;
      const endIndex = startIndex + this.videosPerPage;
      const newVideos = this.allVideos.slice(startIndex, endIndex);

      if (newVideos.length > 0) {
        this.displayedVideos = [...this.displayedVideos, ...newVideos];
        this.currentVideoPage = nextPage;
        this.hasMoreVideos = endIndex < this.allVideos.length;
      } else {
        this.hasMoreVideos = false;
      }

      this.isLoadingMore = false;
      this.cdr.detectChanges();
    }, 500);
  }

  // Handles scroll events for infinite scrolling
  onScroll(): void {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollThreshold = 200;

    if (documentHeight - (scrollPosition + windowHeight) < scrollThreshold) {
      this.loadMoreVideos();
    }
  }

  getPlayerById(playerId: string | number): PlayerProfile | undefined {
    return this.players.find(player => player.id.toString() === playerId.toString());
  }

  // Resets all filter values and reloads feed
  resetFilters(): void {
    console.log('[resetFilters] Resetting all filters');

    this.searchQuery = '';
    this.filterClub = '';
    this.filterPosition = '';
    this.filterRating = '';

    this.currentPage = 1;

    this.loading = true;

    this.allVideos = [];
    this.displayedVideos = [];

    const emptyFilters = {};

    this.cdr.detectChanges();

    this.playerService.getAllPlayers(1, this.pageSize, '', emptyFilters).subscribe({
      next: (response) => {
        console.log('[resetFilters] Successfully loaded data after reset');

        this.totalPages = response.pagination.totalPages;
        this.totalPlayers = response.pagination.total;

        this.players = response.players.map((player: PlayerProfile) => ({
          ...player,
          videos: player.videos?.map((video: Video) => ({
            ...video,
            url: video.url?.startsWith('http') ? video.url : `http://localhost:3000${video.url}`,
            type: video.type || (video.url?.match(/\.(mp4|webm)$/i) ? 'video' : 'image')
          })) || []
        }));

        this.filteredPlayers = this.players;

        this.allVideos = this.getAllVideos();
        this.initializeDisplayedVideos();

        this.initializeComments();
        this.loadCommentsAndLikes();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[resetFilters] Error loading data after reset:', err);
        this.loading = false;
        this.toastService.error('Failed to reset filters. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  // Posts a comment on a video
  postComment(videoIdOrEvent: string | { videoId: string, comment: string }): void {
    if (this.userRole !== 'player') {
      this.toastService.warning('Only players can post comments.');
      return;
    }

    let videoId: string;
    let text: string | undefined;

    if (typeof videoIdOrEvent === 'string') {
      videoId = videoIdOrEvent;
      text = this.newComments[videoId]?.trim();
    } else {
      videoId = videoIdOrEvent.videoId;
      text = videoIdOrEvent.comment?.trim();
      this.newComments[videoId] = '';
    }

    if (!text) {
      this.toastService.warning('Comment cannot be empty.');
      return;
    }

    this.playerService.addComment(videoId, text).subscribe({
      next: () => {
        this.newComments[videoId] = '';
        this.toastService.success('Comment posted successfully');
        this.playerService.getComments(videoId).subscribe({
          next: (comments) => {
            this.comments[videoId] = comments;
            this.cdr.detectChanges();
          },
          error: (err: unknown) => {
            console.error(`[Reload Comments Error for Video ${videoId}]`, err);
            this.toastService.error('Failed to reload comments.');
          }
        });
      },
      error: (err: unknown) => {
        this.toastService.error('Failed to post comment.');
        console.error('[Post Comment Error]', err);
      }
    });
  }

  // Sanitizes URL for secure display
  sanitizeUrl(url: string): SafeResourceUrl {
    if (!url || url.includes('undefined')) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('assets/images/video-placeholder.svg');
    }

    if (!url.startsWith('http') && !url.startsWith('/')) {
      url = `http://localhost:3000/${url.replace(/^\/+/, '')}`;
    }

    const cacheBuster = `?t=${new Date().getTime()}`;
    const fullUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}${cacheBuster}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
  }

  // Handles media loading errors
  onMediaError(event: Event, url: string): void {
    console.error('Media error for URL:', url);

    const element = event.target as HTMLImageElement | HTMLVideoElement;
    if (element) {
      element.style.display = 'none';

      const parent = element.parentElement;
      if (parent) {
        const existingError = parent.querySelector('.media-error-container');
        if (existingError) {
          return;
        }

        const errorContainer = document.createElement('div');
        errorContainer.className = 'bg-red-500/20 p-4 rounded-lg text-center media-error-container';

        const errorIcon = document.createElement('div');
        errorIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        `;

        const errorText = document.createElement('p');
        errorText.className = 'text-white';
        errorText.textContent = 'Media failed to load. Please try again later.';

        const retryButton = document.createElement('button');
        retryButton.className = 'mt-2 bg-primary-green text-white px-4 py-1 rounded-full text-sm';
        retryButton.textContent = 'Retry';
        retryButton.onclick = () => {
          parent.removeChild(errorContainer);

          element.style.display = '';

          let fixedUrl = url;
          if (!fixedUrl.startsWith('http') && !fixedUrl.startsWith('/')) {
            fixedUrl = `http://localhost:3000/${fixedUrl.replace(/^\/+/, '')}`;
          }

          const timestamp = new Date().getTime();
          const reloadUrl = fixedUrl.includes('?')
            ? `${fixedUrl}&t=${timestamp}`
            : `${fixedUrl}?t=${timestamp}`;

          if (element instanceof HTMLImageElement) {
            element.src = reloadUrl;
          } else if (element instanceof HTMLVideoElement) {
            const source = element.querySelector('source');
            if (source) {
              source.src = reloadUrl;
            } else {
              const newSource = document.createElement('source');
              newSource.src = reloadUrl;
              newSource.type = reloadUrl.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/webm';
              element.appendChild(newSource);
            }
            element.load();
          }
        };

        errorContainer.appendChild(errorIcon);
        errorContainer.appendChild(errorText);
        errorContainer.appendChild(retryButton);
        parent.appendChild(errorContainer);
      }
    }

    this.cdr.detectChanges();
  }

  // Loads scout-specific data like shortlist and tryouts
  loadScoutData(): void {
    const apiUrl = environment.apiUrl || 'http://localhost:3000/api';

    console.log('[LoadScoutData] Loading scout data directly...');

    this.httpClient.get<any[]>(`${apiUrl}/scout/shortlist`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).subscribe({
      next: (players) => {
        this.shortlistedPlayers.clear();

        console.log('[LoadScoutData] Raw backend shortlist data:', players);

        players.forEach(player => {
          if (player.id || player.player_id) {
            const playerId = player.player_id || player.id;
            const playerIdNum = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;

            console.log(`[LoadScoutData] Adding player ${playerIdNum} to shortlist`);
            this.shortlistedPlayers.add(playerIdNum);
          }
        });

        console.log('[LoadScoutData] Final shortlist set:', Array.from(this.shortlistedPlayers));

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[LoadScoutData] Direct HTTP call failed:', err);

        this.scoutService.getShortlist().subscribe({
          next: (players: PlayerProfile[]) => {
            this.shortlistedPlayers.clear();
            players.forEach(player => {
              if (player.id) {
                this.shortlistedPlayers.add(player.id);
              }
            });
            console.log('[LoadScoutData] Fallback shortlist:', Array.from(this.shortlistedPlayers));
            this.cdr.detectChanges();
          },
          error: (err) => console.error('[LoadScoutData] Fallback also failed:', err)
        });
      }
    });

    this.isLoadingTryouts = true;
    this.scoutService.getTryouts().subscribe({
      next: (tryouts: Tryout[]) => {
        this.tryouts = tryouts;

        this.invitedPlayers.clear();
        this.playerTryoutMap.clear();

        tryouts.forEach(tryout => {
          if (tryout.playersInvited && Array.isArray(tryout.playersInvited)) {
            tryout.playersInvited.forEach(playerId => {
              const normalizedPlayerId = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;
              this.invitedPlayers.add(normalizedPlayerId);

              if (!this.playerTryoutMap.has(normalizedPlayerId)) {
                this.playerTryoutMap.set(normalizedPlayerId, new Set());
              }
              this.playerTryoutMap.get(normalizedPlayerId)?.add(tryout.id);
            });
          }
        });

        console.log('[LoadScoutData] Invited players loaded:', Array.from(this.invitedPlayers));
        console.log('[LoadScoutData] Player-Tryout Map:', this.playerTryoutMap);
        this.isLoadingTryouts = false;

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[LoadScoutData] Failed to load tryouts:', err);
        this.isLoadingTryouts = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Adds player to scout's shortlist
  addToShortlist(playerId: number): void {
    if (this.userRole !== 'scout') {
      this.toastService.warning('Only scouts can add players to shortlist.');
      return;
    }

    if (this.isShortlisted(playerId.toString())) {
      this.toastService.info('Player is already in your shortlist.');
      return;
    }

    const playerIdNum = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;
    console.log(`[AddToShortlist] Adding player ${playerIdNum} to shortlist`);

    this.addingToShortlist.add(playerIdNum);

    this.shortlistedPlayers.add(playerIdNum);
    this.cdr.detectChanges();

    this.scoutService.addToShortlist(playerIdNum).subscribe({
      next: () => {
        console.log(`[AddToShortlist] Successfully added player ${playerIdNum} to shortlist`);
        this.toastService.success('Player added to shortlist');
        this.addingToShortlist.delete(playerIdNum);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.shortlistedPlayers.delete(playerIdNum);
        console.error('[AddToShortlist] Failed:', err);
        this.toastService.error('Failed to add player to shortlist');
        this.showActionMessage(playerIdNum.toString(), 'Failed to add player to shortlist', true);
        this.addingToShortlist.delete(playerIdNum);
        this.cdr.detectChanges();
      }
    });
  }

  // Removes player from scout's shortlist
  removeFromShortlist(playerId: number): void {
    if (this.userRole !== 'scout') {
      this.toastService.warning('Only scouts can remove players from shortlist.');
      return;
    }

    const playerIdNum = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;
    console.log(`[RemoveFromShortlist] Removing player ${playerIdNum} from shortlist`);

    this.removingFromShortlist.add(playerIdNum);

    this.shortlistedPlayers.delete(playerIdNum);
    this.cdr.detectChanges();

    this.scoutService.removeFromShortlist(playerIdNum).subscribe({
      next: () => {
        this.toastService.success('Player removed from shortlist');
        this.removingFromShortlist.delete(playerIdNum);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.shortlistedPlayers.add(playerIdNum);
        console.error('[RemoveFromShortlist] Failed:', err);
        this.toastService.error('Failed to remove player from shortlist');
        this.showActionMessage(playerIdNum.toString(), 'Failed to remove player from shortlist', true);
        this.removingFromShortlist.delete(playerIdNum);
        this.cdr.detectChanges();
      }
    });
  }

  // Invites player to a tryout
  inviteToTryout(playerId: number): void {
    if (this.userRole !== 'scout') {
      this.toastService.error('Only scouts can invite players to tryouts');
      return;
    }

    if (!this.selectedTryoutId) {
      this.modalType = 'tryout';
      this.modalTitle = 'Select Tryout';
      this.showModal = true;
      this.currentInvitingPlayerId = playerId;
      this.selectedTryoutId = null;
      this.loadTryouts();
      return;
    }

    this.invitedPlayers.add(playerId);
    this.cdr.detectChanges();

    this.scoutService.invitePlayer(this.selectedTryoutId, playerId).subscribe({
      next: () => {
        this.toastService.success('Player invited successfully');
        this.showActionMessage(playerId.toString(), 'Player invited successfully', false);
        this.cdr.detectChanges();

        if (!this.playerTryoutMap.has(playerId)) {
          this.playerTryoutMap.set(playerId, new Set());
        }
        this.playerTryoutMap.get(playerId)?.add(this.selectedTryoutId!);

        this.selectedTryoutId = null;
      },
      error: (err) => {
        this.invitedPlayers.delete(playerId);
        console.error('[InvitePlayer] Failed:', err);
        this.toastService.error('Failed to invite player');
        this.showActionMessage(playerId.toString(), 'Failed to invite player', true);
        this.cdr.detectChanges();
      }
    });
  }

  // Opens tryout selector for a player
  openTryoutSelector(playerId: number): void {
    this.showTryoutSelector = true;
    this.currentInvitingPlayerId = playerId;
    this.loadTryouts();
  }

  // Closes tryout selector
  closeTryoutSelector(): void {
    this.showTryoutSelector = false;
    this.currentInvitingPlayerId = null;
  }

  // Loads all available tryouts
  loadTryouts(): void {
    this.isLoadingTryouts = true;
    this.scoutService.getTryouts().subscribe({
      next: (tryouts: Tryout[]) => {
        this.tryouts = tryouts;
        this.isLoadingTryouts = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[LoadTryouts] Error loading tryouts:', err);
        this.isLoadingTryouts = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Shows action messages with auto-removal after timeout
  showActionMessage(id: string, message: string, isError: boolean): void {
    this.actionMessages[id] = {
      message,
      isError,
      timestamp: Date.now()
    };

    setTimeout(() => {
      if (this.actionMessages[id]?.timestamp === Date.now() - 3000) {
        delete this.actionMessages[id];
        this.cdr.detectChanges();
      }
    }, 3000);
  }

  // Confirms player invitation to selected tryout
  confirmInvite(): void {
    if (!this.selectedTryoutId || !this.currentInvitingPlayerId) {
      this.toastService.warning('Please select a tryout first');
      return;
    }

    this.invitedPlayers.add(this.currentInvitingPlayerId);
    this.cdr.detectChanges();

    this.scoutService.invitePlayer(this.selectedTryoutId, this.currentInvitingPlayerId).subscribe({
      next: () => {
        this.toastService.success('Player invited successfully');
        this.closeModal();
        this.cdr.detectChanges();

        if (!this.playerTryoutMap.has(this.currentInvitingPlayerId!)) {
          this.playerTryoutMap.set(this.currentInvitingPlayerId!, new Set());
        }
        this.playerTryoutMap.get(this.currentInvitingPlayerId!)?.add(this.selectedTryoutId!);
      },
      error: (err) => {
        this.invitedPlayers.delete(this.currentInvitingPlayerId!);
        console.error('[InvitePlayer] Failed:', err);
        this.toastService.error('Failed to invite player');
        this.showActionMessage(this.currentInvitingPlayerId?.toString() || '0', 'Failed to invite player', true);
        this.cdr.detectChanges();
      }
    });
  }

  // Checks if a player is shortlisted
  isShortlisted(playerId: string): boolean {
    return this.shortlistedPlayers.has(parseInt(playerId, 10));
  }

  // Checks if a player is invited to any tryout
  isInvited(playerId: number | undefined): boolean {
    if (playerId === undefined) return false;
    return this.invitedPlayers.has(playerId);
  }

  // Gets action message for a player
  getActionMessage(playerId: number | undefined): { message: string, isError: boolean, timestamp: number } | undefined {
    if (playerId === undefined) return undefined;
    return this.actionMessages[playerId.toString()];
  }

  // Checks if a player is invited to a specific tryout
  isInvitedToTryout(playerId: number | null, tryoutId: string | number): boolean {
    if (playerId === null) return false;
    if (!this.playerTryoutMap.has(playerId)) {
      return false;
    }

    return this.playerTryoutMap.get(playerId)?.has(tryoutId) || false;
  }

  // Safely parses number values
  parseNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const stringValue = String(value);

    const floatValue = parseFloat(stringValue);

    return isNaN(floatValue) ? 0 : floatValue;
  }

  // Checks if a player is currently being added to shortlist
  isAddingToShortlist(playerId: string): boolean {
    return this.addingToShortlist.has(parseInt(playerId, 10));
  }

  // Checks if a player is currently being removed from shortlist
  isRemovingFromShortlist(playerId: string): boolean {
    return this.removingFromShortlist.has(parseInt(playerId, 10));
  }

  // Checks if current user is the owner of the post
  isCurrentUserPost(playerId: string | number): boolean {
    return this.currentUserId === playerId.toString() || this.userRole === 'admin';
  }

  // Opens update modal for an existing post
  openUpdateModal(post: Video): void {
    this.modalType = 'update';
    this.modalTitle = 'Update Highlight';
    this.showModal = true;
    this.postBeingUpdated = post;
    this.updatePostId = post.id;
    this.updateType = post.type || 'video';
    this.updateDescription = post.description || '';
    this.updateFile = null;
    this.updateProgress = 0;
    this.updateError = null;
  }

  // Closes update modal with confirmation if in progress
  closeUpdateModal(): void {
    if (this.isUpdating) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Cancel Update',
          message: 'Update in progress. Are you sure you want to cancel?',
          confirmText: 'Yes, Cancel Update',
          cancelText: 'Continue Update',
          isDanger: true
        } as ConfirmDialogData
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.isUpdating = false;
          this.showModal = false;
          this.updatePostId = null;
          this.postBeingUpdated = null;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.showModal = false;
      this.updatePostId = null;
      this.postBeingUpdated = null;
      this.cdr.detectChanges();
    }
  }

  // Handles file selection for update
  onUpdateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.updateFile = input.files[0];
    }
  }

  // Removes selected update file
  removeUpdateFile(event: Event): void {
    event.stopPropagation();
    this.updateFile = null;
    this.updateError = null;
  }

  // Updates post with new description and/or media
  updatePost(event: Event): void {
    event.preventDefault();

    if (this.isUpdating) {
      return;
    }

    if (!this.updatePostId || !this.postBeingUpdated) {
      this.updateError = 'Post information missing';
      return;
    }

    if (!this.updateDescription.trim() && !this.updateFile) {
      this.updateError = 'Please update the description or select a new file';
      return;
    }

    this.isUpdating = true;
    this.updateProgress = 0;
    this.updateError = null;

    if (!this.updateFile) {
      this.playerService.updateVideo(this.updatePostId, this.updateDescription.trim()).subscribe({
        next: (response) => {
          console.log('[UpdateVideo] Video updated successfully:', response);

          const allVideosIndex = this.allVideos.findIndex(v => v.id === this.updatePostId);
          const displayedIndex = this.displayedVideos.findIndex(v => v.id === this.updatePostId);

          const newAllVideos = [...this.allVideos];
          const newDisplayedVideos = [...this.displayedVideos];

          if (allVideosIndex !== -1) {
            newAllVideos[allVideosIndex] = {
              ...newAllVideos[allVideosIndex],
              description: this.updateDescription.trim()
            };
          }

          if (displayedIndex !== -1) {
            newDisplayedVideos[displayedIndex] = {
              ...newDisplayedVideos[displayedIndex],
              description: this.updateDescription.trim()
            };
          }

          this.allVideos = newAllVideos;
          this.displayedVideos = newDisplayedVideos;

          this.toastService.success('Post updated successfully');
          this.isUpdating = false;
          this.closeModal();

          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[UpdatePost] Error updating post:', err);
          this.isUpdating = false;
          this.updateError = 'Failed to update post. Please try again.';
          this.toastService.error('Failed to update post');
          this.cdr.detectChanges();
        }
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', this.updateFile);
    formData.append('type', this.updateType);
    formData.append('description', this.updateDescription.trim());

    let deletionInProgress = true;

    this.playerService.deleteVideo(this.updatePostId).subscribe({
      next: () => {
        this.allVideos = this.allVideos.filter(v => v.id !== this.updatePostId);
        this.displayedVideos = this.displayedVideos.filter(v => v.id !== this.updatePostId);

        deletionInProgress = false;

        this.httpClient.post<any>('http://localhost:3000/api/player/upload', formData, {
          reportProgress: true,
          observe: 'events'
        }).pipe(
          catchError((error: HttpErrorResponse) => {
            this.isUpdating = false;
            this.updateError = error.message || 'An error occurred during update';
            this.toastService.error('Update failed. Please try again.');
            return throwError(() => error);
          })
        ).subscribe({
          next: (event: HttpEvent<any>) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this.updateProgress = Math.round(100 * (event.loaded / event.total));
              this.cdr.detectChanges();
            } else if (event.type === HttpEventType.Response) {
              this.isUpdating = false;
              this.updateProgress = 100;

              const response = event.body;

              if (response && response.data) {
                const newVideo: Video = {
                  id: new Date().getTime().toString(),
                  url: response.data.url,
                  type: this.updateType,
                  description: this.updateDescription.trim(),
                  playerId: this.currentUserId,
                  player_name: this.authService.getCurrentUser()?.name || 'You',
                  createdAt: new Date().toISOString()
                };

                this.allVideos = [newVideo, ...this.allVideos];
                this.displayedVideos = [newVideo, ...this.displayedVideos.slice(0, this.videosPerPage - 1)];

                this.comments[newVideo.id] = [];
                this.likes[newVideo.id] = { likeCount: 0, likedByUser: false, loading: false };

                this.toastService.success('Post updated successfully!');
                this.closeModal();

                this.cdr.detectChanges();

                setTimeout(() => {
                  this.refreshFeedData();
                }, 500);
              } else {
                this.toastService.success('Post updated successfully!');
                this.closeModal();
                setTimeout(() => {
                  this.refreshFeedData();
                }, 500);
              }
            }
          },
          error: (err: unknown) => {
            console.error('[UpdatePost] Error uploading new media:', err);
            this.isUpdating = false;
            this.updateError = 'Failed to update post. Please try again.';
            this.toastService.error('Failed to update post');
            this.cdr.detectChanges();
          },
          complete: () => {
            if (this.isUpdating) {
              this.isUpdating = false;
              this.cdr.detectChanges();
            }
          }
        });
      },
      error: (err) => {
        deletionInProgress = false;
        console.error('[UpdatePost] Error deleting old post:', err);
        this.isUpdating = false;
        this.updateError = 'Failed to update post. Please try again.';
        this.toastService.error('Failed to update post');
        this.cdr.detectChanges();
      }
    });
  }

  // Opens edit modal for post
  editPost(post: Video): void {
    this.openUpdateModal(post);
  }

  // Deletes a post with confirmation dialog
  deletePost(postId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Post',
        message: 'Are you sure you want to delete this post? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isDeletingPost[postId] = true;
        this.cdr.detectChanges();

        const service = this.userRole === 'admin' ? this.adminService : this.playerService;
        const deleteMethod = this.userRole === 'admin' ?
          this.adminService.deleteVideo(postId) :
          this.playerService.deleteVideo(postId);

        deleteMethod.subscribe({
          next: () => {
            this.allVideos = this.allVideos.filter(v => v.id !== postId);
            this.displayedVideos = this.displayedVideos.filter(v => v.id !== postId);

            delete this.isDeletingPost[postId];
            this.toastService.success('Post deleted successfully');
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error(`[DeletePost] Error deleting post ${postId}:`, err);
            delete this.isDeletingPost[postId];

            if (err.status === 404) {
              this.allVideos = this.allVideos.filter(v => v.id !== postId);
              this.displayedVideos = this.displayedVideos.filter(v => v.id !== postId);
              this.toastService.info('Post no longer exists');
            } else {
              this.toastService.error('Failed to delete post');
            }
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  // Completely refreshes all feed data
  refreshFeedData(): void {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    console.log('[refreshFeedData] Forcing complete data refresh');

    this.allVideos = [];
    this.displayedVideos = [];
    this.comments = {};
    this.likes = {};

    this.loading = true;
    this.cdr.detectChanges();

    if (this.userRole === 'player' && this.currentUserId) {
      this.playerService.getVideos().subscribe({
        next: (videos) => {
          console.log('[refreshFeedData] Got player videos:', videos);

          const formattedVideos = videos.map((video: any) => ({
            ...video,
            url: video.url?.startsWith('http') ? video.url : `http://localhost:3000${video.url}`,
            type: video.type || (video.url?.match(/\.(mp4|webm)$/i) ? 'video' : 'image'),
            playerId: this.currentUserId
          }));

          const playerVideos = [...formattedVideos];

          this.playerService.getAllPlayers(1, this.pageSize).subscribe({
            next: (response) => {
              console.log('[refreshFeedData] Got all players:', response);

              this.totalPages = response.pagination.totalPages;
              this.totalPlayers = response.pagination.total;
              this.currentPage = response.pagination.page;

              this.players = response.players.map((player: PlayerProfile) => ({
                ...player,
                videos: player.videos?.map((video: Video) => ({
                  ...video,
                  url: video.url?.startsWith('http') ? video.url : `http://localhost:3000${video.url}`,
                  type: video.type || (video.url?.match(/\.(mp4|webm)$/i) ? 'video' : 'image')
                })) || []
              }));

              this.filteredPlayers = this.players;

              const otherPlayersVideos = this.getAllVideosFromPlayers(this.filteredPlayers)
                .filter(v => v.playerId !== this.currentUserId);

              this.allVideos = [...playerVideos, ...otherPlayersVideos];

              this.initializeDisplayedVideos();

              this.loadCommentsAndLikes();

              this.loading = false;
              this.isRefreshing = false;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('[refreshFeedData] Error loading all players:', err);
              this.toastService.error('Failed to reload feed data');
              this.loading = false;
              this.isRefreshing = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: (err) => {
          console.error('[refreshFeedData] Error loading player videos:', err);
          this.isRefreshing = false;
          this.loadFeed();
        }
      });
    } else {
      this.loadFeed();
    }
  }

  // Resets upload form
  resetUploadForm(): void {
    this.selectedFile = null;
    this.uploadDescription = '';
    this.uploadProgress = 0;
    this.uploadError = null;
  }

  // Resets update form
  resetUpdateForm(): void {
    this.updateFile = null;
    this.updateDescription = '';
    this.updateProgress = 0;
    this.updateError = null;
    this.postBeingUpdated = null;
  }

  // Gets all videos from all players
  private getAllVideosFromPlayers(players: PlayerProfile[]): Video[] {
    const allVideos: Video[] = [];

    players.forEach(player => {
      if (player.videos && player.videos.length > 0) {
        const playerVideos = player.videos.map(video => ({
          ...video,
          playerId: player.id.toString(),
          player_name: player.name
        }));
        allVideos.push(...playerVideos);
      }
    });

    return allVideos.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
}