import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ToastComponent } from './toast.component';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root'
})
export class SimpleToastService {
  private snackBar = inject(MatSnackBar);

  private defaultConfig: MatSnackBarConfig = {
    duration: 2000, // Decreased default duration
    horizontalPosition: 'right',
    verticalPosition: 'top',
    panelClass: ['pharaohs-toast', 'below-navbar', 'toast-elevated'],
    // Prevent multiple toasts from stacking
    announcementMessage: '',
    // Disable politeness to prevent screen readers from announcing twice
    politeness: 'assertive'
  };

  /**
   * Show a success toast notification
   * @param message The message to display
   * @param duration Optional duration in milliseconds (default: 3000)
   */
  success(message: string, duration: number = 1500): void {
    const config = { ...this.defaultConfig, duration, panelClass: [...this.defaultConfig.panelClass!, 'success-toast'] };
    this.show('success', message, config);
  }

  /**
   * Show an error toast notification
   * @param message The message to display
   * @param duration Optional duration in milliseconds (default: 2500)
   */
  error(message: string, duration: number = 2500): void {
    const config = { ...this.defaultConfig, duration, panelClass: [...this.defaultConfig.panelClass!, 'error-toast'] };
    this.show('error', message, config);
  }

  /**
   * Show a warning toast notification
   * @param message The message to display
   * @param duration Optional duration in milliseconds (default: 2000)
   */
  warning(message: string, duration: number = 2000): void {
    const config = { ...this.defaultConfig, duration, panelClass: [...this.defaultConfig.panelClass!, 'warning-toast'] };
    this.show('warning', message, config);
  }

  /**
   * Show an info toast notification
   * @param message The message to display
   * @param duration Optional duration in milliseconds (default: 1500)
   */
  info(message: string, duration: number = 1500): void {
    const config = { ...this.defaultConfig, duration, panelClass: [...this.defaultConfig.panelClass!, 'info-toast'] };
    this.show('info', message, config);
  }

  /**
   * Show a custom toast notification
   * @param type The type of toast ('success', 'error', 'warning', 'info')
   * @param message The message to display
   * @param config Optional snackbar configuration
   */
  private show(type: ToastType, message: string, config: MatSnackBarConfig): void {
    // Dismiss any existing toasts before showing a new one
    this.snackBar.dismiss();

    // Show the new toast
    this.snackBar.openFromComponent(ToastComponent, {
      ...config,
      data: { type, message }
    });
  }
}
