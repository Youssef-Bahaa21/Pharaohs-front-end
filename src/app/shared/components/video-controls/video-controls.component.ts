import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoTimelineComponent } from './video-timeline.component';

@Component({
  selector: 'app-video-controls',
  standalone: true,
  imports: [CommonModule, VideoTimelineComponent],
  template: `
    <div class="video-controls-container"
         [class.visible]="isVisible || isPlaying === false"
         [class.fullscreen]="isFullscreen"
         (mouseenter)="showControls()"
         (mouseleave)="hideControls()"
         (click)="onContainerClick($event)"
         (keydown)="onKeyDown($event)"
         tabindex="-1"
         role="application"
         aria-label="Video controls">

      <button class="play-button"
           [class.hidden-in-fullscreen]="isFullscreen && !isVisible && isPlaying"
           (click)="togglePlay($event)"
           tabindex="0"
           [attr.aria-label]="isPlaying ? 'Pause' : 'Play'"
           [attr.title]="isPlaying ? 'Pause' : 'Play'">
        <svg *ngIf="!isPlaying" xmlns="http://www.w3.org/2000/svg" class="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg *ngIf="isPlaying" xmlns="http://www.w3.org/2000/svg" class="pause-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      </button>

      <!-- Timeline -->
      <app-video-timeline [videoElement]="videoElement" [isFullscreen]="isFullscreen"></app-video-timeline>

      <!-- Fullscreen Button -->
      <button class="fullscreen-button"
           (click)="toggleFullscreen()"
           tabindex="0"
           [attr.aria-label]="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
           [attr.title]="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'">
        <svg *ngIf="!isFullscreen" xmlns="http://www.w3.org/2000/svg" class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 8V4h4M4 4l5 5M20 4v4h-4M20 4l-5 5M4 16v4h4M4 20l5-5M20 20v-4h-4M20 20l-5-5" />
        </svg>
        <svg *ngIf="isFullscreen" xmlns="http://www.w3.org/2000/svg" class="compress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 14h4v4M4 14l5-5M14 20v-4h4M14 20l5-5M20 10h-4V6M20 10l-5 5M10 4v4H6M10 4l-5 5" />
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .video-controls-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.3) 100%);
      z-index: 5;
    }

    .video-controls-container.visible {
      opacity: 1;
    }

    .video-controls-container.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9998;
    }

    .play-button {
      width: 60px;
      height: 60px;
      background-color: rgba(59, 127, 88, 0.8);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      margin-bottom: 20px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      transition: transform 0.2s ease, background-color 0.2s ease;
      border: none;
      outline: none;
      padding: 0;
    }

    .play-button:hover, .play-button:focus {
      transform: scale(1.1);
      background-color: rgba(59, 127, 88, 1);
    }

    .play-button:focus {
      box-shadow: 0 0 0 3px rgba(59, 127, 88, 0.5), 0 0 10px rgba(0,0,0,0.5);
    }

    .play-button.hidden-in-fullscreen {
      opacity: 0;
      pointer-events: none;
    }

    .play-icon, .pause-icon {
      width: 30px;
      height: 30px;
      color: white;
    }

    .fullscreen-button {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background-color: rgba(59, 127, 88, 0.8);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      box-shadow: 0 0 5px rgba(0,0,0,0.5);
      transition: transform 0.2s ease, background-color 0.2s ease;
      border: none;
      outline: none;
      padding: 0;
    }

    .fullscreen-button:hover, .fullscreen-button:focus {
      transform: scale(1.1);
      background-color: rgba(59, 127, 88, 1);
    }

    .fullscreen-button:focus {
      box-shadow: 0 0 0 3px rgba(59, 127, 88, 0.5), 0 0 5px rgba(0,0,0,0.5);
    }

    .expand-icon, .compress-icon {
      width: 24px;
      height: 24px;
      color: white;
    }
  `]
})
export class VideoControlsComponent {
  @Input() videoElement!: HTMLVideoElement;
  @Input() videoContainer!: HTMLElement;
  @Input() isPlaying: boolean = false;
  @Input() isFullscreen: boolean = false;

  @Output() playToggled = new EventEmitter<MouseEvent>();
  @Output() fullscreenToggled = new EventEmitter<MouseEvent>();

  isVisible: boolean = true;
  private hideTimeout: any;

  ngOnInit(): void {
    // Hide controls after 3 seconds
    this.startHideTimer();

    // Add event listeners to the video element
    if (this.videoElement) {
      this.videoElement.addEventListener('play', () => {
        this.isPlaying = true;
        this.startHideTimer();
      });

      this.videoElement.addEventListener('pause', () => {
        this.isPlaying = false;
        this.clearHideTimer();
        this.isVisible = true;
      });

      this.videoElement.addEventListener('ended', () => {
        this.isPlaying = false;
        this.isVisible = true;
      });
    }
  }

  togglePlay(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.playToggled.emit(new MouseEvent('click'));
  }

  toggleFullscreen(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.fullscreenToggled.emit(event || new MouseEvent('click'));
  }

  onContainerClick(event: MouseEvent): void {
    // Only handle clicks directly on the container, not on child elements
    if (event.target === event.currentTarget) {
      this.togglePlay();
    }
  }

  /**
   * Handle keyboard events for the controls
   * - Space/K: Toggle play/pause
   * - F: Toggle fullscreen
   */
  onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
      case 'KeyK':
        event.preventDefault();
        this.togglePlay();
        break;

      case 'KeyF':
        event.preventDefault();
        this.toggleFullscreen();
        break;
    }
  }

  showControls(): void {
    this.clearHideTimer();
    this.isVisible = true;
  }

  hideControls(): void {
    if (this.isPlaying) {
      this.startHideTimer();
    }
  }

  private startHideTimer(): void {
    this.clearHideTimer();
    this.hideTimeout = setTimeout(() => {
      if (this.isPlaying) {
        this.isVisible = false;
      }
    }, 3000);
  }

  private clearHideTimer(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
}
