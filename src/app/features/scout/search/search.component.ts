/**
 * Scout Search Component
 * 
 * Provides advanced search functionality for scouts to find and interact with players
 * including filtering, shortlisting, and inviting to tryouts.
 */
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ScoutService, } from '../../../core/services/scout/scout.service';
import { FilterOptions, PlayerProfile, SearchFilters, Tryout, Video } from '../../../core/models/models';
import { LazyLoadImageDirective } from '../../../shared/directives/lazy-load-image.directive';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PlayerService } from '../../../core/services/player/player.service';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { VideoPlayerComponent } from '../../../shared/components/video-player/video-player.component';

// Add Math to component scope
declare global {
  interface Window {
    Math: typeof Math;
  }
}

@Component({
  standalone: true,
  selector: 'app-scout-search',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe, LazyLoadImageDirective, FeatureHeaderComponent, VideoPlayerComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  scoutService = inject(ScoutService);
  fb = inject(FormBuilder);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  authService = inject(AuthService);
  playerService = inject(PlayerService);
  toastService = inject(SimpleToastService);
  Math = Math; // Make Math available to the template

  // Player lists
  invitedPlayers = new Set<number>();
  shortlistedPlayers = new Set<number>();

  // User profile info
  userRole: string = '';
  currentUserInitial: string = 'U';
  currentUserProfileImage: string | null = null;
  currentUserId: string = '';

  // Search results
  players: PlayerProfile[] = [];
  tryouts: Tryout[] = [];
  selectedTryoutId: number | null = null;

  // Video player modal
  showVideoModal = false;
  selectedMedia: Video | null = null;

  // Tryout invitation modal
  showTryoutSelector = false;
  currentInvitingPlayerId: number | null = null;
  tryoutForInvite: Tryout | null = null;
  isLoadingTryouts = false;

  // Player-Tryout mapping (which players are invited to which tryouts)
  playerTryoutMap: Map<number, Set<string | number>> = new Map();

  // Action messages for player operations
  actionMessages: Map<number, { message: string, isError: boolean, timestamp: number }> = new Map();

  // Filter options
  filterOptions: FilterOptions = {
    positions: [],
    clubs: [],
    ageRange: { minAge: 15, maxAge: 40 }
  };

  // Loading state for filter options
  isLoadingFilterOptions = false;

  // Age dropdown options
  ageOptions: number[] = [];

  // Pagination
  pagination = {
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  };

  // UI state
  isLoading = false;
  showFilters = false;
  sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'age', label: 'Age' },
    { value: 'position', label: 'Position' },
    { value: 'club', label: 'Club' },
    { value: 'videoCount', label: 'Video Count' }
  ];

  // Form for filters
  filterForm: FormGroup = this.fb.group({
    name: [''],
    position: [''],
    club: [''],
    minAge: [null],
    maxAge: [null],
    hasVideos: [false],
    minRating: [null],
    sortBy: ['name'],
    sortOrder: ['asc']
  });

  /**
   * Initialize component, load user info, shortlist, tryouts and filter options
   */
  ngOnInit(): void {
    this.getCurrentUserInfo();

    this.scoutService.getShortlist().subscribe({
      next: (players: PlayerProfile[]) => {
        this.shortlistedPlayers = new Set(players.map(p => p.id));
      },
      error: (err) => {
        console.error('Failed to load shortlist:', err);
        this.toastService.error('Failed to load shortlist');
      }
    });

    this.loadTryouts();
    this.loadFilterOptions();
  }

  /**
   * Get current user information from auth service
   */
  getCurrentUserInfo(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userRole = user.role;
      this.currentUserInitial = user.name.charAt(0).toUpperCase();
      this.currentUserId = user.id.toString();

      this.loadCurrentUserProfileImage();
    }
  }

  /**
   * Load profile image for current user
   */
  loadCurrentUserProfileImage(): void {
    if (this.userRole === 'player' && this.currentUserId) {
      const userId = parseInt(this.currentUserId, 10);

      this.scoutService.getPlayerDetails(userId).subscribe({
        next: (profile: PlayerProfile) => {
          if (profile && profile.profileImage) {
            console.log('Current user profile image from getPlayerDetails:', profile.profileImage);
            this.currentUserProfileImage = profile.profileImage;
          }
          this.cdr.detectChanges();
        },
        error: (err: unknown) => {
          console.error('[LoadCurrentUserProfileImage] Error loading profile image:', err);

          this.playerService.getPublicProfile(userId).subscribe({
            next: (profile: PlayerProfile) => {
              if (profile && profile.profileImage) {
                console.log('Fallback - Original current user profile image:', profile.profileImage);
                this.currentUserProfileImage = profile.profileImage.startsWith('http') ?
                  profile.profileImage : `http://localhost:3000${profile.profileImage}`;
                console.log('Fallback - Processed current user profile image:', this.currentUserProfileImage);
              }
              this.cdr.detectChanges();
            },
            error: (err: unknown) => {
              console.error('[LoadCurrentUserProfileImage] Fallback also failed:', err);
            }
          });
        }
      });
    } else if (this.userRole === 'scout') {
      // Scout profile image handling would go here
    }
  }

  /**
   * Load tryouts and map players to the tryouts they're invited to
   */
  loadTryouts(): void {
    this.isLoadingTryouts = true;
    this.scoutService.getTryouts().subscribe({
      next: (tryouts: Tryout[]) => {
        this.tryouts = tryouts;
        this.isLoadingTryouts = false;

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
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load tryouts:', err);
        this.toastService.error('Failed to load tryouts');
        this.isLoadingTryouts = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Open video player modal with selected media
   */
  openVideoPlayer(video: Video): void {
    this.selectedMedia = video;
    this.showVideoModal = true;
    this.cdr.detectChanges();
  }

  /**
   * Close video player modal
   */
  closeVideoModal(): void {
    this.showVideoModal = false;
    this.selectedMedia = null;
    this.cdr.detectChanges();
  }

  /**
   * Handle video player error
   */
  handleVideoError(event: any): void {
    console.error('Video error:', event);
    this.toastService.error('Failed to load video. Please try again later.');
  }

  /**
   * Video player event handler for play event
   */
  onVideoPlay(): void {
    console.log('Video started playing');
  }

  /**
   * Video player event handler for pause event
   */
  onVideoPause(): void {
    console.log('Video paused');
  }

  /**
   * Video player event handler for ended event
   */
  onVideoEnded(): void {
    console.log('Video ended');
  }

  /**
   * Invite player to a tryout event
   */
  invitePlayer(playerId: number): void {
    if (!this.selectedTryoutId) {
      this.showTryoutSelector = true;
      this.currentInvitingPlayerId = playerId;
      this.cdr.detectChanges();
      return;
    }

    this.invitedPlayers.add(playerId);
    this.setActionMessage(playerId, 'Sending invitation...', false);
    this.cdr.detectChanges();

    this.scoutService.invitePlayer(this.selectedTryoutId, playerId).subscribe({
      next: () => {
        this.setActionMessage(playerId, 'Player invited successfully', false);

        if (!this.playerTryoutMap.has(playerId)) {
          this.playerTryoutMap.set(playerId, new Set());
        }
        this.playerTryoutMap.get(playerId)?.add(this.selectedTryoutId!);

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.invitedPlayers.delete(playerId);
        this.setActionMessage(playerId, err.error?.message || 'Failed to invite player', true);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Confirm and process player invitation
   */
  confirmInvite(): void {
    if (!this.selectedTryoutId || !this.currentInvitingPlayerId) {
      this.setActionMessage(this.currentInvitingPlayerId!, 'Please select a tryout first', true);
      return;
    }

    const tryoutId = typeof this.selectedTryoutId === 'string'
      ? parseInt(this.selectedTryoutId, 10)
      : this.selectedTryoutId;
    const playerId = this.currentInvitingPlayerId;

    this.invitedPlayers.add(playerId);

    if (!this.playerTryoutMap.has(playerId)) {
      this.playerTryoutMap.set(playerId, new Set());
    }
    this.playerTryoutMap.get(playerId)?.add(tryoutId);

    this.showTryoutSelector = false;
    this.cdr.detectChanges();

    this.scoutService.invitePlayer(tryoutId, playerId).subscribe({
      next: () => {
        this.setActionMessage(playerId, 'Player invited successfully!', false);
      },
      error: (err) => {
        this.playerTryoutMap.get(playerId)?.delete(tryoutId);
        if (this.playerTryoutMap.get(playerId)?.size === 0) {
          this.invitedPlayers.delete(playerId);
        }
        this.setActionMessage(playerId, err.error?.message || 'Failed to invite player', true);
        this.cdr.detectChanges();
      }
    });

    this.currentInvitingPlayerId = null;
    this.selectedTryoutId = null;
  }

  /**
   * Close tryout selector modal
   */
  closeTryoutSelector(): void {
    this.showTryoutSelector = false;
    this.currentInvitingPlayerId = null;
    this.cdr.detectChanges();
  }

  /**
   * Check if a player is already invited to a specific tryout
   */
  isInvitedToTryout(playerId: number, tryoutId: string | number): boolean {
    if (!this.playerTryoutMap.has(playerId)) {
      return false;
    }
    return this.playerTryoutMap.get(playerId)?.has(tryoutId) || false;
  }

  /**
   * Check if a player is shortlisted
   */
  isShortlisted(playerId: string | number): boolean {
    const id = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;
    return this.shortlistedPlayers.has(id);
  }

  /**
   * Get action message for a player
   */
  getActionMessage(playerId: number): { message: string, isError: boolean } | null {
    const message = this.actionMessages.get(playerId);
    if (!message) return null;

    if (Date.now() - message.timestamp > 3000) {
      return null;
    }

    return { message: message.message, isError: message.isError };
  }

  /**
   * Set action message for a player with auto-clearing timeout
   */
  setActionMessage(playerId: number, message: string, isError: boolean): void {
    this.actionMessages.set(playerId, { message, isError, timestamp: Date.now() });
    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.actionMessages.get(playerId)?.timestamp === Date.now()) {
        this.actionMessages.delete(playerId);
        this.cdr.detectChanges();
      }
    }, 3000);
  }

  /**
   * Toggle visibility of advanced filters
   */
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  /**
   * Reset all search filters to default values
   */
  resetFilters(): void {
    this.filterForm.reset({
      name: '',
      position: '',
      club: '',
      minAge: null,
      maxAge: null,
      hasVideos: false,
      minRating: null,
      sortBy: 'name',
      sortOrder: 'asc'
    });
    this.search();
  }

  /**
   * Perform search with current filter values
   */
  search(resetPagination: boolean = true): void {
    this.isLoading = true;

    if (resetPagination) {
      this.pagination.offset = 0;
    }

    const filters: SearchFilters = {
      name: this.filterForm.value.name || '',
      position: this.filterForm.value.position || '',
      club: this.filterForm.value.club || '',
      minAge: this.filterForm.value.minAge,
      maxAge: this.filterForm.value.maxAge,
      hasVideos: this.filterForm.value.hasVideos,
      minRating: this.filterForm.value.minRating,
      sortBy: this.filterForm.value.sortBy,
      sortOrder: this.filterForm.value.sortOrder,
      limit: this.pagination.limit,
      offset: this.pagination.offset
    };

    this.scoutService.searchPlayers(filters).subscribe({
      next: (response) => {
        this.players = response.players.map(player => ({
          ...player,
          videos: player.videos ? player.videos.map(video => ({
            ...video,
            url: video.url.startsWith('http') ? video.url : `http://localhost:3000${video.url}`
          })) : []
        }));

        this.players.forEach((player, index) => {
          if (player.id) {
            this.scoutService.getPlayerDetails(player.id).subscribe({
              next: (detailedPlayer) => {
                console.log(`Player ${player.id} detailed profile image:`, detailedPlayer.profileImage);
                this.players[index].profileImage = detailedPlayer.profileImage;
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error(`Failed to get details for player ${player.id}:`, err);
              }
            });
          }
        });

        this.pagination.total = response.pagination.total;
        this.pagination.hasMore = this.pagination.offset + this.pagination.limit < this.pagination.total;

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Search failed:', err);
        this.toastService.error('Failed to search players');
        this.isLoading = false;
        this.players = [];
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Add player to shortlist
   */
  addToShortlist(playerId: number): void {
    if (this.shortlistedPlayers.has(playerId)) {
      return;
    }

    this.shortlistedPlayers.add(playerId);
    this.cdr.detectChanges();

    this.scoutService.addToShortlist(playerId).subscribe({
      next: () => {
        this.setActionMessage(playerId, 'Added to shortlist', false);
      },
      error: (err) => {
        this.shortlistedPlayers.delete(playerId);
        this.setActionMessage(playerId, err.error?.message || 'Failed to shortlist player', true);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Remove player from shortlist
   */
  removeFromShortlist(playerId: number): void {
    this.shortlistedPlayers.delete(playerId);
    this.cdr.detectChanges();

    this.scoutService.removeFromShortlist(playerId).subscribe({
      next: () => {
        this.setActionMessage(playerId, 'Removed from shortlist', false);
      },
      error: (err) => {
        this.shortlistedPlayers.add(playerId);
        this.setActionMessage(playerId, err.error?.message || 'Failed to remove from shortlist', true);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Navigate to next page of search results
   */
  nextPage(): void {
    if (this.pagination.hasMore) {
      this.pagination.offset += this.pagination.limit;
      this.search(false);
    }
  }

  /**
   * Navigate to previous page of search results
   */
  prevPage(): void {
    if (this.pagination.offset > 0) {
      this.pagination.offset = Math.max(0, this.pagination.offset - this.pagination.limit);
      this.search(false);
    }
  }

  /**
   * Get current page number
   */
  get currentPage(): number {
    return Math.floor(this.pagination.offset / this.pagination.limit) + 1;
  }

  /**
   * Get total number of pages
   */
  get totalPages(): number {
    return Math.ceil(this.pagination.total / this.pagination.limit);
  }

  /**
   * Navigate to player profile page
   */
  viewPlayerProfile(playerId: number): void {
    this.router.navigate(['/profile', playerId]);
  }

  /**
   * Load filter options from the server
   */
  loadFilterOptions(): void {
    this.isLoadingFilterOptions = true;
    this.scoutService.getFilterOptions().subscribe({
      next: (options) => {
        this.filterOptions = options;

        this.ageOptions = [];
        for (let i = options.ageRange.minAge; i <= options.ageRange.maxAge; i++) {
          this.ageOptions.push(i);
        }

        this.isLoadingFilterOptions = false;
        this.cdr.detectChanges();

        this.search();
      },
      error: (err) => {
        console.error('Failed to load filter options:', err);
        this.toastService.error('Failed to load filter options');
        this.isLoadingFilterOptions = false;
        this.search();
      }
    });
  }

  /**
   * Handle image load error for search results
   */
  handleImageErrorSearch(event: Event): void {
    const img = event.target as HTMLImageElement;
    console.error('Image failed to load:', img.src);
    if (img) {
      img.src = 'profile.png';
      console.log('Set fallback image to profile.png');
    }
  }

  /**
   * Format profile image URL to ensure proper format
   */
  processProfileImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `http://localhost:3000${url}`;
  }
}
