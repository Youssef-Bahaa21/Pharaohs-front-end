/**
 * Scout Invitations Component
 * 
 * This component handles the management of invitations sent by scouts to players.
 * It allows scouts to view, filter, and cancel invitations.
 */
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Invitation } from '../../../core/models/models';
import { ScoutService } from '../../../core/services/scout/scout.service';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Router, ActivatedRoute } from '@angular/router';
import { DateFormatUtil } from '../../../core/utils/date-format.util';

@Component({
    standalone: true,
    selector: 'app-invitations',
    imports: [CommonModule, FeatureHeaderComponent, MatDialogModule, DateFormatUtil],
    templateUrl: './invitations.component.html',
    styleUrls: ['./invitations.component.css']
})
export class InvitationsComponent implements OnInit {
    // Injected services
    scoutService = inject(ScoutService);
    dialog = inject(MatDialog);
    cdr = inject(ChangeDetectorRef);
    toastService = inject(SimpleToastService);
    router = inject(Router);
    route = inject(ActivatedRoute);

    // Component state
    invitations: Invitation[] = [];
    allInvitations: Invitation[] = [];
    isLoading = true;
    error: string | null = null;
    cancelingInvitations: Set<number> = new Set();

    // Filter properties
    tryoutId: string | null = null;
    tryoutName: string | null = null;

    /**
     * Initializes component and subscribes to query parameters
     */
    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.tryoutId = params['tryout_id'] || null;
            this.loadInvitations();
        });
    }

    /**
     * Loads all invitations and applies filtering if tryoutId is specified
     */
    loadInvitations(): void {
        this.isLoading = true;
        this.error = null;

        this.scoutService.getSentInvitations().subscribe({
            next: (invitations) => {
                this.allInvitations = invitations;

                if (this.tryoutId) {
                    this.invitations = invitations.filter(inv => {
                        const invTryoutId = inv.tryout_id || inv.tryoutId;
                        const match = invTryoutId?.toString() === this.tryoutId?.toString();

                        if (match && !this.tryoutName) {
                            const tryoutNameValue = inv.tryout_name || inv.tryoutName;
                            if (tryoutNameValue) {
                                this.tryoutName = tryoutNameValue;
                            }
                        }

                        return match;
                    });
                } else {
                    this.invitations = invitations;
                }

                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.error = err?.message || 'Failed to load invitations. Please try again.';
                console.error('Error loading invitations:', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    /**
     * Clears the tryout filter and resets to show all invitations
     */
    clearFilter(): void {
        if (!this.tryoutId) return;

        this.tryoutId = null;
        this.tryoutName = null;
        this.invitations = this.allInvitations;
        this.router.navigate([], {
            queryParams: { tryout_id: null },
            queryParamsHandling: 'merge'
        });
    }

    /**
     * Cancels an invitation after confirming with the user
     */
    cancelInvitation(invitation: Invitation): void {
        const invitationId = typeof invitation.invitation_id === 'string'
            ? parseInt(invitation.invitation_id, 10)
            : (invitation.invitation_id || (typeof invitation.id === 'string' ? parseInt(invitation.id, 10) : invitation.id));

        if (!invitationId) {
            this.toastService.error('Unable to identify the invitation to cancel.');
            return;
        }

        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Cancel Invitation',
                message: `Are you sure you want to cancel the invitation to ${invitation.player_name || invitation.playerName || 'this player'}?`,
                confirmText: 'Cancel Invitation',
                cancelText: 'Keep Invitation',
                isDanger: true
            } as ConfirmDialogData
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.cancelingInvitations.add(invitationId);
                this.cdr.detectChanges();

                this.scoutService.cancelInvitation(invitationId).subscribe({
                    next: () => {
                        this.invitations = this.invitations.filter(inv => {
                            const currentId = typeof inv.invitation_id === 'string'
                                ? parseInt(inv.invitation_id, 10)
                                : (inv.invitation_id || (typeof inv.id === 'string' ? parseInt(inv.id, 10) : inv.id));
                            return currentId !== invitationId;
                        });

                        this.toastService.success('Invitation canceled successfully');
                        this.cancelingInvitations.delete(invitationId);
                        this.cdr.detectChanges();
                    },
                    error: (err) => {
                        this.toastService.error(err?.error?.message || 'Failed to cancel invitation');
                        this.cancelingInvitations.delete(invitationId);
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }

    /**
     * Checks if an invitation is currently being canceled
     */
    isCanceling(invitation: Invitation): boolean {
        const invitationId = typeof invitation.invitation_id === 'string'
            ? parseInt(invitation.invitation_id, 10)
            : (invitation.invitation_id || (typeof invitation.id === 'string' ? parseInt(invitation.id, 10) : invitation.id));
        return invitationId ? this.cancelingInvitations.has(invitationId) : false;
    }

    /**
     * Navigates to the tryout details page
     */
    viewTryoutDetails(tryoutId: string | number | undefined): void {
        if (tryoutId) {
            this.router.navigate(['/scout/tryout'], { queryParams: { id: tryoutId } });
        }
    }

    /**
     * Returns CSS classes for displaying invitation status
     */
    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'accepted':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'declined':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'pending':
            default:
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
    }

    /**
     * Parses date value from invitation
     */
    getDateValue(invitation: Invitation): Date | '' {
        const dateValue = invitation.created_at || invitation.createdAt;
        if (!dateValue) return '';

        try {
            return new Date(dateValue);
        } catch (e) {
            console.error('Invalid date format:', dateValue);
            return '';
        }
    }
} 