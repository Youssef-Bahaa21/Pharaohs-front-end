import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="p-6 max-w-md">
      <h2 class="text-xl font-bold mb-4" [ngClass]="data.isDanger ? 'text-red-500' : 'text-primary-green'">
        {{ data.title }}
      </h2>
      <p class="text-gray-200 mb-6">{{ data.message }}</p>
      <div class="flex justify-end space-x-3">
        <button 
          (click)="onCancel()" 
          class="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button 
          (click)="onConfirm()" 
          [ngClass]="data.isDanger 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-primary-green hover:bg-primary-green/90'"
          class="px-4 py-2 rounded-lg text-white transition-colors">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #1a1a1a;
      border-radius: 8px;
      border: 1px solid rgba(34, 197, 94, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
