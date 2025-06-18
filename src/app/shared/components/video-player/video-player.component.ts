import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoControlsComponent } from '../video-controls/video-controls.component';
import { LazyLoadVideoDirective } from '../../directives/lazy-load-video.directive';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, VideoControlsComponent, LazyLoadVideoDirective],
  template: `
    <div #videoContainer class="video-player-container relative w-full h-full" [attr.data-video-id]="id">
      <!-- Error Message -->
      <div *ngIf="hasError" class="absolute inset-0 flex items-center justify-center z-10 bg-black/70">
        <div class="text-center p-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-white">Video failed to load</p>
          <button (click)="retryLoading()" class="mt-2 bg-primary-green text-white px-4 py-1 rounded-full text-sm">
            Retry
          </button>
        </div>
      </div>

      <video #videoElement
             class="w-full h-full object-cover"
             [appLazyLoadVideo]="videoUrl"
             [posterSrc]="posterUrl || ''"
             [autoGeneratePoster]="true"
             [controls]="false"
             [muted]="muted"
             [loop]="loop"
             [attr.data-video-id]="id"
             preload="metadata"
             (error)="onVideoError($event)"
             (loadeddata)="onVideoLoaded()"
             (loadedmetadata)="onMetadataLoaded()"
             (canplay)="onVideoLoaded()"
             (canplaythrough)="onVideoLoaded()"
             (play)="onVideoPlay()"
             (pause)="onVideoPause()"
             (ended)="onVideoEnded()">
        Your browser does not support the video tag.
      </video>

      <app-video-controls
        [videoElement]="videoElement"
        [videoContainer]="videoContainer"
        [isPlaying]="isPlaying"
        [isFullscreen]="isFullscreen"
        (playToggled)="togglePlay($event)"
        (fullscreenToggled)="toggleFullscreen($event)">
      </app-video-controls>
    </div>
  `,
  styles: [`
    .video-player-container {
      background-color: #000;
      overflow: hidden;
      border-radius: inherit;
      position: relative;
    }

    .video-player-container.has-focus::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 2px solid #3B7F58;
      border-radius: inherit;
      pointer-events: none;
      z-index: 10;
    }

    :host {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: inherit;
    }
  `]
})
export class VideoPlayerComponent implements AfterViewInit, OnDestroy {
  @Input() videoUrl!: string;
  @Input() posterUrl?: string;
  @Input() muted: boolean = false;
  @Input() autoplay: boolean = false;
  @Input() loop: boolean = false;
  @Input() generateThumbnail: boolean = true;
  @Input() id: string = ''; // Unique identifier for this video player

  @Output() error = new EventEmitter<any>();
  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() ended = new EventEmitter<void>();
  @Output() fullscreenToggled = new EventEmitter<MouseEvent>();
  @Output() thumbnailGenerated = new EventEmitter<string>();
  @Output() focused = new EventEmitter<string>(); // Emit when this video gets focus

  @ViewChild('videoElement') videoElementRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoContainer') videoContainerRef!: ElementRef<HTMLDivElement>;

  isPlaying: boolean = false;
  isFullscreen: boolean = false;
  hasError: boolean = false;
  generatedPosterUrl: string | null = null;

  // Static property to track the currently active video player
  private static activeVideoId: string | null = null;

  private fullscreenChangeHandler: () => void;
  private keydownHandler: (event: KeyboardEvent) => void;
  private togglePlayHandler: (event: MouseEvent) => void;
  private dblClickHandler: (event: MouseEvent) => void;
  private focusHandler: (event: FocusEvent) => void;
  private blurHandler: (event: FocusEvent) => void;

  // Track if the video player has focus
  private hasFocus: boolean = false;

