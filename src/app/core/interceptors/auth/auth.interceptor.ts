import { HttpRequest, HttpHandlerFn, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const token = localStorage.getItem('auth_token');

  // Clone the request to add authorization header and CORS headers
  let authReq = req.clone({
    setHeaders: {
      // Add Authorization header if token exists
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Add CORS-related headers
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    // Ensure credentials are included
    withCredentials: true
  });

  return next(authReq);
};