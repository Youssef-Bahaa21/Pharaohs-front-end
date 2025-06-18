import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';

export interface CompressionOptions {
    // Image options
    imageMaxWidth?: number;
    imageMaxHeight?: number;
    imageQuality?: number;  // 0-100
    imageFormat?: 'image/webp' | 'image/jpeg' | 'image/png';

    // Video options
    videoMaxWidth?: number;
    videoMaxHeight?: number;
    videoQuality?: number; // 0-100
    videoFormat?: 'video/webm' | 'video/mp4';
    videoBitrate?: number; // in bits per second
    videoFrameRate?: number;
}

@Injectable({
    providedIn: 'root'
})
export class FileCompressionService {
    // Default compression options
    private readonly defaultOptions: CompressionOptions = {
        imageMaxWidth: 1920,
        imageMaxHeight: 1080,
        imageQuality: 80,
        imageFormat: 'image/webp',

        videoMaxWidth: 1280,
        videoMaxHeight: 720,
        videoQuality: 70,
        videoFormat: 'video/webm',
        videoBitrate: 1500000, // 1.5 Mbps
        videoFrameRate: 30
    };

    /**
     * Compress a file (image or video) before uploading
     * @param file The original File object
     * @param options Compression options
     * @returns An Observable that emits the compressed file
     */
    compressFile(file: File, options: Partial<CompressionOptions> = {}): Observable<File> {
        // Merge with defaults
        const mergedOptions = { ...this.defaultOptions, ...options };

        // Determine file type and compress accordingly
        if (file.type.startsWith('image/')) {
            return from(this.compressImage(file, mergedOptions));
        } else if (file.type.startsWith('video/')) {
            return from(this.compressVideo(file, mergedOptions));
        }

        // If not an image or video, return the original file
        return from(Promise.resolve(file));
    }

    /**
     * Compress an image using canvas
     * @param file The original image file
     * @param options Compression options
     * @returns A Promise that resolves to the compressed file
     */
    private async compressImage(file: File, options: CompressionOptions): Promise<File> {
        return new Promise<File>((resolve, reject) => {
            // Create an image element to load the file
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (event) => {
                img.onload = () => {
                    // Calculate dimensions that maintain aspect ratio
                    let width = img.width;
                    let height = img.height;

                    // Resize if necessary
                    if (width > options.imageMaxWidth!) {
                        height = Math.round(height * (options.imageMaxWidth! / width));
                        width = options.imageMaxWidth!;
                    }

                    if (height > options.imageMaxHeight!) {
                        width = Math.round(width * (options.imageMaxHeight! / height));
                        height = options.imageMaxHeight!;
                    }

                    // Create canvas and draw resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to desired format with quality setting
                    const format = options.imageFormat || 'image/webp';
                    const quality = options.imageQuality! / 100;

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Could not create Blob from canvas'));
                                return;
                            }

                            // Create a new file with the compressed blob
                            const compressedFile = new File(
                                [blob],
                                this.changeFileExtension(file.name, format),
                                { type: format }
                            );

                            console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
                            resolve(compressedFile);
                        },
                        format,
                        quality
                    );
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                // Load the image from the file reader result
                img.src = event.target?.result as string;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            // Read the file as a data URL
            reader.readAsDataURL(file);
        });
    }

    /**
     * Compress a video using MediaRecorder API
     * @param file The original video file
     * @param options Compression options
     * @returns A Promise that resolves to the compressed file
     */
    private async compressVideo(file: File, options: CompressionOptions): Promise<File> {
        return new Promise<File>((resolve, reject) => {
            // Create a video element to load the file
            const video = document.createElement('video');
            const reader = new FileReader();

            reader.onload = (event) => {
                // Set up video element
                video.autoplay = false;
                video.muted = true;
                video.playsInline = true;
                video.preload = 'metadata';

                // Handle video loaded
                video.onloadedmetadata = async () => {
                    try {
                        // Create canvas for processing
                        const canvas = document.createElement('canvas');

                        // Calculate dimensions that maintain aspect ratio
                        let width = video.videoWidth;
                        let height = video.videoHeight;

                        // Resize if necessary
                        if (width > options.videoMaxWidth!) {
                            height = Math.round(height * (options.videoMaxWidth! / width));
                            width = options.videoMaxWidth!;
                        }

                        if (height > options.videoMaxHeight!) {
                            width = Math.round(width * (options.videoMaxHeight! / height));
                            height = options.videoMaxHeight!;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            reject(new Error('Could not get canvas context'));
                            return;
                        }

                        // Set up MediaRecorder
                        const stream = canvas.captureStream(options.videoFrameRate);

                        // Choose codec and options
                        const mimeType = options.videoFormat || 'video/webm';
                        const codecOptions = {
                            mimeType: `${mimeType};codecs=vp8`,
                            videoBitsPerSecond: options.videoBitrate
                        };

                        // Check if codec is supported
                        if (!MediaRecorder.isTypeSupported(codecOptions.mimeType)) {
                            console.warn(`${codecOptions.mimeType} is not supported, falling back to video/webm`);
                            codecOptions.mimeType = 'video/webm';
                        }

                        // Create MediaRecorder
                        const mediaRecorder = new MediaRecorder(stream, codecOptions);
                        const chunks: Blob[] = [];

                        // Handle data available
                        mediaRecorder.ondataavailable = (e) => {
                            if (e.data.size > 0) {
                                chunks.push(e.data);
                            }
                        };

                        // Handle recording stopped
                        mediaRecorder.onstop = () => {
                            // Create blob from chunks
                            const blob = new Blob(chunks, { type: mimeType });

                            // Create a new file with the compressed blob
                            const compressedFile = new File(
                                [blob],
                                this.changeFileExtension(file.name, mimeType),
                                { type: mimeType }
                            );

                            console.log(`Video compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

                            // Clean up
                            video.remove();
                            canvas.remove();

                            resolve(compressedFile);
                        };

                        // Start recording
                        mediaRecorder.start(1000); // Collect data in chunks of 1s

                        // Play the video
                        await video.play();

                        // Process video frames
                        const processFrame = () => {
                            if (!video.paused && !video.ended) {
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                requestAnimationFrame(processFrame);
                            }
                        };

                        processFrame();

                        // Stop when video ends
                        video.onended = () => {
                            mediaRecorder.stop();
                        };

                        // Error handling
                        video.onerror = (e) => {
                            mediaRecorder.stop();
                            reject(new Error(`Video error: ${e}`));
                        };

                        // Handle timeouts
                        setTimeout(() => {
                            if (mediaRecorder.state === 'recording') {
                                video.pause();
                                mediaRecorder.stop();
                            }
                        }, 180000); // 3 minute safety timeout

                    } catch (err) {
                        reject(err);
                    }
                };

                video.onerror = () => {
                    reject(new Error('Failed to load video'));
                };

                // Set the video source
                video.src = event.target?.result as string;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            // Read the file as a data URL
            reader.readAsDataURL(file);
        });
    }

    /**
     * Change file extension based on the new MIME type
     * @param filename Original filename
     * @param mimetype New MIME type
     * @returns Filename with updated extension
     */
    private changeFileExtension(filename: string, mimetype: string): string {
        const extension = mimetype.split('/')[1];
        return filename.split('.').slice(0, -1).join('.') + '.' + extension;
    }
} 