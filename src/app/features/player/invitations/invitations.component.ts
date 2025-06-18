import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Invitation } from '../../../core/models/models';
import { PlayerService } from '../../../core/services/player/player.service';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './invitations.component.html'
})
export class InvitationsComponent implements OnInit {
  private playerService = inject(PlayerService);
  private toastService = inject(SimpleToastService);
  invitations: Invitation[] = [];
  isLoading = true;
  error: string | null = null;
  defaultProfileImage = '/profile2.png';

  ngOnInit(): void {
    this.loadInvitations();
  }

  // Updates the status of an invitation (accept/decline)
  updateInvitationStatus(invitationId: number, status: 'accepted' | 'declined'): void {
    this.playerService.updateInvitationStatus(invitationId, status).subscribe({
      next: () => this.loadInvitations(),
      error: (err) => this.toastService.error(err?.message || 'Failed to update invitation status')
    });
  }

  // Validates if the invitation has a usable scout ID for profile navigation
  hasValidScoutId(invite: Invitation): boolean {
    return !!(invite.scoutId &&
      invite.scoutId !== 'null' &&
      invite.scoutId !== 'undefined' &&
      invite.scoutId.trim() !== '');
  }

  // Fetches and processes invitations from the API
  private loadInvitations(): void {
    this.isLoading = true;
    this.playerService.getInvitations().subscribe({
      next: (data: Invitation[]) => {

        this.invitations = data.map(invite => {
          const sourceScoutId = invite.scout_id !== undefined ? invite.scout_id :
            (invite.scoutId !== undefined ? invite.scoutId : null);

          const finalScoutId = sourceScoutId !== null && sourceScoutId !== undefined ?
            String(sourceScoutId) : null;

          // Process scout profile image
          if (invite.scoutProfileImage) {
            invite.scoutProfileImage = invite.scoutProfileImage.startsWith('http')
              ? invite.scoutProfileImage
              : `http://localhost:3000${invite.scoutProfileImage}`;
          }


          return {
            ...invite,
            scoutName: invite.scoutName || invite.scout_name || 'Unknown Scout',
            scoutId: finalScoutId
          };
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load invitations';
        this.isLoading = false;
        this.toastService.error('Error loading invitations');
      }
    });
  }
}
