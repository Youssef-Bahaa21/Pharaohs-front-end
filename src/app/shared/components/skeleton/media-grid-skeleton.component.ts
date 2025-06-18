import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

@Component({
  selector: 'app-media-grid-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ng-container *ngFor="let item of [].constructor(itemCount)">
        <div class="bg-input rounded-lg overflow-hidden">
          <app-skeleton-loader type="thumbnail" customClass="w-full"></app-skeleton-loader>
          <div class="p-3">
            <app-skeleton-loader type="text" customClass="w-3/4 mb-2"></app-skeleton-loader>
            <app-skeleton-loader type="text" customClass="w-1/2"></app-skeleton-loader>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class MediaGridSkeletonComponent {
  @Input() itemCount: number = 6;
}
