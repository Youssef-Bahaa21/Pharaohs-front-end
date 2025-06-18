import { Routes } from '@angular/router';

/**
 * Player module route configuration
 * Defines routes for player profile, invitations, and scout view pages
 */
export const PLAYER_ROUTES: Routes = [
    {
        path: 'player',
        children: [
            {
                path: 'profile',
                loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
            },
            {
                path: 'invitations',
                loadComponent: () => import('./invitations/invitations.component').then(m => m.InvitationsComponent),
            },
            {
                path: 'scout/:id',
                loadComponent: () => import('./scout-view-profile/scout-view-profile.component').then(m => m.ScoutViewProfileComponent),
            }
        ]
    }
]; 