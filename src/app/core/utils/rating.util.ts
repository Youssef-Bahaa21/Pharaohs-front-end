import { PlayerStats } from '../models/models';

/**
 * Utility class for calculating player ratings consistently across the application
 */
export class RatingUtil {
  /**
   * Calculates a player's efficiency rating on a 1-5 scale
   * @param stats Player performance statistics
   * @returns Rating value between 1-5
   */
  static calculateRating(stats: PlayerStats | null | undefined): number {
    // Return minimum rating if no stats or no matches played
    if (!stats || !stats.matches_played) return 1;

    // Calculate the raw rating using the performance formula
    const numerator = (stats.goals * 2) + stats.assists - stats.yellow_cards - (stats.red_cards * 3);
    const denominator = stats.matches_played || 1; // Avoid division by zero
    const rawRating = numerator / denominator;

    // Convert to 1-5 scale
    // Map the range to 1-5 where:
    // - Very poor performance = 1
    // - Average performance = 3
    // - Excellent performance = 5

    // First scale to 0-4 range, then add 1 to get 1-5
    let scaledRating = (rawRating + 3) / 6 * 4 + 1;

    // Ensure rating is between 1-5
    return Math.max(1, Math.min(5, scaledRating));
  }

  /**
   * Gets the rating as a formatted string with one decimal place
   * @param stats Player performance statistics
   * @returns Rating as a string with one decimal place (e.g., "3.5")
   */
  static getRatingString(stats: PlayerStats | null | undefined): string {
    return this.calculateRating(stats).toFixed(1);
  }

  /**
   * Gets the CSS class for a rating based on its value
   * @param rating Rating value between 1-5
   * @returns CSS class name for styling the rating
   */
  static getRatingClass(rating: number): string {
    if (rating < 2.5) return 'text-red-500';
    if (rating < 4) return 'text-yellow-400';
    return 'text-primary-green';
  }

  /**
   * Converts a rating value to a percentage (0-100%) for UI elements like sliders
   * @param rating Rating value between 1-5
   * @returns Percentage value between 0-100
   */
  static getRatingPercentage(rating: number): number {
    // Map 1-5 range to 0-100%
    return ((rating - 1) / 4) * 100;
  }
}
