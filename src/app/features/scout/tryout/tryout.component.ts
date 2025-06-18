import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { ScoutService } from '../../../core/services/scout/scout.service';
import { Tryout, Invitation } from '../../../core/models/models';
import { DateFormatUtil } from '../../../core/utils/date-format.util';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TryoutDetailsDialogComponent } from './tryout-details-dialog/tryout-details-dialog.component';

@Component({
  standalone: true,
  selector: 'app-tryout',
  imports: [CommonModule, ReactiveFormsModule, DateFormatUtil, FeatureHeaderComponent, MatDialogModule],
  templateUrl: './tryout.component.html'
})
export class TryoutComponent implements OnInit {
  scoutService = inject(ScoutService);
  toastService = inject(SimpleToastService);
  dialog = inject(MatDialog);
  router = inject(Router);

  form: FormGroup;
  editForm: FormGroup;
  tryouts: Tryout[] = [];
  error: string | null = null;
  editingTryoutId: string | null = null;
  isSubmitting = false;
  locations: string[] = [];

  @ViewChild('nameInput') nameInput: ElementRef | undefined;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      location: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required]
    });

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      location: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTryouts();
    this.loadLocations();
  }

  // Fetches available locations from the service
  private loadLocations(): void {
    this.scoutService.getLocations().subscribe({
      next: (locations) => this.locations = locations,
      error: (err) => {
        console.error('Failed to load locations', err);
        this.toastService.error('Failed to load locations');
      }
    });
  }

  // Returns today's date in ISO format for date input min value
  today(): string {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }

  // Creates a new tryout with form data
  createTryout(): void {
    if (this.form.invalid) return;

    this.error = null;
    this.isSubmitting = true;

    this.scoutService.createTryout(this.form.value).subscribe({
      next: () => {
        this.form.reset();
        this.loadTryouts();
        this.toastService.success('Tryout created successfully');
        this.isSubmitting = false;
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to create tryout';
        this.toastService.error(this.error || '');
        this.isSubmitting = false;
      }
    });
  }

  // Prepares the edit form with tryout data
  startEdit(tryout: Tryout): void {
    this.editingTryoutId = tryout.id;

    // Extract time from date if it's a datetime string
    let time = tryout.time;
    if (!time && tryout.date) {
      const dateObj = new Date(tryout.date);
      if (!isNaN(dateObj.getTime())) {
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        time = `${hours}:${minutes}`;
      }
    }

    // Format date to YYYY-MM-DD for the date input
    let formattedDate = tryout.date;
    if (tryout.date) {
      const dateObj = new Date(tryout.date);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toISOString().split('T')[0];
      }
    }

    this.editForm.setValue({
      name: tryout.name,
      location: tryout.location,
      date: formattedDate,
      time: time
    });
  }

  // Cancels edit mode
  cancelEdit(): void {
    this.editingTryoutId = null;
    this.editForm.reset();
  }

  // Updates an existing tryout
  updateTryout(): void {
    if (this.editForm.invalid || !this.editingTryoutId) return;

    this.error = null;
    this.isSubmitting = true;

    const updatedTryout = {
      ...this.editForm.value,
      id: this.editingTryoutId
    };

    this.scoutService.updateTryout(this.editingTryoutId, updatedTryout).subscribe({
      next: () => {
        this.loadTryouts();
        this.editingTryoutId = null;
        this.toastService.success('Tryout updated successfully');
        this.isSubmitting = false;
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to update tryout';
        this.toastService.error(this.error || '');
        this.isSubmitting = false;
      }
    });
  }

  // Opens dialog with tryout details
  viewTryoutDetails(tryout: Tryout): void {
    this.dialog.open(TryoutDetailsDialogComponent, {
      width: '600px',
      data: { tryout }
    });
  }

  // Deletes a tryout after confirmation
  deleteTryout(tryoutId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Tryout',
        message: 'Are you sure you want to delete this tryout? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isSubmitting = true;
        this.scoutService.deleteTryout(tryoutId).subscribe({
          next: () => {
            this.tryouts = this.tryouts.filter(t => t.id !== tryoutId);
            this.toastService.success('Tryout deleted successfully');
            this.isSubmitting = false;
          },
          error: (err: any) => {
            const errorMsg = err?.error?.message || 'Failed to delete tryout';
            this.toastService.error(errorMsg);
            this.isSubmitting = false;
          }
        });
      }
    });
  }

  // Navigates to invitations page filtered by tryout
  viewInvitedPlayers(tryout: Tryout): void {
    this.router.navigate(['/scout/invitations'], {
      queryParams: { tryout_id: tryout.id }
    });
  }

  // Fetches tryouts created by the user
  private loadTryouts(): void {
    this.scoutService.getTryouts().subscribe({
      next: (res) => this.tryouts = res,
      error: () => {
        this.error = 'Failed to load tryouts';
        this.toastService.error(this.error || '');
      }
    });
  }

  // Focuses on the name input field in create form
  focusCreateForm(): void {
    setTimeout(() => {
      if (this.nameInput) {
        this.nameInput.nativeElement.focus();
      }
    }, 100);
  }

  // Custom location functionality removed as requested
}
