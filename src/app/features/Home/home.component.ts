import { Component, OnInit, AfterViewInit, ElementRef, Renderer2, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit {

  constructor(private renderer: Renderer2, private el: ElementRef) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initFaqToggles();
    this.initParallaxEffect();
    this.initScrollAnimations();
    this.initTimelineProgress();

    setTimeout(() => {
      this.handleScrollAnimations();
    }, 300);
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    this.handleParallaxEffect();
    this.handleScrollAnimations();
    this.handleTimelineProgress();
  }

  private initFaqToggles(): void {
    const faqToggles = document.querySelectorAll('.faq-toggle');

    faqToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const content = toggle.nextElementSibling as HTMLElement;
        const icon = toggle.querySelector('.faq-icon') as HTMLElement;

        // Close other FAQs
        faqToggles.forEach(otherToggle => {
          if (otherToggle !== toggle) {
            const otherContent = otherToggle.nextElementSibling as HTMLElement;
            const otherIcon = otherToggle.querySelector('.faq-icon') as HTMLElement;

            if (!otherContent.classList.contains('hidden')) {
              otherContent.style.maxHeight = '0';
              setTimeout(() => {
                otherContent.classList.add('hidden');
                this.renderer.setStyle(otherIcon, 'transform', 'rotate(0deg)');
              }, 300);
            }
          }
        });

        // Toggle current FAQ
        if (content.classList.contains('hidden')) {
          content.classList.remove('hidden');
          this.renderer.setStyle(icon, 'transform', 'rotate(180deg)');

          content.style.maxHeight = '0';
          setTimeout(() => {
            content.style.maxHeight = content.scrollHeight + 'px';
          }, 10);
        } else {
          content.style.maxHeight = '0';
          setTimeout(() => {
            content.classList.add('hidden');
            this.renderer.setStyle(icon, 'transform', 'rotate(0deg)');
          }, 300);
        }
      });
    });
  }

  private initParallaxEffect(): void {
    this.handleParallaxEffect();
  }

  private handleParallaxEffect(): void {
    const scrollPosition = window.scrollY;
    const heroElement = this.el.nativeElement.querySelector('.hero-parallax');

    if (heroElement) {
      const translateY = scrollPosition * 0.3;
      this.renderer.setStyle(heroElement, 'transform', `translate3d(0, ${translateY}px, 0) scale(1.02)`);
    }
  }

  private initScrollAnimations(): void {
    const elementsToAnimate = this.el.nativeElement.querySelectorAll('.animate-on-scroll');

    elementsToAnimate.forEach((element: HTMLElement) => {
      if (!element.classList.contains('animate-visible')) {
        element.style.opacity = '0';
      }
    });
  }

  private handleScrollAnimations(): void {
    const animatedElements = this.el.nativeElement.querySelectorAll('.animate-on-scroll');
    const windowHeight = window.innerHeight;

    animatedElements.forEach((element: HTMLElement) => {
      const elementTop = element.getBoundingClientRect().top;
      const elementVisible = 150;

      if (elementTop < windowHeight - elementVisible) {
        element.classList.add('animate-visible');
      }
    });
  }

  private initTimelineProgress(): void {
    this.handleTimelineProgress();
  }

  private handleTimelineProgress(): void {
    const timelineSection = this.el.nativeElement.querySelector('.timeline-connector');
    const progressBar = this.el.nativeElement.querySelector('.timeline-progress');

    if (timelineSection && progressBar) {
      const sectionTop = timelineSection.getBoundingClientRect().top;
      const sectionHeight = timelineSection.offsetHeight;
      const windowHeight = window.innerHeight;

      let progress = 0;

      if (sectionTop < windowHeight) {
        if (sectionTop + sectionHeight < windowHeight) {
          progress = 1;
        } else {
          progress = (windowHeight - sectionTop) / sectionHeight;
          progress = Math.min(1, Math.max(0, progress));
        }
      }

      this.renderer.setStyle(progressBar, 'width', `${progress * 100}%`);
    }
  }
}
