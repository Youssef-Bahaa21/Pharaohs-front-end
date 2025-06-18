import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';
import { ToastType } from './simple-toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
  template: `
    <div class="toast-container" [ngClass]="'toast-' + data.type">
      <div class="toast-icon-wrapper">
        <div class="toast-icon">
          <svg *ngIf="data.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg *ngIf="data.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg *ngIf="data.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <svg *ngIf="data.type === 'info'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
      </div>
      <div class="toast-content">
        <span class="toast-message">{{ message }}</span>
      </div>
      <button class="toast-close" (click)="dismiss()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    /* Component-specific styles */
    .toast-container {
      display: flex;
      align-items: center;
      position: relative;
      overflow: hidden;
    }

    .toast-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 14px;
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      width: 32px;
      height: 32px;
    }

    .toast-content {
      flex: 1;
      font-weight: 500;
    }

    .toast-close {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      margin-left: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s, transform 0.2s;
      color: inherit;
      border-radius: 50%;
    }

    .toast-close:hover {
      opacity: 1;
      transform: scale(1.1);
    }
  `]
})
export class ToastComponent {
  message: string;

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: { type: ToastType, message?: string },
    private snackBarRef: MatSnackBarRef<ToastComponent>
  ) {
    this.message = data.message || '';
  }

  dismiss(): void {
    this.snackBarRef.dismiss();
  }
}
