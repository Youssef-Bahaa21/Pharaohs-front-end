import { Injectable } from '@angular/core';
import { Cloudinary, CloudinaryImage, CloudinaryVideo } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { quality } from '@cloudinary/url-gen/actions/delivery';
import { format } from '@cloudinary/url-gen/actions/delivery';
import { auto } from '@cloudinary/url-gen/qualifiers/quality';
import { auto as autoFormat } from '@cloudinary/url-gen/qualifiers/format';

@Injectable({
    providedIn: 'root'
})
export class CloudinaryService {
    private cloudinary: Cloudinary;

    constructor() {
        // Initialize Cloudinary with the account details
        this.cloudinary = new Cloudinary({
            cloud: {
                cloudName: 'pharaohs',
            },
            url: {
                secure: true
            }
        });
    }

    /**
     * Check if a URL is from Cloudinary
     * @param url The URL to check
     * @returns boolean indicating whether the URL is from Cloudinary
     */
    isCloudinaryUrl(url: string): boolean {
        return url?.includes('cloudinary.com') || false;
    }

    /**
     * Extract the public ID from a Cloudinary URL
     * @param url The Cloudinary URL
     * @returns The public ID or null if not a valid Cloudinary URL
     */
    getPublicIdFromUrl(url: string): string | null {
        if (!url || !this.isCloudinaryUrl(url)) return null;

        try {
            // Extract the public ID from the URL
            const matches = url.match(/\/v\d+\/([^/]+)\.[^.]+$/);
            if (matches && matches[1]) {
                return matches[1];
            }
            return null;
        } catch (error) {
            console.error('Error extracting Cloudinary public ID:', error);
            return null;
        }
    }

    /**
     * Transform an image URL using Cloudinary
     * @param url The original image URL (can be Cloudinary or non-Cloudinary)
     * @param options Transformation options
     * @returns Transformed URL
     */
    transformImage(url: string, options?: {
        width?: number,
        height?: number,
        format?: 'auto' | 'webp' | 'jpg' | 'png',
        quality?: number
    }): string {
        if (!this.isCloudinaryUrl(url)) return url;

        const publicId = this.getPublicIdFromUrl(url);
        if (!publicId) return url;

        const image = this.cloudinary.image(publicId);

        if (options?.width && options?.height) {
            image.resize(fill().width(options.width).height(options.height));
        } else if (options?.width) {
            image.resize(fill().width(options.width));
        } else if (options?.height) {
            image.resize(fill().height(options.height));
        }

        // Set quality
        if (options?.quality) {
            image.delivery(quality(options.quality));
        } else {
            image.delivery(quality(auto()));
        }

        // Set format
        if (options?.format) {
            if (options.format === 'auto') {
                image.delivery(format(autoFormat()));
            } else {
                image.delivery(format(options.format));
            }
        } else {
            image.delivery(format(autoFormat()));
        }

        return image.toURL();
    }

    /**
     * Transform a video URL using Cloudinary
     * @param url The original video URL (can be Cloudinary or non-Cloudinary)
     * @param options Transformation options
     * @returns Transformed URL
     */
    transformVideo(url: string, options?: {
        width?: number,
        height?: number,
        quality?: 'auto' | 'low' | 'medium' | 'high'
    }): string {
        if (!this.isCloudinaryUrl(url)) return url;

        const publicId = this.getPublicIdFromUrl(url);
        if (!publicId) return url;

        const video = this.cloudinary.video(publicId);

        if (options?.width && options?.height) {
            video.resize(fill().width(options.width).height(options.height));
        } else if (options?.width) {
            video.resize(fill().width(options.width));
        } else if (options?.height) {
            video.resize(fill().height(options.height));
        }

        // Set quality
        if (options?.quality && options.quality !== 'auto') {
            video.delivery(quality(options.quality));
        } else {
            video.delivery(quality(auto()));
        }

        return video.toURL();
    }

    /**
     * Get a responsive image URL for different screen sizes
     * @param url The original image URL
     * @param breakpoints Width breakpoints to generate URLs for
     * @returns An object with URLs for different breakpoints
     */
    getResponsiveImageUrl(url: string, breakpoints: number[] = [320, 640, 960, 1280, 1920]): { [key: number]: string } {
        const result: { [key: number]: string } = {};

        breakpoints.forEach(width => {
            result[width] = this.transformImage(url, { width });
        });

        return result;
    }

    /**
     * Get an optimized thumbnail URL
     * @param url The original image URL
     * @param size The size of the thumbnail
     * @returns Optimized thumbnail URL
     */
    getThumbnailUrl(url: string, size: number = 100): string {
        return this.transformImage(url, {
            width: size,
            height: size,
            quality: 70,
            format: 'auto'
        });
    }
} 