import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScoutProfile, Tryout } from '../../../core/models/models';
import { ScoutService } from '../../../core/services/scout/scout.service';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { LazyLoadImageDirective } from '../../../shared/directives/lazy-load-image.directive';

@Component({
  selector: 'app-scout-view-profile',
  standalone: true,
  imports: [
    CommonModule,
    FeatureHeaderComponent,
  ],
  templateUrl: './scout-view-profile.component.html',
  styleUrls: ['./scout-view-profile.component.css']
})
export class ScoutViewProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scoutService = inject(ScoutService);
  private toastService = inject(SimpleToastService);

  scoutId: number | null = null;
  scoutProfile: ScoutProfile | null = null;
  tryouts: Tryout[] = [];
  isLoading = true;
  loadingTryouts = true;
  error: string | null = null;
  defaultProfileImage = '/profile2.png';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      // Check if ID is valid (not null, undefined, or empty string)
      const isValidId = id && id !== 'undefined' && id !== 'null' && id.trim() !== '';

      if (isValidId) {
        this.scoutId = +id;
        this.loadScoutProfile();
        this.loadScoutTryouts();
      } else {
        this.error = 'Scout ID not provided or invalid. Please go back and try again.';
        this.isLoading = false;
        this.toastService.error('Unable to view scout profile: Invalid ID');
      }
    });
  }

  // Loads the scout's public profile data
  private loadScoutProfile(): void {
    if (!this.scoutId) return;

    this.isLoading = true;
    this.scoutService.getScoutPublicProfile(this.scoutId).subscribe({
      next: (profile: ScoutProfile) => {
        // Process profile image to ensure proper path
        if (profile.profileImage) {
          profile.profileImage = profile.profileImage.startsWith('http')
            ? profile.profileImage
            : `http://localhost:3000${profile.profileImage}`;
        }
        this.scoutProfile = profile;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load scout profile. Please try again later.';
        this.isLoading = false;
        this.toastService.error('Failed to load scout profile');
      }
    });
  }

  // Fetches tryouts organized by this scout
  private loadScoutTryouts(): void {
    if (!this.scoutId) return;

    this.loadingTryouts = true;
    this.scoutService.getScoutPublicTryouts(this.scoutId).subscribe({
      next: (tryouts: Tryout[]) => {
        this.tryouts = tryouts;
        this.loadingTryouts = false;
      },
      error: (err) => {
        this.loadingTryouts = false;
        this.toastService.error('Failed to load scout tryouts');
      }
    });
  }

  // Navigates back to invitations page
  goBack(): void {
    this.router.navigate(['/player/invitations']);
  }

  // Formats date for display with localization
  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Determines if a date is in the past
  isDatePast(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  // Calculates and formats the scout's active time period
  getScoutActiveTime(): string {
    if (!this.scoutProfile?.createdAt) return 'N/A';

    const createdDate = new Date(this.scoutProfile.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  }
}
