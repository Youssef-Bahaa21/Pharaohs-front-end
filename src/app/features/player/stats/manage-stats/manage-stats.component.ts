/**
 * Manage Stats Component
 *
 * This component allows players to view and update their performance statistics
 * including matches played, goals, assists, and disciplinary records.
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlayerService } from '../../../../core/services/player/player.service';
import { PlayerStats } from '../../../../core/models/models';
import { SimpleToastService } from '../../../../shared/components/toast/simple-toast.service';
import { FeatureHeaderComponent } from '../../../../shared/components/feature-header/feature-header.component';
import { RatingUtil } from '../../../../core/utils/rating.util';

@Component({
  selector: 'app-manage-stats',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FeatureHeaderComponent],
  templateUrl: './manage-stats.component.html',
  styles: []
})
export class ManageStatsComponent implements OnInit {
  statsForm!: FormGroup;
  isLoading = false;
  isSaving = false;

  RatingUtil = RatingUtil;

  constructor(
    private fb: FormBuilder,
    private playerService: PlayerService,
    private toastService: SimpleToastService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadStats();
  }

  /**
   * Initialize the statistics form with default values
   */
  initForm(): void {
    this.statsForm = this.fb.group({
      matches_played: [0, [Validators.required, Validators.min(0)]],
      goals: [0, [Validators.required, Validators.min(0)]],
      assists: [0, [Validators.required, Validators.min(0)]],
      yellow_cards: [0, [Validators.required, Validators.min(0)]],
      red_cards: [0, [Validators.required, Validators.min(0)]],
      lastUpdated: [new Date()]
    });
  }

  /**
   * Fetch player statistics from the server
   */
  loadStats(): void {
    this.isLoading = true;
    this.playerService.getPlayerStats().subscribe({
      next: (data) => {
        if (data.performanceStats) {
          this.statsForm.patchValue({
            ...data.performanceStats,
            lastUpdated: new Date()
          });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load stats:', err);
        this.toastService.error('Failed to load your statistics');
        this.isLoading = false;
      }
    });
  }

  /**
   * Save updated statistics to the server
   */
  saveStats(): void {
    if (this.statsForm.invalid) {
      this.toastService.warning('Please correct the errors in the form');
      return;
    }

    this.isSaving = true;
    const statsValue = this.statsForm.value;
    const stats: PlayerStats = {
      matches_played: statsValue.matches_played,
      goals: statsValue.goals,
      assists: statsValue.assists,
      yellow_cards: statsValue.yellow_cards,
      red_cards: statsValue.red_cards
    };

    this.playerService.updatePerformanceStats(stats).subscribe({
      next: () => {
        this.statsForm.patchValue({
          lastUpdated: new Date()
        });
        this.toastService.success('Statistics updated successfully');
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Failed to update stats:', err);
        this.toastService.error('Failed to update your statistics');
        this.isSaving = false;
      }
    });
  }

  /**
   * Calculate overall player rating based on statistics
   */
  calculateEfficiency(): number {
    const stats = this.statsForm.value;
    return RatingUtil.calculateRating(stats);
  }

  /**
   * Calculate percentage of goals and assists relative to a benchmark
   */
  calculateGoalContributionPercentage(): number {
    const stats = this.statsForm.value;
    const totalContributions = (stats.goals || 0) + (stats.assists || 0);

    const percentage = (totalContributions / 25) * 100;

    return Math.min(100, percentage);
  }

  /**
   * Calculate discipline score based on cards received
   */
  calculateDisciplineRatio(): number {
    const stats = this.statsForm.value;
    const matches = stats.matches_played || 1;
    const cards = (stats.yellow_cards || 0) + ((stats.red_cards || 0) * 3);

    const maxCardsPerMatch = 0.5;
    const cardRatio = Math.min(1, cards / (matches * maxCardsPerMatch));

    return Math.round((1 - cardRatio) * 100);
  }
}
