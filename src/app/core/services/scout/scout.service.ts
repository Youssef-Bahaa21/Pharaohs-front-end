import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Invitation, PlayerProfile, ScoutProfile, Tryout, SearchFilters, SearchResponse, FilterOptions } from '../../models/models';
import { environment } from '../../environments/environments';
import { FileCompressionService } from '../image/file-compression.service';

@Injectable({ providedIn: 'root' })
export class ScoutService {
  private http = inject(HttpClient);
  private compressionService = inject(FileCompressionService);

  // Use direct Railway URL in production, local API in development
  private baseUrl = environment.production ?
    'https://pharaoh-s-backend.railway.app/api/scout' :
    `${environment.apiUrl}/scout`;

  constructor() {
    console.log('Scout Service initialized with baseUrl:', this.baseUrl);
  }

  // Search for players with specified filters
  searchPlayers(filters: SearchFilters): Observable<SearchResponse> {
    let params = new HttpParams();

    // Add all filters to params
    if (filters.name) params = params.set('name', filters.name);
    if (filters.position) params = params.set('position', filters.position);
    if (filters.club) params = params.set('club', filters.club);
    if (filters.minAge !== undefined && filters.minAge !== null) params = params.set('minAge', filters.minAge.toString());
    if (filters.maxAge !== undefined && filters.maxAge !== null) params = params.set('maxAge', filters.maxAge.toString());
    if (filters.hasVideos !== undefined) params = params.set('hasVideos', filters.hasVideos.toString());
    if (filters.minRating !== undefined && filters.minRating !== null) params = params.set('minRating', filters.minRating.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<SearchResponse>(`${this.baseUrl}/search`, { params });
  }

  // Retrieve available filter options for player search
  getFilterOptions(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(`${this.baseUrl}/filter-options`);
  }

  // Get available tryout locations
  getLocations(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/locations`);
  }

  // Get scout profile information
  getProfile(): Observable<ScoutProfile> {
    return this.http.get<ScoutProfile>(`${this.baseUrl}/profile`).pipe(
      map(profile => ({
        ...profile,
        profileImage: profile.profileImage ?
          (profile.profileImage.startsWith('http') ? profile.profileImage : `${environment.apiUrl}${profile.profileImage}`) :
          'assets/images/profile.png'
      }))
    );
  }

  // Update scout profile details
  updateProfile(profileData: Partial<ScoutProfile>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/profile`, profileData);
  }

  // Upload scout profile picture with compression
  uploadProfileImage(file: File): Observable<any> {
    // Only proceed with compression if it's an image
    if (file && file.type.startsWith('image/')) {
      const options = {
        imageQuality: 80,
        imageMaxWidth: 800,  // Profile pictures don't need to be larger than this
        imageMaxHeight: 800,
        imageFormat: 'image/webp' as 'image/webp'
      };

      // Compress the image before uploading
      return this.compressionService.compressFile(file, options).pipe(
        mergeMap(compressedFile => {
          console.log(`Profile image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);

          const formData = new FormData();
          formData.append('profileImage', compressedFile);
          formData.append('updateType', 'profileImageOnly');

          return this.http.put<any>(`${this.baseUrl}/profile`, formData).pipe(
            map(response => {
              if (response && response.scout && response.scout.profileImage) {
                return {
                  ...response,
                  profileImage: response.scout.profileImage.startsWith('http')
                    ? response.scout.profileImage
                    : `${environment.apiUrl}${response.scout.profileImage}`
                };
              }
              return response;
            })
          );
        })
      );
    } else {
      // If not an image or compression fails, proceed with original file
      const formData = new FormData();
      formData.append('profileImage', file);
      formData.append('updateType', 'profileImageOnly');

      return this.http.put<any>(`${this.baseUrl}/profile`, formData).pipe(
        map(response => {
          if (response && response.scout && response.scout.profileImage) {
            return {
              ...response,
              profileImage: response.scout.profileImage.startsWith('http')
                ? response.scout.profileImage
                : `${environment.apiUrl}${response.scout.profileImage}`
            };
          }
          return response;
        })
      );
    }
  }

  // Remove scout profile picture
  deleteProfileImage(): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/profile/picture`);
  }

  // Add player to scout's shortlist
  addToShortlist(playerId: number) {
    return this.http.post(`${this.baseUrl}/shortlist`, { player_id: playerId });
  }

  // Remove player from scout's shortlist
  removeFromShortlist(playerId: number) {
    return this.http.delete(`${this.baseUrl}/shortlist/${playerId}`);
  }

  // Send tryout invitation to player
  invitePlayer(tryoutId: number, playerId: number): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.baseUrl}/invite`, {
      tryout_id: tryoutId,
      player_id: playerId
    });
  }

  // Get scout's shortlisted players
  getShortlist(): Observable<PlayerProfile[]> {
    return this.http.get<PlayerProfile[]>(`${this.baseUrl}/shortlist`).pipe(
      map(players => players.map(player => ({
        ...player,
        profileImage: player.profileImage ?
          (player.profileImage.startsWith('http') ? player.profileImage : `${environment.apiUrl}${player.profileImage}`) :
          null
      })))
    );
  }

  // Get tryouts created by scout
  getTryouts(): Observable<Tryout[]> {
    return this.http.get<Tryout[]>(`${this.baseUrl}/tryouts`);
  }

  // Create new tryout event
  createTryout(data: Tryout): Observable<Tryout> {
    return this.http.post<Tryout>(`${this.baseUrl}/tryouts`, {
      ...data,
      time: data.time
    });
  }

  // Update existing tryout details
  updateTryout(tryoutId: string, data: Tryout): Observable<Tryout> {
    return this.http.put<Tryout>(`${this.baseUrl}/tryouts/${tryoutId}`, {
      ...data,
      time: data.time
    });
  }

  // Delete a tryout event
  deleteTryout(tryoutId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tryouts/${tryoutId}`);
  }

  // Get detailed player information
  getPlayerDetails(playerId: number): Observable<PlayerProfile> {
    return this.http.get<PlayerProfile>(`${environment.apiUrl}/player/public-profile/${playerId}`).pipe(
      map(player => ({
        ...player,
        profileImage: player.profileImage ?
          (player.profileImage.startsWith('http') ? player.profileImage : `${environment.apiUrl}${player.profileImage}`) :
          null
      }))
    );
  }

  // Get all invitations sent by the scout
  getSentInvitations(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${environment.apiUrl}/player/scout-invitations`);
  }

  // Cancel a previously sent invitation
  cancelInvitation(invitationId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/invitations/${invitationId}`);
  }

  // Get public profile of another scout
  getScoutPublicProfile(scoutId: number): Observable<ScoutProfile> {
    return this.http.get<ScoutProfile>(`${environment.apiUrl}/scout/public-profile/${scoutId}`).pipe(
      map(profile => ({
        ...profile,
        profileImage: profile.profileImage ?
          (profile.profileImage.startsWith('http') ? profile.profileImage : `${environment.apiUrl}${profile.profileImage}`) :
          null
      }))
    );
  }

  // Get public tryouts of another scout
  getScoutPublicTryouts(scoutId: number): Observable<Tryout[]> {
    return this.http.get<Tryout[]>(`${environment.apiUrl}/scout/public-tryouts/${scoutId}`);
  }
}
