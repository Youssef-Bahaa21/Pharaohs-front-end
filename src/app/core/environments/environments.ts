export const environment = {
    production: false,
    apiUrl: window.location.hostname === 'localhost' ?
        'http://localhost:3000/api' :
        'https://pharaoh-s-backend.railway.app/api',
    baseUrl: window.location.hostname === 'localhost' ?
        'http://localhost:3000' :
        'https://pharaoh-s-backend.railway.app'
};