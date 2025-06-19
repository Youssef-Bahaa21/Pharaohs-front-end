import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { User, PlayerProfile, ScoutProfile } from '../../../core/models/models';
import { PlayerService } from '../../../core/services/player/player.service';
import { ScoutService } from '../../../core/services/scout/scout.service';
import { Subscription, of } from 'rxjs';
import { filter, switchMap, catchError, tap } from 'rxjs/operators';
import { NotificationBellComponent } from '../../notification-bell/notification-bell.component';
import { environment } from '../../../core/environments/environments';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterModule, RouterLink, NotificationBellComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private playerService = inject(PlayerService);
  private scoutService = inject(ScoutService);

  currentUser: User | null = null;
  isLoggedIn: boolean = false;
  userRole: string = '';
  userName: string = '';
  userProfileImage: string | null = null;
  isMobileMenuOpen: boolean = false;
  private userSubscription: Subscription | undefined;
  private playerProfileSubscription: Subscription | undefined;
  private scoutProfileSubscription: Subscription | undefined;
  private routerSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
      this.userRole = user?.role || '';
      this.userName = user?.name || '';
      this.userProfileImage = null;

      if (user && user.role === 'player') {
        this.playerProfileSubscription?.unsubscribe();

        this.playerProfileSubscription = this.playerService.getProfile().pipe(
          catchError(error => {
            console.error('Header: Error fetching player profile for image:', error);
            return of(null);
          })
        ).subscribe((playerProfile: PlayerProfile | null) => {
          if (playerProfile && playerProfile.profileImage) {
            this.userProfileImage = playerProfile.profileImage.startsWith('http')
              ? playerProfile.profileImage
              : `${environment.baseUrl}${playerProfile.profileImage}`;
          } else {
            this.userProfileImage = null;
          }
        });
      } else if (user && user.role === 'scout') {
        this.scoutProfileSubscription?.unsubscribe();

        this.scoutProfileSubscription = this.scoutService.getProfile().pipe(
          catchError(error => {
            console.error('Header: Error fetching scout profile for image:', error);
            return of(null);
          })
        ).subscribe((scoutProfile: ScoutProfile | null) => {
          console.log('Scout profile loaded:', scoutProfile);
          if (scoutProfile && scoutProfile.profileImage) {
            this.userProfileImage = scoutProfile.profileImage.startsWith('http')
              ? scoutProfile.profileImage
              : `${environment.baseUrl}${scoutProfile.profileImage}`;
            console.log('Setting scout profile image to:', this.userProfileImage);
          } else {
            // When there's no profile image, explicitly set it to the default
            this.userProfileImage = '/profile2.png';
            console.log('Using default scout profile image:', this.userProfileImage);
          }
        });
      }
    });

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMobileMenu();
      });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.playerProfileSubscription?.unsubscribe();
    this.scoutProfileSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  navigateToUserProfile(): void {
    this.closeMobileMenu();
    if (this.userRole === 'player') {
      this.router.navigate(['/profile']);
    } else if (this.userRole === 'scout') {
      this.router.navigate(['/scout/profile']);
    } else if (this.userRole === 'admin') {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }

  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      document.body.classList.remove('overflow-hidden');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isMenuButton = target.closest('button') && target.closest('button')?.getAttribute('aria-label') === 'Toggle menu';
    const isInsideMenu = target.closest('.md\\:hidden') !== null;

    if (!isMenuButton && !isInsideMenu && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  logout(): void {
    this.authService.logout();
    this.closeMobileMenu();
  }
}