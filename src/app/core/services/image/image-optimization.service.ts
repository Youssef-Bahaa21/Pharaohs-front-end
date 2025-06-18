import { Injectable } from '@angular/core';

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'original';
  blur?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImageOptimizationService {
  private readonly defaultOptions: ImageOptions = {
    width: undefined,
    height: undefined,
    quality: 80,
    format: 'webp',
    blur: 0
  };

  /**
   * @param url 
   * @param options 
   * @returns 
   */
  optimizeUrl(url: string, options?: Partial<ImageOptions>): string {
    if (!this.isLocalUrl(url)) {
      return url;
    }

    const mergedOptions = { ...this.defaultOptions, ...options };
    const params = new URLSearchParams();

    if (mergedOptions.width) {
      params.append('w', mergedOptions.width.toString());
    }

    if (mergedOptions.height) {
      params.append('h', mergedOptions.height.toString());
    }

    if (mergedOptions.quality && mergedOptions.quality !== 80) {
      params.append('q', mergedOptions.quality.toString());
    }

    if (mergedOptions.format && mergedOptions.format !== 'original') {
      params.append('fmt', mergedOptions.format);
    }

    if (mergedOptions.blur && mergedOptions.blur > 0) {
      params.append('blur', mergedOptions.blur.toString());
    }

    if (params.toString() === '') {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  /**
   * @param url 
   * @param size
   * @returns 
   */
  getThumbnail(url: string, size: number = 100): string {
    return this.optimizeUrl(url, {
      width: size,
      height: size,
      quality: 70
    });
  }

  /**
   * @param url 
   * @param width 
   * @param height 
   * @returns 
   */
  getResponsiveImage(url: string, width: number, height?: number): string {
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const actualWidth = Math.round(width * pixelRatio);
    const actualHeight = height ? Math.round(height * pixelRatio) : undefined;

    return this.optimizeUrl(url, {
      width: actualWidth,
      height: actualHeight
    });
  }

  /**
   * @param url 
   * @returns 
   */
  private isLocalUrl(url: string): boolean {
    return url.includes('localhost') || url.startsWith('/');
  }
}
