/**
 * Scout Profile Component
 *
 * This component handles the display and management of scout profile information.
 * It allows scouts to view and update their profile details.
 */
import { Component, inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ScoutService } from '../../../core/services/scout/scout.service';
import { ScoutProfile, User } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth/auth.service';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';
import { LazyLoadImageDirective } from '../../../shared/directives/lazy-load-image.directive';
import { ImageOptimizationService } from '../../../core/services/image/image-optimization.service';

@Component({
  standalone: true,
  selector: 'app-scout-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    FeatureHeaderComponent,
    MatDialogModule,
    LazyLoadImageDirective
  ],
  templateUrl: './scout-profile.component.html',
  styleUrls: ['./scout-profile.component.css']
})
export class ScoutProfileComponent implements OnInit {
  // File upload references
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Injected services
  scoutService = inject(ScoutService);
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  toastService = inject(SimpleToastService);
  dialog = inject(MatDialog);
  router = inject(Router);
  imageService = inject(ImageOptimizationService);

  // Component state
  scoutProfile!: ScoutProfile;
  profileForm!: FormGroup;
  isLoading = true;
  isEditing = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Image handling
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isUploadingImage = false;
  defaultProfileImage = '/profile2.png';

  /**
   * Checks if the provided image URL is the default profile image
   */
  isDefaultProfileImage(imageUrl: string): boolean {
    if (!imageUrl) return true;

    const defaultImagePatterns = [
      '/profile2.png',
      'profile2.png',
      'assets/images/profile.png',
      'assets/images/profile2.png',
      'assets/images/placeholder.svg'
    ];

    return defaultImagePatterns.some(pattern => imageUrl.includes(pattern));
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  /**
   * Navigate to player profile view page
   */
  navigateToPlayerProfile(playerId: number | string): void {
    if (!playerId) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    console.log("Navigating to player profile:", playerId);
    this.router.navigate(['/profile', playerId]);
  }

  /**
   * Handle image loading errors by setting default image
   */
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.defaultProfileImage;
    }
  }

  /**
   * Handle player image loading errors
   */
  handlePlayerImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = '/profile.png';
    }
  }

  /**
   * Loads the scout's profile data from the server
   */
  loadProfile(): void {
    this.isLoading = true;
    this.scoutService.getProfile().subscribe({
      next: profile => {
        // Process scout's own profile image
        if (profile.profileImage) {
          profile.profileImage = profile.profileImage.startsWith('http')
            ? profile.profileImage
            : `http://localhost:3000${profile.profileImage}`;

          if (profile.profileImage.includes('/profile2.png')) {
            profile.profileImage = this.defaultProfileImage;
          }
        } else {
          profile.profileImage = this.defaultProfileImage;
        }

        this.scoutProfile = profile;

        // Process profile images for shortlisted players if they exist
        if (this.scoutProfile.shortlists?.length) {
          // First, set initial values with basic processing
          this.scoutProfile.shortlists = this.scoutProfile.shortlists.map(player => {
            let profileImage = '/profile.png';

            if (player.profileImage) {
              profileImage = player.profileImage.startsWith('http')
                ? player.profileImage
                : `http://localhost:3000${player.profileImage}`;
            }

            return {
              ...player,
              profileImage: profileImage
            };
          });

          // Then, fetch detailed information for each player
          this.scoutProfile.shortlists.forEach((player, index) => {
            if (player.id) {
              this.scoutService.getPlayerDetails(player.id as number).subscribe({
                next: (detailedPlayer) => {
                  this.scoutProfile.shortlists[index] = {
                    ...this.scoutProfile.shortlists[index],
                    ...detailedPlayer,
                    profileImage: detailedPlayer.profileImage || '/profile.png'
                  };
                },
                error: (err) => {
                  console.error(`Failed to load detailed profile for player ${player.id}:`, err);
                }
              });
            }
          });
        }

        this.initializeForm(profile);
        this.isLoading = false;
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Could not load profile. Please try again.';
        this.errorMessage = errorMsg;
        this.toastService.error(errorMsg);
        this.isLoading = false;
      }
    });
  }

  /**
   * Creates and initializes the form with the scout's profile data
   */
  initializeForm(profile: ScoutProfile): void {
    this.profileForm = this.fb.group({
      name: [profile.name, Validators.required],
      organization: [profile.organization || ''],
      phone: [profile.phone || '']
    });
  }

  /**
   * Toggles between view and edit modes
   */
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.initializeForm(this.scoutProfile);
    } else {
      this.successMessage = null;
      this.errorMessage = null;
    }
  }

  /**
   * Opens file selector for profile image
   */
  triggerFileInput(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    } else {
      console.error('File input element not found');
    }
  }

  /**
   * Handles the selected file and shows a preview
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];

      // Preview the selected image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);

      // Auto upload the image
      this.uploadProfileImage();
    }
  }

  /**
   * Uploads the selected profile image to the server
   */
  uploadProfileImage(): void {
    if (!this.selectedFile) return;

    this.isUploadingImage = true;
    this.successMessage = null;
    this.errorMessage = null;

    this.scoutService.uploadProfileImage(this.selectedFile).subscribe({
      next: (response) => {
        this.isUploadingImage = false;
        this.toastService.success('Profile image updated successfully');

        // Update the profile image URL
        if (response.profileImage) {
          const fullImageUrl = response.profileImage.startsWith('http')
            ? response.profileImage
            : `http://localhost:3000${response.profileImage}`;

          this.scoutProfile = {
            ...this.scoutProfile,
            profileImage: fullImageUrl
          };

          this.imagePreview = null;
        } else {
          this.scoutProfile.profileImage = this.defaultProfileImage;
          this.imagePreview = null;
        }

        // Reset the file input
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
        this.selectedFile = null;
      },
      error: (err) => {
        this.isUploadingImage = false;
        const errorMsg = err.error?.message || 'Failed to upload profile image. Please try again.';
        this.errorMessage = errorMsg;
        this.toastService.error(errorMsg);

        // Reset the file input
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
        this.selectedFile = null;
        this.imagePreview = null;
      }
    });
  }

  /**
   * Deletes the current profile image
   */
  deleteProfileImage(): void {
    const dialogData: ConfirmDialogData = {
      title: 'Delete Profile Picture',
      message: 'Are you sure you want to delete your profile picture? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDanger: true
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isUploadingImage = true;
        this.successMessage = null;
        this.errorMessage = null;

        this.scoutService.deleteProfileImage().subscribe({
          next: (response) => {
            this.isUploadingImage = false;
            this.toastService.success('Profile image deleted successfully');

            this.scoutProfile = {
              ...this.scoutProfile,
              profileImage: this.defaultProfileImage
            };

            this.imagePreview = null;
          },
          error: (err) => {
            this.isUploadingImage = false;
            const errorMsg = err.error?.message || 'Failed to delete profile image. Please try again.';
            this.errorMessage = errorMsg;
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  /**
   * Validates and submits the profile form data
   */
  saveProfile(): void {
    if (this.profileForm.invalid) {
      const errorMsg = 'Please fill in all required fields correctly.';
      this.errorMessage = errorMsg;
      this.toastService.warning(errorMsg);
      return;
    }

    this.isLoading = true;
    this.successMessage = null;
    this.errorMessage = null;

    const updatedDataFromForm = this.profileForm.value;

    const payload: Partial<ScoutProfile> = {
      name: updatedDataFromForm.name,
      organization: updatedDataFromForm.organization,
      phone: updatedDataFromForm.phone
    };

    this.scoutService.updateProfile(payload).subscribe({
      next: (response: any) => {
        this.scoutProfile = response.scout;
        this.isLoading = false;
        this.isEditing = false;
        const successMsg = response.message || 'Profile updated successfully!';
        this.successMessage = successMsg;
        this.toastService.success(successMsg);
        this.initializeForm(this.scoutProfile);

        // Update user data in auth service to reflect name changes
        if (this.scoutProfile.name) {
          this.authService.updateCurrentUserData({ name: this.scoutProfile.name } as Partial<User>);
        }
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Failed to update profile. Please try again.';
        this.errorMessage = errorMsg;
        this.toastService.error(errorMsg);
        this.isLoading = false;
      }
    });
  }

  /**
   * Determines if the delete button should be shown
   */
  canShowDeleteButton(): boolean {
    if (!this.scoutProfile?.profileImage) {
      return false;
    }

    const imageUrl = this.scoutProfile.profileImage;
    return !this.isDefaultProfileImage(imageUrl);
  }

  /**
   * Test function to trigger the file input for debugging
   */
  testFileInput(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }
}
