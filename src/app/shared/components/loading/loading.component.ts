import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-center items-center" [ngClass]="fullScreen ? 'fixed inset-0 bg-black/50 z-50' : ''">
      <div class="flex flex-col items-center" [ngClass]="fullScreen ? 'bg-primary-dark p-6 rounded-lg shadow-lg' : ''">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-green"></div>
        <p *ngIf="message" class="mt-4 text-white">{{ message }}</p>
      </div>
    </div>
  `,
})
export class LoadingComponent {
  @Input() fullScreen: boolean = false;
  @Input() message: string = '';
}
