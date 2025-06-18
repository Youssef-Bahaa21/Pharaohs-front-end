import { Directive, ElementRef, Input, OnInit, Renderer2, OnDestroy } from '@angular/core';

@Directive({
  selector: 'video[appLazyLoadVideo]',
  standalone: true
})
export class LazyLoadVideoDirective implements OnInit, OnDestroy {
  @Input() appLazyLoadVideo!: string; // The actual video source
  @Input() posterSrc: string = 'assets/images/video-placeholder.jpg'; // Default poster image
  @Input() loadingClass: string = 'lazy-loading'; // CSS class during loading
  @Input() loadedClass: string = 'lazy-loaded'; // CSS class after loading
  @Input() errorClass: string = 'lazy-error'; // CSS class on error
  @Input() autoplay: boolean = false; // Whether to autoplay the video when loaded
  @Input() muted: boolean = true; // Whether the video should be muted
  @Input() loop: boolean = false; // Whether the video should loop
  @Input() controls: boolean = true; // Whether to show video controls
  @Input() autoGeneratePoster: boolean = true; // Whether to automatically generate a poster from the first frame

  private observer!: IntersectionObserver;
  private isLoaded: boolean = false;
  private hasError: boolean = false;
  private sourceElement!: HTMLSourceElement;
  private isFullscreen: boolean = false;
  private posterGenerated: boolean = false;

  constructor(
    private el: ElementRef<HTMLVideoElement>,
    private renderer: Renderer2
  ) { }

  ngOnInit(): void {
    // Set poster image only if it's provided or we're not auto-generating
    if (this.posterSrc) {
      this.renderer.setAttribute(this.el.nativeElement, 'poster', this.posterSrc);
    }

    this.renderer.addClass(this.el.nativeElement, this.loadingClass);

    // Set video attributes
    if (this.autoplay) {
      this.renderer.setAttribute(this.el.nativeElement, 'autoplay', '');
    }
    if (this.muted) {
      this.renderer.setAttribute(this.el.nativeElement, 'muted', '');
    }
    if (this.loop) {
      this.renderer.setAttribute(this.el.nativeElement, 'loop', '');
    }
    if (this.controls) {
      this.renderer.setAttribute(this.el.nativeElement, 'controls', '');
    }

    // Add fullscreen change event listeners
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange.bind(this));

