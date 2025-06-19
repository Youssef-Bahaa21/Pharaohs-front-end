/**
 * Scout Shortlist Component
 * 
 * Displays and manages players shortlisted by scouts for potential recruitment
 * and provides actions to view profiles or remove players from the shortlist.
 */
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoutService } from '../../../core/services/scout/scout.service';
import { PlayerProfile, PlayerStats } from '../../../core/models/models';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DateFormatUtil } from '../../../core/utils/date-format.util';
import { HttpClient } from '@angular/common/http';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../core/environments/environments';

@Component({
  standalone: true,
  selector: 'app-scout-shortlist',
  imports: [CommonModule, DateFormatUtil, FeatureHeaderComponent, MatDialogModule],
  templateUrl: './shortlist.component.html',
  styleUrls: ['./shortlist.component.css']
})
export class ShortlistComponent implements OnInit {
  scoutService = inject(ScoutService);
  router = inject(Router);
  sanitizer = inject(DomSanitizer);
  httpClient = inject(HttpClient);
  toastService = inject(SimpleToastService);
  dialog = inject(MatDialog);

  shortlist: PlayerProfile[] = [];
  isLoading = false;
  error: string | null = null;
  removingPlayer: { [key: number]: boolean } = {};

  ngOnInit(): void {
    this.loadShortlist();
  }

  /**
   * Load shortlisted players and their detailed information
   */
  loadShortlist(): void {
    this.isLoading = true;
    this.error = null;

    this.scoutService.getShortlist().subscribe({
      next: (shortlistedPlayers) => {

        if (!shortlistedPlayers || shortlistedPlayers.length === 0) {
          this.shortlist = [];
          this.isLoading = false;
          return;
        }

        const enhancedPlayers = shortlistedPlayers.map(player => {
          const playerWithId = player as PlayerProfile & { player_id: number };
          playerWithId.id = playerWithId.player_id;

          if (playerWithId.profileImage && !playerWithId.profileImage.startsWith('http')) {
            playerWithId.profileImage = `${environment.baseUrl}${playerWithId.profileImage}`;
          }

          if (!playerWithId.stats) {
            playerWithId.stats = {
              matches_played: 0,
              goals: 0,
              assists: 0,
              yellow_cards: 0,
              red_cards: 0
            };
          }

          return playerWithId;
        });

        this.shortlist = enhancedPlayers;
        this.isLoading = false;

        this.loadDetailedPlayerInfo();
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load shortlist. Please try again.';
        console.error("Shortlist loading error:", err);
        this.isLoading = false;
      }
    });
  }

  /**
   * Load detailed information for each player in the shortlist
   */
  loadDetailedPlayerInfo(): void {
    this.shortlist.forEach((player, index) => {
      if (player.id) {
        this.httpClient.get<PlayerProfile>(`${environment.apiUrl}/player/public-profile/${player.id}`).subscribe({
          next: (detailedProfile) => {
            console.log(`Detailed profile for player ${player.id}:`, detailedProfile);

            this.shortlist[index] = {
              ...player,
              ...detailedProfile,
              profileImage: detailedProfile.profileImage ?
                (detailedProfile.profileImage.startsWith('http') ?
                  detailedProfile.profileImage :
                  `${environment.baseUrl}${detailedProfile.profileImage}`) :
                player.profileImage
            };
          },
          error: (err) => {
            console.error(`Failed to load detailed profile for player ${player.id}:`, err);
          }
        });
      }
    });
  }

  /**
   * Navigate to player profile page
   */
  goToPlayerProfile(playerId: number): void {
    if (!playerId) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    console.log("Navigating to player profile:", playerId);
    this.router.navigate(['/profile', playerId]);
  }

  /**
   * Sanitize URL for security
   */
  sanitizeUrl(url: string): SafeResourceUrl {
    if (!url) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Get simplified position category from detailed position
   */
  getPositionCategory(position: string): string {
    if (!position) return 'Unknown';

    const pos = position.toLowerCase();
    if (pos.includes('forward') || pos.includes('striker') || pos.includes('winger')) {
      return 'Forward';
    } else if (pos.includes('midfield')) {
      return 'Midfielder';
    } else if (pos.includes('defender') || pos.includes('back')) {
      return 'Defender';
    } else if (pos.includes('keeper') || pos.includes('goalie')) {
      return 'Goalkeeper';
    }
    return position;
  }

  /**
   * Handle image load error
   */
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/images/placeholder.svg';
      img.classList.add('p-2');
    }
  }

  /**
   * Remove player from shortlist with confirmation
   */
  removeFromShortlist(event: Event, playerId: number): void {
    event.stopPropagation();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove from Shortlist',
        message: 'Are you sure you want to remove this player from your shortlist?',
        confirmText: 'Remove',
        cancelText: 'Cancel',
        isDanger: true
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removingPlayer[playerId] = true;

        this.scoutService.removeFromShortlist(playerId).subscribe({
          next: () => {
            this.shortlist = this.shortlist.filter(p => p.id !== playerId);
            this.toastService.success('Player removed from shortlist');
            this.removingPlayer[playerId] = false;
          },
          error: (err) => {
            this.toastService.error(err?.error?.message || 'Failed to remove player from shortlist');
            this.removingPlayer[playerId] = false;
          }
        });
      }
    });
  }

  /**
   * Handle click on player card
   */
  playerCardClick(playerId: number): void {
    this.goToPlayerProfile(playerId);
  }
}
