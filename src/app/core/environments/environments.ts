export const environment = {
    production: false,
    apiUrl: window.location.hostname === 'localhost' ?
        'http://localhost:3000/api' :
        `http://${window.location.hostname}:3000/api`,
    baseUrl: window.location.hostname === 'localhost' ?
        'http://localhost:3000' :
        `http://${window.location.hostname}:3000`
};