import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

@Component({
  selector: 'app-profile-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  template: `
    <div class="card-dark p-6 rounded-lg shadow-lg border border-primary-green/20 mb-6">
      <div class="flex flex-col md:flex-row items-center md:items-start gap-6">
        <!-- Profile Image Skeleton -->
        <div class="relative">
          <app-skeleton-loader type="avatar" width="120px" height="120px"></app-skeleton-loader>
          <!-- Position Badge Skeleton -->
          <div class="absolute -bottom-2 -right-2">
            <app-skeleton-loader type="badge"></app-skeleton-loader>
          </div>
        </div>

        <!-- Player Info Skeleton -->
        <div class="text-center md:text-left flex-1">
          <app-skeleton-loader type="title" customClass="mb-2 mx-auto md:mx-0"></app-skeleton-loader>
          <app-skeleton-loader type="text" customClass="w-3/4 mb-1 mx-auto md:mx-0"></app-skeleton-loader>

          <div class="flex flex-wrap gap-2 justify-center md:justify-start mt-3 mb-4">
            <app-skeleton-loader type="badge"></app-skeleton-loader>
            <app-skeleton-loader type="badge"></app-skeleton-loader>
            <app-skeleton-loader type="badge"></app-skeleton-loader>
          </div>

          <!-- Efficiency Rating Skeleton -->
          <div class="mt-4">
            <div class="flex items-center justify-center md:justify-start gap-2 mb-1">
              <app-skeleton-loader type="text" width="150px"></app-skeleton-loader>
            </div>
            <app-skeleton-loader type="text" customClass="w-full h-2.5"></app-skeleton-loader>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation Skeleton -->
    <div class="flex overflow-x-auto mb-6 bg-input rounded-lg p-1">
      <app-skeleton-loader type="button" customClass="mx-1 flex-1"></app-skeleton-loader>
      <app-skeleton-loader type="button" customClass="mx-1 flex-1"></app-skeleton-loader>
      <app-skeleton-loader type="button" customClass="mx-1 flex-1"></app-skeleton-loader>
      <app-skeleton-loader type="button" customClass="mx-1 flex-1"></app-skeleton-loader>
    </div>

    <!-- Tab Content Skeleton -->
    <div class="card-dark p-6 rounded-lg shadow-lg border border-primary-green/20">
      <app-skeleton-loader type="title" customClass="mb-4"></app-skeleton-loader>
      
      <!-- Bio Section Skeleton -->
      <div class="bg-input p-4 rounded-lg mb-6">
        <app-skeleton-loader type="text" customClass="mb-2"></app-skeleton-loader>
        <app-skeleton-loader type="text" customClass="w-full"></app-skeleton-loader>
        <app-skeleton-loader type="text" customClass="w-3/4 mt-2"></app-skeleton-loader>
      </div>

      <!-- Quick Stats Skeleton -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-input p-4 rounded-lg text-center">
          <app-skeleton-loader type="text" customClass="h-8 w-12 mx-auto mb-2"></app-skeleton-loader>
          <app-skeleton-loader type="text" customClass="w-16 mx-auto"></app-skeleton-loader>
        </div>
        <div class="bg-input p-4 rounded-lg text-center">
          <app-skeleton-loader type="text" customClass="h-8 w-12 mx-auto mb-2"></app-skeleton-loader>
          <app-skeleton-loader type="text" customClass="w-16 mx-auto"></app-skeleton-loader>
        </div>
        <div class="bg-input p-4 rounded-lg text-center">
          <app-skeleton-loader type="text" customClass="h-8 w-12 mx-auto mb-2"></app-skeleton-loader>
          <app-skeleton-loader type="text" customClass="w-16 mx-auto"></app-skeleton-loader>
        </div>
        <div class="bg-input p-4 rounded-lg text-center">
          <app-skeleton-loader type="text" customClass="h-8 w-12 mx-auto mb-2"></app-skeleton-loader>
          <app-skeleton-loader type="text" customClass="w-16 mx-auto"></app-skeleton-loader>
        </div>
      </div>

      <!-- Featured Media Skeleton -->
      <div class="mb-4">
        <app-skeleton-loader type="text" customClass="mb-3 w-40"></app-skeleton-loader>
        <app-skeleton-loader type="thumbnail" customClass="w-full"></app-skeleton-loader>
      </div>
    </div>
  `,
})
export class ProfileSkeletonComponent {}
