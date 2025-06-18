import { Component, Input, OnInit, ElementRef, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lazy-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-container" [class.loaded]="isLoaded">
      <!-- Placeholder -->
      <div 
        *ngIf="!isLoaded" 
        class="placeholder"
        [style.background-color]="placeholderColor">
        <div class="spinner"></div>
      </div>
      
      <!-- Actual image -->
      <img
        [src]="src"
        [alt]="alt"
        [class.hidden]="!isLoaded"
        (load)="onImageLoaded()"
        [class]="imgClass"
      />
    </div>
  `,
  styles: [`
    .image-container {
      position: relative;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
    
    .placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f5f5f5;
      transition: opacity 0.3s ease;
    }
    
    .spinner {
      width: 30px;
      height: 30px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #4CAF50;
      animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.3s ease;
    }
    
    img.hidden {
      opacity: 0;
    }
    
    .loaded .placeholder {
      opacity: 0;
      pointer-events: none;
    }
  `]
})
export class LazyImageComponent implements OnInit {
  @Input() src: string = '';
  @Input() alt: string = '';
  @Input() imgClass: string = '';
  @Input() placeholderColor: string = '#f5f5f5';

  isLoaded: boolean = false;

  constructor(private el: ElementRef) { }

  ngOnInit(): void {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (!this.isLoaded) {
              const img = new Image();
              img.src = this.src;
              img.onload = () => this.onImageLoaded();
            }
            observer.unobserve(this.el.nativeElement);
          }
        });
      }, { threshold: 0.1 });

      observer.observe(this.el.nativeElement);
    } else {
      this.isLoaded = false;
    }
  }

  onImageLoaded(): void {
    this.isLoaded = true;
  }
} 