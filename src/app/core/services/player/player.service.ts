import { HttpClient, HttpEvent, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, forkJoin } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { PlayerProfile, Invitation, Video, Comment, Tryout, PlayerStats, MediaItem, DashboardData } from '../../models/models';
import { environment } from '../../environments/environments';
import { FileCompressionService } from '../image/file-compression.service';
import { Router } from '@angular/router';

// Create a timeout token for HttpContext
const TIMEOUT_TOKEN = new HttpContextToken<number>(() => 30000); // Default 30s

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private compressionService = inject(FileCompressionService);

  // Use environment variables for API URL
  private baseUrl = `${environment.apiUrl}/player`;

  constructor() {
    console.log('Player Service initialized with baseUrl:', this.baseUrl);
  }

  // Upload media files with progress tracking and compression
  uploadMedia(formData: FormData): Observable<HttpEvent<any>> {
    // Extract the file from the FormData
    const file = formData.get('file') as File;

    if (!file) {
      // If no file is found, proceed with the original FormData
      console.warn('No file found in FormData, skipping compression');
      return this.http.post(`${this.baseUrl}/upload`, formData, {
        reportProgress: true,
        observe: 'events'
      });
    }

    // Check if this is an image or video
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      // If not an image or video, proceed with original FormData
      console.warn('File is not an image or video, skipping compression');
      return this.http.post(`${this.baseUrl}/upload`, formData, {
        reportProgress: true,
        observe: 'events'
      });
    }

    // For large videos, skip compression entirely
    const TEN_MB = 10 * 1024 * 1024; // 10MB in bytes
    if (isVideo && file.size > TEN_MB) {
      console.log(`Large video detected (${(file.size / 1024 / 1024).toFixed(2)}MB). Skipping compression.`);

      // HTTP request with longer timeout for video uploads (90 seconds)
      const ctx = new HttpContext().set(TIMEOUT_TOKEN, 90000);
      return this.http.post(`${this.baseUrl}/upload`, formData, {
        reportProgress: true,
        observe: 'events',
        context: ctx
      });
    }

    // Set compression options based on file type
    const options = isImage
      ? {
        imageQuality: 80,
        imageMaxWidth: 1920,
        imageMaxHeight: 1080,
        imageFormat: 'image/webp' as 'image/webp'
      }
      : {
        videoQuality: 70,
        videoMaxWidth: 1280,
        videoMaxHeight: 720,
        videoFormat: 'video/webm' as 'video/webm'
      };

    // Compress the file
    return from(this.compressionService.compressFile(file, options)).pipe(
      mergeMap(compressedFile => {
        // Create new FormData with the compressed file
        const newFormData = new FormData();

        // Copy all other fields from the original FormData
        for (const pair of (formData as any).entries()) {
          // Skip the original file
          if (pair[0] === 'file') continue;
          newFormData.append(pair[0], pair[1]);
        }

        // Add the compressed file
        newFormData.append('file', compressedFile, compressedFile.name);

        // Send the compressed file with appropriate timeout
        const ctx = isVideo ? new HttpContext().set(TIMEOUT_TOKEN, 90000) : undefined;
        return this.http.post(`${this.baseUrl}/upload`, newFormData, {
          reportProgress: true,
          observe: 'events',
          context: ctx
        });
      })
    );
  }

  // Retrieve video like information
  getVideoLikes(): Observable<{ video_id: string; likeCount: number; likedByUser: number }[]> {
    return this.http.get<{ video_id: string; likeCount: number; likedByUser: number }[]>(`${this.baseUrl}/videos/likes`);
  }

  // Add like to a video
  likeVideo(videoId: string): Observable<{ message: string, likeCount?: number, alreadyLiked?: boolean }> {
    return this.http.post<{ message: string, likeCount?: number, alreadyLiked?: boolean }>(`${this.baseUrl}/videos/like`, { videoId });
  }

  // Remove like from a video
  unlikeVideo(videoId: string): Observable<{ message: string, likeCount?: number, alreadyUnliked?: boolean }> {
    return this.http.delete<{ message: string, likeCount?: number, alreadyUnliked?: boolean }>(`${this.baseUrl}/videos/like/${videoId}`);
  }

  // Post a comment on a video
  addComment(videoId: string, text: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/videos/comment`, { videoId, content: text });
  }

  // Retrieve comments for a specific video
  getComments(videoId: string): Observable<Comment[]> {
    return this.http.get<any[]>(`${this.baseUrl}/videos/comment/${videoId}`).pipe(
      map(comments => {
        return comments.map(comment => ({
          id: comment.id,
          player_id: comment.user_id,
          video_id: videoId,
          text: comment.content,
          created_at: comment.created_at,
          commenter_name: comment.user_name
        } as Comment));
      })
    );
  }

  // Remove a comment
  deleteComment(commentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/videos/comment/${commentId}`);
  }

  // Get player's public profile data
  getPublicProfile(playerId: number): Observable<PlayerProfile> {
    return this.http.get<PlayerProfile>(`${this.baseUrl}/public-profile/${playerId}`);
  }

  // Get current player's profile data
  getProfile(): Observable<PlayerProfile> {
    return this.http.get<PlayerProfile>(`${this.baseUrl}/profile`);
  }

  // Update player profile information
  updateProfile(data: FormData): Observable<{
    message: string;
    profileImage?: string;
    updatedProfile?: Partial<PlayerProfile>;
  }> {
    return this.http.put<{
      message: string;
      profileImage?: string;
      updatedProfile?: Partial<PlayerProfile>;
    }>(`${this.baseUrl}/profile`, data);
  }

  // Retrieve invitations for the player
  getInvitations(): Observable<Invitation[]> {
    return this.http.get<any[]>(`${this.baseUrl}/invitations`).pipe(
      map(invitations => {
        return invitations.map(invite => {
          const formattedInvite: Invitation = {
            invitation_id: invite.invitation_id,
            tryout_name: invite.tryout_name,
            scout_name: invite.scout_name,
            scout_email: invite.scout_email,
            id: String(invite.invitation_id),
            playerId: String(invite.player_id || ''),
            scoutId: invite.scout_id ? String(invite.scout_id) : null,
            scoutName: invite.scout_name,
            scoutProfileImage: invite.scout_profile_image || null,
            location: invite.location,
            date: invite.date,
            status: invite.status,
            tryout_id: invite.tryout_id,
            tryoutId: invite.tryout_id,
            created_at: invite.created_at,
            createdAt: invite.created_at
          };

          // Process scout profile image URL
          if (formattedInvite.scoutProfileImage) {
            formattedInvite.scoutProfileImage = formattedInvite.scoutProfileImage.startsWith('http')
              ? formattedInvite.scoutProfileImage
              : `${environment.apiUrl}${formattedInvite.scoutProfileImage}`;
          }

          return formattedInvite;
        });
      })
    );
  }

  // Update invitation status (accept/decline)
  updateInvitationStatus(invitationId: number, status: 'accepted' | 'declined'): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/invitations/${invitationId}`, { status });
  }

  // Get player's videos
  getVideos(): Observable<Video[]> {
    return this.http.get<Video[]>(`${this.baseUrl}/videos`);
  }

  // Get all players with filtering and pagination
  getAllPlayers(page: number = 1, limit: number = 20, queryParams: string = '', filters?: {
    club?: string,
    position?: string,
    search?: string,
    minRating?: string
  }): Observable<{
    players: PlayerProfile[],
    pagination: {
      total: number,
      page: number,
      limit: number,
      totalPages: number
    }
  }> {
    let url = `${this.baseUrl}/all?page=${page}&limit=${limit}`;

    if (filters) {
      if (filters.club) {
        url += `&club=${encodeURIComponent(filters.club)}`;
      }
      if (filters.position) {
        url += `&position=${encodeURIComponent(filters.position)}`;
      }
      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }
      if (filters.minRating) {
        url += `&minRating=${encodeURIComponent(filters.minRating)}`;
      }
    }
    else if (queryParams && queryParams.trim() !== '') {
      if (!queryParams.startsWith('page=') && !queryParams.startsWith('limit=')) {
        url += `&${queryParams}`;
      }
    }

    return this.http.get<{
      players: PlayerProfile[],
      pagination: {
        total: number,
        page: number,
        limit: number,
        totalPages: number
      }
    }>(url).pipe(
      map(response => {
        // Map player data
        const mappedPlayers = response.players.map(player => ({
          ...player,
          videos: player.videos?.map(video => {
            const fullUrl = video.url?.startsWith('http') ? video.url : `${environment.apiUrl}${video.url}`;
            return {
              ...video,
              url: fullUrl,
              type: video.type || (video.url?.match(/\.(mp4|webm)$/i) ? 'video' : 'image')
            };
          }) || []
        }));

        // Return mapped data with pagination info
        return {
          players: mappedPlayers,
          pagination: response.pagination
        };
      })
    );
  }

  // Get dashboard summary data
  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.baseUrl}/dashboard`);
  }

  // Create a new tryout event
  createTryout(data: { name: string; location: string; date: string }): Observable<{ message: string; tryoutId: number }> {
    return this.http.post<{ message: string; tryoutId: number }>(`${this.baseUrl}/tryouts`, data);
  }

  // Get all tryouts
  getTryouts(): Observable<Tryout[]> {
    return this.http.get<Tryout[]>(`${this.baseUrl}/tryouts`);
  }

  // Send tryout invitation to a player
  sendInvitation(data: { tryoutId: number; playerId: number }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/invitations/send`, data);
  }

  // Delete a video
  deleteVideo(videoId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/videos/${videoId}`);
  }

  // Get player statistics and counts
  getPlayerStats(): Observable<{
    mediaCount: number,
    invitationCount: number,
    pendingCount: number,
    performanceStats?: PlayerStats
  }> {
    return this.http.get<{
      mediaCount: number,
      invitationCount: number,
      pendingCount: number,
      performanceStats?: PlayerStats
    }>(`${this.baseUrl}/stats`);
  }

  // Update player performance statistics
  updatePerformanceStats(stats: PlayerStats): Observable<{ message: string, stats: PlayerStats }> {
    return this.http.post<{ message: string, stats: PlayerStats }>(`${this.baseUrl}/performance-stats`, stats);
  }

  // Get filter options for player search
  getFilterOptions(): Observable<{
    positions: string[],
    clubs: string[],
    ageRange: {
      minAge: number,
      maxAge: number
    }
  }> {
    return this.http.get<{
      positions: string[],
      clubs: string[],
      ageRange: {
        minAge: number,
        maxAge: number
      }
    }>(`${this.baseUrl}/filter-options`);
  }

  // Get scout invitations
  getScoutInvitations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/scout-invitations`);
  }

  // Update video metadata
  updateVideo(videoId: string, description: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/videos/${videoId}`, { description });
  }

  // Remove profile picture
  deleteProfilePicture(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/profile/picture`);
  }
}