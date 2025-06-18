import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="animate-pulse bg-gray-700 rounded"
      [ngClass]="[
        type === 'text' ? 'h-4' : '',
        type === 'title' ? 'h-8 w-1/4' : '',
        type === 'avatar' ? 'rounded-full' : '',
        type === 'thumbnail' ? 'aspect-video' : '',
        type === 'card' ? 'h-32' : '',
        type === 'button' ? 'h-10 w-24' : '',
        type === 'badge' ? 'h-6 w-16 rounded-full' : '',
        customClass
      ]"
      [ngStyle]="{
        'width': width,
        'height': height
      }"
    ></div>
  `,
})
export class SkeletonLoaderComponent {
  @Input() type: 'text' | 'title' | 'avatar' | 'thumbnail' | 'card' | 'button' | 'badge' = 'text';
  @Input() width?: string;
  @Input() height?: string;
  @Input() customClass: string = '';
}
