import { Routes } from '@angular/router';
import { authGuard } from './core/guards/AuthGuard/auth-guard.guard';
import { roleGuard } from './core/guards/RoleGuard/role-guard.guard';
import { FeedResolver } from './core/feed.resolver';
import { PLAYER_ROUTES } from './features/player/player.routes';

export const routes: Routes = [
    // Public routes - accessible without authentication
    {
        path: '',
        loadComponent: () => import('./features/Home/home.component').then(m => m.HomeComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'about',
        loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
    },

    // Authenticated routes - require login
    {
        path: 'feed',
        loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: ['player', 'scout', 'admin'] },
        resolve: { feedData: FeedResolver }
    },
    {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notification-list/notification-list.component').then(m => m.NotificationListComponent),
        canActivate: [authGuard]
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
    },

    // Profile routes
    {
        path: 'profile',
        loadComponent: () => import('./features/player/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuard]
    },
    {
        path: 'profile/:id',
        loadComponent: () => import('./features/player/profile/view-profile/view-profile.component').then(m => m.ViewProfileComponent)
    },

    // Player-specific routes
    {
        path: 'invitations',
        loadComponent: () => import('./features/player/invitations/invitations.component').then(m => m.InvitationsComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'player' }
    },
    {
        path: 'stats',
        loadComponent: () => import('./features/player/stats/manage-stats/manage-stats.component').then(m => m.ManageStatsComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'player' }
    },

    // Scout feature module with child routes
    {
        path: 'scout',
        canActivate: [authGuard, roleGuard],
        data: { role: 'scout' },
        children: [
            {
                path: 'profile',
                loadComponent: () => import('./features/scout/scout-profile/scout-profile.component').then(m => m.ScoutProfileComponent)
            },
            {
                path: 'search',
                loadComponent: () => import('./features/scout/search/search.component').then(m => m.SearchComponent)
            },
            {
                path: 'shortlist',
                loadComponent: () => import('./features/scout/shortlist/shortlist.component').then(m => m.ShortlistComponent)
            },
            {
                path: 'tryout',
                loadComponent: () => import('./features/scout/tryout/tryout.component').then(m => m.TryoutComponent)
            },
            {
                path: 'invitations',
                loadComponent: () => import('./features/scout/invitations/invitations.component').then(m => m.InvitationsComponent)
            }
        ]
    },

    // Admin feature module with child routes
    {
        path: 'admin',
        canActivate: [authGuard, roleGuard],
        data: { role: 'admin' },
        children: [
            {
                path: 'users',
                loadComponent: () => import('./features/admin/users/users.component').then(m => m.UsersComponent)
            },
            {
                path: 'media',
                loadComponent: () => import('./features/admin/admin media/media.component').then(m => m.MediaComponent)
            },
            {
                path: 'logs',
                loadComponent: () => import('./features/admin/logs/logs.component').then(m => m.LogsComponent)
            }
        ]
    },

    // Import player routes from external file
    ...PLAYER_ROUTES,

    // Fallback route for unmatched paths
    { path: '**', redirectTo: '' }
];