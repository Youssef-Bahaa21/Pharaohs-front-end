import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DateFormatUtil } from '../../../../core/utils/date-format.util';
import { PlayerProfile, Tryout } from '../../../../core/models/models';
import { ScoutService } from '../../../../core/services/scout/scout.service';
import { firstValueFrom } from 'rxjs';

export interface TryoutDetailsDialogData {
  tryout: Tryout;
}

@Component({
  selector: 'app-tryout-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, DateFormatUtil],
  template: `
    <div class="p-6 max-w-3xl">
      <h2 class="text-2xl font-bold mb-4 text-primary-green">{{ data.tryout.name }}</h2>

      <div class="mb-6 text-white">
        <p class="mb-2"><strong>Location:</strong> {{ data.tryout.location }}</p>
        <p class="mb-2"><strong>Date & Time:</strong> {{ data.tryout.date | dateFormat }}</p>
      </div>

      <h3 class="text-xl font-semibold mb-4 text-white">Invited Players</h3>

      <div *ngIf="isLoading" class="flex justify-center my-4">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-green"></div>
      </div>

      <div *ngIf="!isLoading && invitedPlayers.length === 0" class="text-secondary mb-4">
        No players have been invited to this tryout yet.
      </div>

      <div *ngIf="!isLoading && invitedPlayers.length > 0" class="space-y-4 max-h-96 overflow-y-auto">
        <div *ngFor="let player of invitedPlayers"
             class="bg-input p-4 rounded-lg flex items-center cursor-pointer hover:bg-gray-700 transition-colors"
             (click)="navigateToPlayerProfile(player.id)">
          <div class="flex-shrink-0 mr-4">
            <img
              *ngIf="player.profileImage"
              [src]="player.profileImage" onerror="this.src='profile.png'"
              alt="{{ player.name }}"
              class="w-12 h-12 rounded-full object-cover"
            />
            <div
              *ngIf="!player.profileImage"
              class="w-12 h-12 rounded-full overflow-hidden"
            >
              <img src="profile.png" alt="Default Profile" class="w-full h-full object-cover" />
            </div>
          </div>
          <div class="flex-grow">
            <h4 class="text-white font-medium">{{ player.name }}</h4>
            <p *ngIf="player.position || player.club" class="text-secondary text-sm">
              {{ player.position || 'Unknown position' }}
              <span *ngIf="player.position && player.club"> • </span>
              {{ player.club || '' }}
            </p>
          </div>
          <div class="flex-shrink-0 ml-2 text-primary-green">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      <div class="flex justify-end mt-6">
        <button
          (click)="close()"
          class="px-4 py-2 rounded-lg bg-primary-green text-white hover:bg-primary-green/90 transition-colors">
          Close
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #1a1a1a;
      border-radius: 8px;
      border: 1px solid rgba(34, 197, 94, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }
  `]
})
export class TryoutDetailsDialogComponent implements OnInit {
  invitedPlayers: PlayerProfile[] = [];
  isLoading = true;

  constructor(
    public dialogRef: MatDialogRef<TryoutDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TryoutDetailsDialogData,
    private scoutService: ScoutService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadInvitedPlayers();
  }

  loadInvitedPlayers(): void {
    if (!this.data.tryout.playersInvited || this.data.tryout.playersInvited.length === 0) {
      this.isLoading = false;
      return;
    }

    const playerIds = this.data.tryout.playersInvited;
    // Use Promise.all with firstValueFrom instead of toPromise
    const playerPromises = playerIds.map(id =>
      firstValueFrom(this.scoutService.getPlayerDetails(typeof id === 'string' ? parseInt(id, 10) : id))
    );

    Promise.all(playerPromises)
      .then(players => {
        this.invitedPlayers = players.filter(p => p !== null) as PlayerProfile[];
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error loading invited players:', error);
        this.isLoading = false;
      });
  }

  navigateToPlayerProfile(playerId: number): void {
    this.dialogRef.close();
    this.router.navigate(['/profile', playerId]);
  }

  close(): void {
    this.dialogRef.close();
  }
}