    // Create and configure the intersection observer
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoaded && !this.hasError) {
          this.loadVideo();
        }
      });
    }, {
      rootMargin: '100px 0px', // Start loading when video is 100px from viewport
      threshold: 0.01 // Trigger when at least 1% of the video is visible
    });

    // Start observing the video element
    this.observer.observe(this.el.nativeElement);
  }

  // Handle fullscreen change events
  private handleFullscreenChange(): void {
    // Check if we're in fullscreen mode
    this.isFullscreen = !!document.fullscreenElement;

    // If we're in fullscreen and this is the video that's fullscreen
    if (this.isFullscreen &&
      (document.fullscreenElement === this.el.nativeElement ||
        document.fullscreenElement === this.el.nativeElement.parentElement)) {
      // Show controls when in fullscreen
      this.renderer.setAttribute(this.el.nativeElement, 'controls', '');
    } else if (!this.isFullscreen && !this.controls) {
      // Hide controls when exiting fullscreen (if controls should be hidden)
      this.renderer.removeAttribute(this.el.nativeElement, 'controls');
    }
  }

  ngOnDestroy(): void {
    // Clean up the observer when the directive is destroyed
    if (this.observer) {
      this.observer.disconnect();
    }

    // Remove fullscreen event listeners
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
    document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange.bind(this));
  }

  private loadVideo(): void {
    // Validate the URL before attempting to load
    if (!this.appLazyLoadVideo || this.appLazyLoadVideo.includes('undefined')) {
      console.error('Invalid video URL:', this.appLazyLoadVideo);
      this.renderer.removeClass(this.el.nativeElement, this.loadingClass);
      this.renderer.addClass(this.el.nativeElement, this.errorClass);
      this.hasError = true;
      this.observer.unobserve(this.el.nativeElement);
      return;
    }

    // Add timestamp to URL to prevent caching issues
    const url = this.appLazyLoadVideo.includes('?')
      ? `${this.appLazyLoadVideo}&t=${new Date().getTime()}`
      : `${this.appLazyLoadVideo}?t=${new Date().getTime()}`;

    // Set crossorigin attribute before loading the video
    this.renderer.setAttribute(this.el.nativeElement, 'crossorigin', 'anonymous');

    // Create a source element if it doesn't exist
    if (!this.sourceElement) {
      this.sourceElement = this.renderer.createElement('source');
      this.renderer.setAttribute(this.sourceElement, 'src', url);
      this.renderer.setAttribute(this.sourceElement, 'type', this.getVideoType(url));
      this.renderer.appendChild(this.el.nativeElement, this.sourceElement);
    }

    // If we're auto-generating a poster and no poster was provided, set up a listener for loadedmetadata
    if (this.autoGeneratePoster && !this.posterSrc && !this.posterGenerated) {
      // Add crossOrigin attribute to video element
      this.renderer.setAttribute(this.el.nativeElement, 'crossorigin', 'anonymous');

      const generatePoster = () => {
        // Create a canvas element to capture the video frame
        const canvas = document.createElement('canvas');
        canvas.width = this.el.nativeElement.videoWidth;
        canvas.height = this.el.nativeElement.videoHeight;

        // Draw the current frame to the canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            ctx.drawImage(this.el.nativeElement, 0, 0, canvas.width, canvas.height);

            try {
              // Generate a data URL from the canvas
              const dataUrl = canvas.toDataURL('image/jpeg');

              // Set the poster attribute
              this.renderer.setAttribute(this.el.nativeElement, 'poster', dataUrl);
              this.posterGenerated = true;
            } catch (e) {
              console.error('Error generating poster:', e);
              // Use a fallback poster if available
              if (this.posterSrc) {
                this.renderer.setAttribute(this.el.nativeElement, 'poster', this.posterSrc);
              }
            }
          } catch (e) {
            console.error('Error drawing to canvas:', e);
          }
        }

        // Clean up
        this.el.nativeElement.removeEventListener('seeked', generatePoster);
      };

      // Set the current time to a small value to ensure we get a visible frame
      this.el.nativeElement.addEventListener('loadedmetadata', () => {
        this.el.nativeElement.currentTime = 0.1;
        this.el.nativeElement.addEventListener('seeked', generatePoster);
      });
    }

    // Set up event handlers for the video loading
    const handleVideoLoaded = () => {
      console.log('LazyLoadVideoDirective: Video loaded');
      this.renderer.removeClass(this.el.nativeElement, this.loadingClass);
      this.renderer.addClass(this.el.nativeElement, this.loadedClass);
      this.isLoaded = true;

      // Stop observing once the video is loaded
      this.observer.unobserve(this.el.nativeElement);

      // Add click event listener to show/hide controls
      this.el.nativeElement.addEventListener('click', (event: Event) => {
        // Only handle direct clicks on the video, not on child elements
        if (event.target === this.el.nativeElement) {
          // Toggle controls
          if (this.el.nativeElement.hasAttribute('controls')) {
            this.renderer.removeAttribute(this.el.nativeElement, 'controls');
          } else {
            this.renderer.setAttribute(this.el.nativeElement, 'controls', '');
          }
        }
      });

      // Add ended event listener to reset video
      this.el.nativeElement.addEventListener('ended', () => {
        // Reset video to beginning
        this.el.nativeElement.currentTime = 0;

        // Remove controls when video ends
        if (this.el.nativeElement.hasAttribute('controls')) {
          this.renderer.removeAttribute(this.el.nativeElement, 'controls');
        }
      });
    };

    // Add multiple event listeners to ensure the loaded event is captured
    this.el.nativeElement.onloadeddata = handleVideoLoaded;
    this.el.nativeElement.onloadedmetadata = handleVideoLoaded;
    this.el.nativeElement.oncanplay = handleVideoLoaded;
    this.el.nativeElement.oncanplaythrough = handleVideoLoaded;

    // Add a safety timeout to mark the video as loaded after 5 seconds
    setTimeout(() => {
      if (!this.isLoaded) {
        console.log('LazyLoadVideoDirective: Forcing video loaded state after timeout');
        handleVideoLoaded();
      }
    }, 5000);

    this.el.nativeElement.onerror = (event) => {
      console.error('Error loading video:', this.appLazyLoadVideo, event);
      this.renderer.removeClass(this.el.nativeElement, this.loadingClass);
      this.renderer.addClass(this.el.nativeElement, this.errorClass);
      this.hasError = true;

      // Create a fallback message
      const fallbackMessage = this.renderer.createElement('div');
      this.renderer.setStyle(fallbackMessage, 'position', 'absolute');
      this.renderer.setStyle(fallbackMessage, 'top', '0');
      this.renderer.setStyle(fallbackMessage, 'left', '0');
      this.renderer.setStyle(fallbackMessage, 'width', '100%');
      this.renderer.setStyle(fallbackMessage, 'height', '100%');
      this.renderer.setStyle(fallbackMessage, 'display', 'flex');
      this.renderer.setStyle(fallbackMessage, 'align-items', 'center');
      this.renderer.setStyle(fallbackMessage, 'justify-content', 'center');
      this.renderer.setStyle(fallbackMessage, 'background-color', 'rgba(0,0,0,0.7)');
      this.renderer.setStyle(fallbackMessage, 'color', 'white');
      this.renderer.setStyle(fallbackMessage, 'text-align', 'center');
      this.renderer.setStyle(fallbackMessage, 'padding', '20px');

      const messageText = this.renderer.createText('Video failed to load. Please try again later.');
      this.renderer.appendChild(fallbackMessage, messageText);

      // Add to parent element
      const parent = this.el.nativeElement.parentElement;
      if (parent) {
        this.renderer.appendChild(parent, fallbackMessage);
      }

      // Stop observing on error
      this.observer.unobserve(this.el.nativeElement);
    };

    // Load the video
    this.el.nativeElement.load();
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
}
