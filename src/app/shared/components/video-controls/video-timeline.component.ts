import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-timeline-container"
         [class.active]="isActive"
         [class.fullscreen]="isFullscreen"
         (mouseenter)="isActive = true"
         (mouseleave)="isActive = false">
      <div class="time-display" *ngIf="isActive">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </div>
      <div #progressContainer
           class="progress-container"
           (mousedown)="onProgressContainerClick($event)"
           (touchstart)="onTouchStart($event)"
           (keydown)="onKeyDown($event)"
           tabindex="0"
           role="slider"
           [attr.aria-label]="'Video progress'"
           [attr.aria-valuemin]="0"
           [attr.aria-valuemax]="duration"
           [attr.aria-valuenow]="currentTime"
           [attr.aria-valuetext]="formatTime(currentTime) + ' of ' + formatTime(duration)">
        <div class="progress-bar"
             [style.width.%]="(currentTime / duration) * 100">
        </div>
        <div class="progress-handle"
             [style.left.%]="(currentTime / duration) * 100"
             *ngIf="isActive">
        </div>
        <!-- Preview tooltip when hovering -->
        <div *ngIf="isActive && previewTime !== null"
             class="preview-tooltip"
             [style.left.%]="(previewTime / duration) * 100">
          {{ formatTime(previewTime) }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .video-timeline-container {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 10px;
      background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 10;
    }

    .video-timeline-container.fullscreen {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
    }

    .video-timeline-container.active {
      opacity: 1;
    }

    .time-display {
      color: white;
      font-size: 12px;
      margin-bottom: 5px;
      text-align: right;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    }

    .progress-container {
      position: relative;
      height: 5px;
      background-color: rgba(255,255,255,0.3);
      border-radius: 2px;
      cursor: pointer;
      overflow: visible;
      transition: height 0.2s ease;
      outline: none;
    }

    .progress-container:focus {
      height: 8px;
    }

    .progress-container:hover {
      height: 8px;
    }

    .progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background-color: #3B7F58;
      border-radius: 2px;
    }

    .progress-handle {
      position: absolute;
      top: 50%;
      width: 12px;
      height: 12px;
      background-color: #3B7F58;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 3px rgba(0,0,0,0.5);
      transition: transform 0.2s ease;
    }

    .progress-container:hover .progress-handle,
    .progress-container:focus .progress-handle {
      transform: translate(-50%, -50%) scale(1.2);
    }

    .preview-tooltip {
      position: absolute;
      bottom: 15px;
      transform: translateX(-50%);
      background-color: rgba(0,0,0,0.8);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      white-space: nowrap;
    }

    .preview-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -4px;
      border-width: 4px;
      border-style: solid;
      border-color: rgba(0,0,0,0.8) transparent transparent transparent;
    }
  `]
})
export class VideoTimelineComponent implements AfterViewInit, OnDestroy {
  @Input() videoElement!: HTMLVideoElement;
  @Input() isFullscreen: boolean = false;
  @ViewChild('progressContainer') progressContainer!: ElementRef;

  currentTime: number = 0;
  duration: number = 0;
  isActive: boolean = false;
  previewTime: number | null = null;

  private updateInterval: any;
  private isDragging: boolean = false;
  private touchDragging: boolean = false;
  private lastMoveEvent: MouseEvent | Touch | null = null;
  private boundHandlers: {
    metadataLoaded: any;
    timeUpdate: any;
    durationChange: any;
    mouseMove: any;
    mouseUp: any;
    touchMove: any;
    touchEnd: any;
    mouseOver: any;
    mouseOut: any;
  } = {} as any;

  ngAfterViewInit(): void {
    if (this.videoElement) {
      // Initialize values
      this.currentTime = this.videoElement.currentTime || 0;
      this.duration = this.videoElement.duration || 0;

      // Create bound event handlers to avoid memory leaks
      const boundMetadataLoaded = this.onMetadataLoaded.bind(this);
      const boundTimeUpdate = this.onTimeUpdate.bind(this);
      const boundDurationChange = this.onDurationChange.bind(this);
      const boundMouseMove = this.onDocumentMouseMove.bind(this);
      const boundMouseUp = this.onDocumentMouseUp.bind(this);
      const boundTouchMove = this.onDocumentTouchMove.bind(this);
      const boundTouchEnd = this.onDocumentTouchEnd.bind(this);
      const boundMouseOver = this.onMouseOver.bind(this);
      const boundMouseOut = this.onMouseOut.bind(this);

      // Store bound handlers for cleanup
      this.boundHandlers = {
        metadataLoaded: boundMetadataLoaded,
        timeUpdate: boundTimeUpdate,
        durationChange: boundDurationChange,
        mouseMove: boundMouseMove,
        mouseUp: boundMouseUp,
        touchMove: boundTouchMove,
        touchEnd: boundTouchEnd,
        mouseOver: boundMouseOver,
        mouseOut: boundMouseOut
      };

      // Set up event listeners
      this.videoElement.addEventListener('loadedmetadata', boundMetadataLoaded);
      this.videoElement.addEventListener('timeupdate', boundTimeUpdate);
      this.videoElement.addEventListener('durationchange', boundDurationChange);

      // Add mouse hover events for preview
      if (this.progressContainer?.nativeElement) {
        this.progressContainer.nativeElement.addEventListener('mousemove', boundMouseOver);
        this.progressContainer.nativeElement.addEventListener('mouseout', boundMouseOut);
      }

      // Set up interval for smoother updates
      this.updateInterval = setInterval(() => {
        if (!this.isDragging && !this.touchDragging && !this.videoElement.paused) {
          this.currentTime = this.videoElement.currentTime;
        }
      }, 50);

      // Add document-level event listeners for dragging
      document.addEventListener('mousemove', boundMouseMove);
      document.addEventListener('mouseup', boundMouseUp);
      document.addEventListener('touchmove', boundTouchMove, { passive: false });
      document.addEventListener('touchend', boundTouchEnd);
    }
  }

  ngOnDestroy(): void {
    if (this.videoElement && this.boundHandlers) {
      // Clean up event listeners
      this.videoElement.removeEventListener('loadedmetadata', this.boundHandlers.metadataLoaded);
      this.videoElement.removeEventListener('timeupdate', this.boundHandlers.timeUpdate);
      this.videoElement.removeEventListener('durationchange', this.boundHandlers.durationChange);

      // Remove mouse hover events
      if (this.progressContainer?.nativeElement) {
        this.progressContainer.nativeElement.removeEventListener('mousemove', this.boundHandlers.mouseOver);
        this.progressContainer.nativeElement.removeEventListener('mouseout', this.boundHandlers.mouseOut);
      }

      // Clear interval
      clearInterval(this.updateInterval);

      // Remove document-level event listeners
      document.removeEventListener('mousemove', this.boundHandlers.mouseMove);
      document.removeEventListener('mouseup', this.boundHandlers.mouseUp);
      document.removeEventListener('touchmove', this.boundHandlers.touchMove);
      document.removeEventListener('touchend', this.boundHandlers.touchEnd);
    }
  }

  // Mouse hover preview
  onMouseOver(event: MouseEvent): void {
    if (!this.isDragging && !this.touchDragging) {
      const rect = this.progressContainer.nativeElement.getBoundingClientRect();
      const position = (event.clientX - rect.left) / rect.width;
      this.previewTime = Math.max(0, Math.min(position * this.duration, this.duration));
    }
  }

  onMouseOut(): void {
    if (!this.isDragging && !this.touchDragging) {
      this.previewTime = null;
    }
  }

  onMetadataLoaded(): void {
    this.duration = this.videoElement.duration;
  }

  onTimeUpdate(): void {
    if (!this.isDragging) {
      this.currentTime = this.videoElement.currentTime;
    }
  }

  onDurationChange(): void {
    this.duration = this.videoElement.duration;
  }

  /**
   * Handle keyboard events for the timeline
   * - Left/Right arrows: Seek backward/forward
   * - Home/End: Jump to start/end
   */
  onKeyDown(event: KeyboardEvent): void {
    if (!this.videoElement) return;

    switch (event.code) {
      case 'ArrowLeft':
        event.preventDefault();
        // Seek backward 5 seconds (10 seconds if Shift is pressed)
        const backwardAmount = event.shiftKey ? 10 : 5;
        this.videoElement.currentTime = Math.max(0, this.videoElement.currentTime - backwardAmount);
        break;

      case 'ArrowRight':
        event.preventDefault();
        // Seek forward 5 seconds (10 seconds if Shift is pressed)
        const forwardAmount = event.shiftKey ? 10 : 5;
        this.videoElement.currentTime = Math.min(this.duration, this.videoElement.currentTime + forwardAmount);
        break;

      case 'Home':
        event.preventDefault();
        // Jump to start
        this.videoElement.currentTime = 0;
        break;

      case 'End':
        event.preventDefault();
        // Jump to end
        this.videoElement.currentTime = this.duration;
        break;
    }
  }

  /**
   * Handle mouse click on the progress bar
   */
  onProgressContainerClick(event: MouseEvent): void {
    this.isDragging = true;
    this.updateTimeFromMousePosition(event);
  }

  /**
   * Handle touch start on the progress bar
   */
  onTouchStart(event: TouchEvent): void {
    event.preventDefault(); // Prevent scrolling
    this.touchDragging = true;
    this.lastMoveEvent = event.touches[0];
    this.updateTimeFromTouchPosition(event.touches[0]);
  }

  /**
   * Handle document mouse move for dragging
   */
  onDocumentMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.lastMoveEvent = event;
      this.updateTimeFromMousePosition(event);
    }
  }

  /**
   * Handle document touch move for dragging
   */
  onDocumentTouchMove(event: TouchEvent): void {
    if (this.touchDragging) {
      event.preventDefault(); // Prevent scrolling
      this.lastMoveEvent = event.touches[0];
      this.updateTimeFromTouchPosition(event.touches[0]);
    }
  }

  /**
   * Handle document mouse up to end dragging
   */
  onDocumentMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * Handle document touch end to end dragging
   */
  onDocumentTouchEnd(): void {
    this.touchDragging = false;
  }

  /**
   * Update video time based on mouse position
   */
  updateTimeFromMousePosition(event: MouseEvent): void {
    if (!this.progressContainer || !this.videoElement) return;

    const rect = this.progressContainer.nativeElement.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(position * this.duration, this.duration));

    this.currentTime = newTime;
    this.videoElement.currentTime = newTime;
  }

  /**
   * Update video time based on touch position
   */
  updateTimeFromTouchPosition(touch: Touch): void {
    if (!this.progressContainer || !this.videoElement) return;

    const rect = this.progressContainer.nativeElement.getBoundingClientRect();
    const position = (touch.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(position * this.duration, this.duration));

    this.currentTime = newTime;
    this.videoElement.currentTime = newTime;
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
