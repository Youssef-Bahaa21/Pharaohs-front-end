import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  template: `
    <div class="hidden md:block overflow-x-auto">
      <table class="min-w-full bg-primary-dark rounded-lg overflow-hidden">
        <thead class="bg-input">
          <tr>
            <th *ngFor="let col of [].constructor(columnCount)" class="px-4 py-3 text-left">
              <app-skeleton-loader type="text" customClass="w-24"></app-skeleton-loader>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of [].constructor(rowCount)" class="border-t border-gray-800">
            <td *ngFor="let col of [].constructor(columnCount)" class="px-4 py-3">
              <app-skeleton-loader type="text" [customClass]="col === 0 ? 'w-32' : 'w-24'"></app-skeleton-loader>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card Skeleton (visible only on mobile) -->
    <div class="md:hidden space-y-4">
      <div *ngFor="let row of [].constructor(rowCount)" class="bg-primary-dark p-4 rounded-lg">
        <div *ngFor="let col of [].constructor(columnCount)" class="mb-2 flex justify-between items-center">
          <app-skeleton-loader type="text" customClass="w-24"></app-skeleton-loader>
          <app-skeleton-loader type="text" customClass="w-32"></app-skeleton-loader>
        </div>
      </div>
    </div>
  `,
})
export class TableSkeletonComponent {
  @Input() rowCount: number = 5;
  @Input() columnCount: number = 4;
}
