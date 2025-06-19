export const environment = {
    production: false,
    apiUrl: window.location.hostname === 'localhost' ?
        'http://localhost:3000/api' :
        'https://pharaohs-be-production.up.railway.app/api',
    baseUrl: window.location.hostname === 'localhost' ?
        'http://localhost:3000' :
        'https://pharaohs-be-production.up.railway.app'
};