  constructor() {
    // Create bound handlers for events
    this.fullscreenChangeHandler = this.onFullscreenChange.bind(this);
    this.keydownHandler = this.onKeyDown.bind(this);
    this.togglePlayHandler = this.togglePlay.bind(this);
    this.focusHandler = this.onFocus.bind(this);
    this.blurHandler = this.onBlur.bind(this);

    // Create a special handler for double-click that directly calls enterExitFullscreen
    this.dblClickHandler = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      this.enterExitFullscreen();
    };
  }

  ngAfterViewInit(): void {
    // Add fullscreen change event listeners
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', this.fullscreenChangeHandler);

    // Add keyboard event listener
    document.addEventListener('keydown', this.keydownHandler);

    // Add click event listener to the video element
    this.videoElementRef.nativeElement.addEventListener('click', this.togglePlayHandler);

    // Add double-click event listener for fullscreen toggle
    this.videoElementRef.nativeElement.addEventListener('dblclick', this.dblClickHandler);

    // Add focus/blur event listeners to track focus state
    this.videoElementRef.nativeElement.addEventListener('focus', this.focusHandler);
    this.videoElementRef.nativeElement.addEventListener('blur', this.blurHandler);

    // Make the video element focusable
    this.videoElementRef.nativeElement.tabIndex = 0;

    // Add ARIA attributes for accessibility
    this.videoElementRef.nativeElement.setAttribute('aria-label', 'Video player');
    this.videoElementRef.nativeElement.setAttribute('role', 'application');

    // Set up autoplay if enabled
    if (this.autoplay) {
      // We need to mute for autoplay to work in most browsers
      this.videoElementRef.nativeElement.muted = true;

      // Try to autoplay
      this.videoElementRef.nativeElement.play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(err => {
          this.error.emit(err);
        });
    }
  }

  ngOnDestroy(): void {
    // Remove fullscreen change event listeners
    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('MSFullscreenChange', this.fullscreenChangeHandler);

    // Remove keyboard event listener
    document.removeEventListener('keydown', this.keydownHandler);

    // Pause video when component is destroyed
    if (this.videoElementRef?.nativeElement) {
      // Remove event listeners
      this.videoElementRef.nativeElement.removeEventListener('click', this.togglePlayHandler);
      this.videoElementRef.nativeElement.removeEventListener('dblclick', this.dblClickHandler);
      this.videoElementRef.nativeElement.removeEventListener('focus', this.focusHandler);
      this.videoElementRef.nativeElement.removeEventListener('blur', this.blurHandler);

      // Pause the video to prevent it from playing in the background
      this.videoElementRef.nativeElement.pause();
    }

    // Exit fullscreen if we're in fullscreen mode
    if (this.isFullscreen) {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  }

  togglePlay(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const video = this.videoElementRef.nativeElement;

    if (video.paused) {
      video.play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(error => {
          this.error.emit(error);
        });
    } else {
      video.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen(event?: MouseEvent): void {
    console.log('toggleFullscreen called with event:', event?.type);
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Always directly call enterExitFullscreen for all types of events
    this.enterExitFullscreen();
  }

  /**
   * Enter or exit fullscreen mode
   */
  enterExitFullscreen(): void {
    console.log('enterExitFullscreen called');

    // Use a more direct approach without try/catch to avoid issues
    const container = this.videoContainerRef.nativeElement;
    const isCurrentlyFullscreen = !!document.fullscreenElement;

    console.log('Current fullscreen state:', isCurrentlyFullscreen);

    if (!isCurrentlyFullscreen) {
      console.log('Attempting to enter fullscreen mode');

      // Try each method in sequence
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      } else {
        console.error('Fullscreen API not supported');
      }
    } else {
      console.log('Attempting to exit fullscreen mode');

      // Try each method in sequence
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      } else {
        console.error('Fullscreen API not supported');
      }
    }
  }

  onFullscreenChange(): void {
    // Check if our video container is the fullscreen element or a parent of it
    const isVideoContainerFullscreen =
      document.fullscreenElement === this.videoContainerRef.nativeElement ||
      (document.fullscreenElement && this.videoContainerRef.nativeElement.contains(document.fullscreenElement));

    this.isFullscreen = !!isVideoContainerFullscreen;
    console.log('Fullscreen state changed:', this.isFullscreen);
  }

  onVideoError(event: Event): void {
    console.error('Video error:', event);
    this.hasError = true;
    this.error.emit(event);
  }

  onVideoLoaded(): void {
    console.log('Video loaded event triggered');
    this.hasError = false;
  }

  retryLoading(): void {
    this.hasError = false;

    // Force reload the video with a new timestamp to bypass cache
    if (this.videoElementRef?.nativeElement) {
      const video = this.videoElementRef.nativeElement;
      const currentSrc = video.querySelector('source')?.src;

      if (currentSrc) {
        // Remove old source
        while (video.firstChild) {
          video.removeChild(video.firstChild);
        }

        // Create new source with timestamp
        const newSrc = currentSrc.split('?')[0] + '?t=' + new Date().getTime();
        const source = document.createElement('source');
        source.src = newSrc;
        source.type = this.getVideoType(newSrc);

        // Add new source and reload
        video.appendChild(source);
        video.load();
      }
    }
  }

  private getVideoType(src: string): string {
    const extension = src.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
        return 'video/ogg';
      default:
        return 'video/mp4';
    }
  }

  onVideoPlay(): void {
    this.isPlaying = true;
    this.play.emit();
  }

  onVideoPause(): void {
    this.isPlaying = false;
    this.pause.emit();
  }

  onVideoEnded(): void {
    this.isPlaying = false;
    this.ended.emit();

    // If loop is enabled, the video will automatically restart
    if (!this.loop) {
      // Reset to beginning
      this.videoElementRef.nativeElement.currentTime = 0;
    }
  }

  // Public methods for external control
  playVideo(): void {
    if (this.videoElementRef?.nativeElement && this.videoElementRef.nativeElement.paused) {
      this.togglePlay();
    }
  }

  pauseVideo(): void {
    if (this.videoElementRef?.nativeElement && !this.videoElementRef.nativeElement.paused) {
      this.togglePlay();
    }
  }

  restartVideo(): void {
    if (this.videoElementRef?.nativeElement) {
      this.videoElementRef.nativeElement.currentTime = 0;
      this.playVideo();
    }
  }

  /**
   * Handle keyboard events for video control
   * - Space: Toggle play/pause
   * - Left Arrow: Seek backward 5 seconds
   * - Right Arrow: Seek forward 5 seconds
   * - F: Toggle fullscreen
   */
  /**
   * Handle focus event
   */
  onFocus(_event: FocusEvent): void {
    this.hasFocus = true;

    // Set this video as the active one
    if (this.id) {
      VideoPlayerComponent.activeVideoId = this.id;
      this.focused.emit(this.id);
    }

    // Add a visual indicator that the video has focus (for accessibility)
    if (this.videoContainerRef?.nativeElement) {
      this.videoContainerRef.nativeElement.classList.add('has-focus');
    }
  }

  /**
   * Handle blur event
   */
  onBlur(_event: FocusEvent): void {
    this.hasFocus = false;

    // Clear active video if this was the active one
    if (this.id && VideoPlayerComponent.activeVideoId === this.id) {
      VideoPlayerComponent.activeVideoId = null;
    }

    // Remove the visual focus indicator
    if (this.videoContainerRef?.nativeElement) {
      this.videoContainerRef.nativeElement.classList.remove('has-focus');
    }
  }

  /**
   * Handle keyboard events
   */
  onKeyDown(event: KeyboardEvent): void {
    // Check if the event target is an input field or textarea
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    // Don't process keyboard events if the user is typing in an input field
    if (isInputField) {
      return;
    }

    // Check if this is the active video player
    const isActiveVideo = !this.id ||
      VideoPlayerComponent.activeVideoId === this.id ||
      VideoPlayerComponent.activeVideoId === null;

    // If we have an ID and we're not the active video, don't process keyboard events
    // unless we're in fullscreen mode
    if (this.id && !isActiveVideo && !this.isFullscreen) {
      return;
    }

    // Special handling for F key - only process it when the video has focus
    // or when in fullscreen mode
    if (event.code === 'KeyF') {
      if (this.isFullscreen || this.hasFocus ||
        document.activeElement === this.videoElementRef?.nativeElement ||
        document.activeElement === this.videoContainerRef?.nativeElement) {
        event.preventDefault();
        this.enterExitFullscreen();
      }
      return;
    }

    // Always handle keyboard events when in fullscreen mode
    if (this.isFullscreen) {
      this.processKeyboardEvent(event);
      return;
    }

    // For non-fullscreen mode, only handle events when the video is focused
    // or when the video container has focus
    if (this.hasFocus ||
      document.activeElement === this.videoElementRef?.nativeElement ||
      document.activeElement === this.videoContainerRef?.nativeElement) {
      this.processKeyboardEvent(event);
    }
  }

  /**
   * Process keyboard events for video control
   *
   * Supported keyboard shortcuts:
   * - Space/K: Toggle play/pause
   * - Left Arrow: Seek backward 5 seconds
   * - Right Arrow: Seek forward 5 seconds
   * - Up Arrow: Increase volume by 10%
   * - Down Arrow: Decrease volume by 10%
   * - M: Toggle mute
   * - 0-9: Jump to 0-90% of the video
   * - Home: Jump to start of video
   * - End: Jump to end of video
   * - F: Toggle fullscreen (handled separately)
   */
  private processKeyboardEvent(event: KeyboardEvent): void {
    const video = this.videoElementRef?.nativeElement;
    if (!video) return;

    // Prevent default behavior for all handled keys
    switch (event.code) {
      case 'Space':
      case 'KeyK': // YouTube-style play/pause with K
        event.preventDefault();
        this.togglePlay();
        break;

      case 'ArrowLeft':
        event.preventDefault();
        // Seek backward 5 seconds (10 seconds if Shift is pressed)
        const backwardAmount = event.shiftKey ? 10 : 5;
        video.currentTime = Math.max(0, video.currentTime - backwardAmount);
        break;

      case 'ArrowRight':
        event.preventDefault();
        // Seek forward 5 seconds (10 seconds if Shift is pressed)
        const forwardAmount = event.shiftKey ? 10 : 5;
        video.currentTime = Math.min(video.duration, video.currentTime + forwardAmount);
        break;

      case 'ArrowUp':
        event.preventDefault();
        // Increase volume by 10%
        video.volume = Math.min(1, video.volume + 0.1);
        break;

      case 'ArrowDown':
        event.preventDefault();
        // Decrease volume by 10%
        video.volume = Math.max(0, video.volume - 0.1);
        break;

      case 'KeyM':
        event.preventDefault();
        // Toggle mute
        video.muted = !video.muted;
        break;

      case 'Home':
        event.preventDefault();
        // Jump to start of video
        video.currentTime = 0;
        break;

      case 'End':
        event.preventDefault();
        // Jump to end of video
        video.currentTime = video.duration;
        break;

      // Number keys 0-9 to jump to percentage of video
      case 'Digit0':
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
      case 'Digit7':
      case 'Digit8':
      case 'Digit9':
      case 'Numpad0':
      case 'Numpad1':
      case 'Numpad2':
      case 'Numpad3':
      case 'Numpad4':
      case 'Numpad5':
      case 'Numpad6':
      case 'Numpad7':
      case 'Numpad8':
      case 'Numpad9':
        event.preventDefault();
        // Extract the number from the key code
        const num = parseInt(event.code.replace('Digit', '').replace('Numpad', ''));
        // Jump to percentage of video (0 = 0%, 1 = 10%, ..., 9 = 90%)
        video.currentTime = video.duration * (num / 10);
        break;

      // Note: KeyF is handled separately in onKeyDown
    }
  }

  /**
   * When video metadata is loaded, generate a thumbnail from first frame
   */
  onMetadataLoaded(): void {
    if (this.generateThumbnail && !this.posterUrl && this.videoElementRef?.nativeElement) {
      const video = this.videoElementRef.nativeElement;

      // Add crossorigin attribute to allow canvas operations
      if (!video.hasAttribute('crossorigin')) {
        video.setAttribute('crossorigin', 'anonymous');
      }

      // Set current time to the first frame
      video.currentTime = 0.1;

      // Create a temporary canvas to capture the frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Listen for seeked event to capture the frame
      const seekedHandler = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            // Draw the video frame to the canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert the canvas to a data URL
            try {
              this.generatedPosterUrl = canvas.toDataURL('image/jpeg');

              // Set the poster directly
              video.poster = this.generatedPosterUrl;

              // Emit the generated thumbnail
              this.thumbnailGenerated.emit(this.generatedPosterUrl);
            } catch (e) {
              console.error('Error generating thumbnail:', e);
            }
          } catch (e) {
            console.error('Error drawing to canvas:', e);
          }
        }

        // Clean up
        video.removeEventListener('seeked', seekedHandler);
      };

      // Add seeked event listener
      video.addEventListener('seeked', seekedHandler);
    }
  }
}
