import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filter',
  imports: [CommonModule, FormsModule],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.css',
  standalone: true
})
export class FilterComponent {
  @Input() searchQuery: string = '';
  @Input() filterClub: string = '';
  @Input() filterPosition: string = '';
  @Input() filterRating: string = '';
  @Input() positions: string[] = [];
  @Input() clubs: string[] = [];
  @Input() isLoadingFilterOptions: boolean = false;
  @Input() totalPlayers: number = 0;
  @Input() totalVideos: number = 0;

  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() filterClubChange = new EventEmitter<string>();
  @Output() filterPositionChange = new EventEmitter<string>();
  @Output() filterRatingChange = new EventEmitter<string>();
  @Output() applyFiltersEvent = new EventEmitter<void>();
  @Output() resetFiltersEvent = new EventEmitter<void>();

  applyFilters(): void {
    this.searchQueryChange.emit(this.searchQuery);
    this.filterClubChange.emit(this.filterClub);
    this.filterPositionChange.emit(this.filterPosition);
    this.filterRatingChange.emit(this.filterRating);
    this.applyFiltersEvent.emit();
  }

  resetFilters(): void {
    console.log('[FilterComponent] Resetting all filters');

    // Clear local filter values 
    this.searchQuery = '';
    this.filterClub = '';
    this.filterPosition = '';
    this.filterRating = '';

    // Emit changes for all filter properties
    this.searchQueryChange.emit(this.searchQuery);
    this.filterClubChange.emit(this.filterClub);
    this.filterPositionChange.emit(this.filterPosition);
    this.filterRatingChange.emit(this.filterRating);

    // Emit reset event last
    this.resetFiltersEvent.emit();

    console.log('[FilterComponent] Reset events emitted');
  }

  parseNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}
