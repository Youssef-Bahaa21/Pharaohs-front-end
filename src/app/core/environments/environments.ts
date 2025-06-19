export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000/api',
    cloudinary: {
        cloudName: 'dk0szadna',
        uploadPreset: 'pharaohs_uploads'
    },
    videoConfig: {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime']
    },
    imageConfig: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    }
};