import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input() show: boolean = false;
  @Input() title: string = '';
  @Input() modalType: 'upload' | 'update' | 'tryout' = 'upload';

  // Upload/Update properties
  @Input() fileType: 'video' | 'image' = 'video';
  @Input() selectedFile: File | null = null;
  @Input() description: string = '';
  @Input() progress: number = 0;
  @Input() error: string | null = null;
  @Input() isProcessing: boolean = false;
  @Input() postBeingUpdated: any = null;

  // Flag to prevent double submissions
  isSubmitting: boolean = false;

  // Tryout properties
  @Input() tryouts: any[] = [];
  @Input() selectedTryoutId: number | null = null;
  @Input() isLoadingTryouts: boolean = false;
  @Input() currentInvitingPlayerId: number | null = null;
  @Input() invitedPlayers = new Set<number>();
  @Input() isInvitedToTryout: (playerId: number | null, tryoutId: string | number) => boolean = () => false;

  @Output() close = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<Event>();
  @Output() fileRemoved = new EventEmitter<Event>();
  @Output() submit = new EventEmitter<Event>();
  @Output() fileTypeChange = new EventEmitter<'video' | 'image'>();
  @Output() descriptionChange = new EventEmitter<string>();
  @Output() selectedTryoutIdChange = new EventEmitter<number | null>();
  @Output() confirmTryout = new EventEmitter<void>();
  @Output() navigateToTryouts = new EventEmitter<void>();

  onFileSelected(event: Event): void {
    this.fileSelected.emit(event);
  }

  removeSelectedFile(event: Event): void {
    this.fileRemoved.emit(event);
  }

  submitModal(event: Event): void {
    // Always prevent default form submission to avoid page reload
    event.preventDefault();
    event.stopPropagation();

    // Prevent double submissions
    if (this.isSubmitting || this.isProcessing) {
      return;
    }

    this.isSubmitting = true;
    this.submit.emit(event);

    // Reset isSubmitting after a delay to prevent rapid clicking
    setTimeout(() => {
      this.isSubmitting = false;
    }, 500);
  }

  closeModal(): void {
    this.close.emit();
  }

  onFileTypeChange(type: 'video' | 'image'): void {
    this.fileType = type;
    this.fileTypeChange.emit(type);
  }

  onDescriptionChange(description: string): void {
    this.description = description;
    this.descriptionChange.emit(description);
  }

  onSelectedTryoutIdChange(tryoutId: number | null): void {
    this.selectedTryoutId = tryoutId;
    this.selectedTryoutIdChange.emit(tryoutId);
  }

  confirmInvite(): void {
    this.confirmTryout.emit();
  }

  goToTryouts(): void {
    this.navigateToTryouts.emit();
  }
}
