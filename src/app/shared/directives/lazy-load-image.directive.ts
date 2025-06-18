import { Directive, ElementRef, Input, OnInit, Renderer2, OnDestroy, inject } from '@angular/core';
import { ImageOptimizationService, ImageOptions } from '../../core/services/image/image-optimization.service';

@Directive({
  selector: 'img[appLazyLoad]',
  standalone: true
})
export class LazyLoadImageDirective implements OnInit, OnDestroy {
  @Input() appLazyLoad!: string; // The actual image source
  @Input() placeholderSrc: string = 'assets/images/placeholder.svg'; // Default placeholder
  @Input() errorSrc: string = 'assets/images/error.svg'; // Default error image
  @Input() loadingClass: string = 'lazy-loading'; // CSS class during loading
  @Input() loadedClass: string = 'lazy-loaded'; // CSS class after loading
  @Input() errorClass: string = 'lazy-error'; // CSS class on error
  @Input() width?: number; // Desired width for optimization
  @Input() height?: number; // Desired height for optimization
  @Input() quality?: number; // Image quality (1-100)
  @Input() format?: 'webp' | 'jpeg' | 'png' | 'original'; // Image format

  private imageOptimizationService = inject(ImageOptimizationService);

  private observer!: IntersectionObserver;
  private isLoaded: boolean = false;
  private hasError: boolean = false;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private renderer: Renderer2
  ) { }

  ngOnInit(): void {
    // Set placeholder image
    this.renderer.setAttribute(this.el.nativeElement, 'src', this.placeholderSrc);
    this.renderer.addClass(this.el.nativeElement, this.loadingClass);

    // Create and configure the intersection observer
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoaded && !this.hasError) {
          this.loadImage();
        }
      });
    }, {
      rootMargin: '50px 0px', // Start loading when image is 50px from viewport
      threshold: 0.01 // Trigger when at least 1% of the image is visible
    });

    // Start observing the image element
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    // Clean up the observer when the directive is destroyed
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private loadImage(): void {
    // Create a new image element to preload the image
    const img = new Image();

    // Get optimized image URL
    const optimizedUrl = this.imageOptimizationService.optimizeUrl(this.appLazyLoad, {
      width: this.width,
      height: this.height,
      quality: this.quality,
      format: this.format
    });

    // Set up event handlers for the image loading
    img.onload = () => {
      this.renderer.removeClass(this.el.nativeElement, this.loadingClass);
      this.renderer.addClass(this.el.nativeElement, this.loadedClass);
      this.renderer.setAttribute(this.el.nativeElement, 'src', optimizedUrl);
      this.isLoaded = true;

      // Stop observing once the image is loaded
      this.observer.unobserve(this.el.nativeElement);
    };

    img.onerror = () => {
      this.renderer.removeClass(this.el.nativeElement, this.loadingClass);
      this.renderer.addClass(this.el.nativeElement, this.errorClass);
      this.renderer.setAttribute(this.el.nativeElement, 'src', this.errorSrc);
      this.hasError = true;

      // Stop observing on error
      this.observer.unobserve(this.el.nativeElement);
    };

    // Start loading the image
    img.src = optimizedUrl;
  }
}
