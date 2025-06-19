import { HttpRequest, HttpHandlerFn, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const token = localStorage.getItem('auth_token');

  // Check if request is a file upload (has FormData body)
  const isFileUpload = req.body instanceof FormData;

  // Prepare headers based on request type
  const headers: Record<string, string> = {
    // Add Authorization header if token exists
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Add X-Requested-With header
    'X-Requested-With': 'XMLHttpRequest'
  };

  // Only set Content-Type for non-FormData requests
  // When using FormData, the browser will automatically set the correct
  // multipart/form-data Content-Type with boundary
  if (!isFileUpload) {
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';
  }

  // Clone the request with the appropriate headers
  const authReq = req.clone({
    setHeaders: headers,
    // Ensure credentials are included
    withCredentials: true
  });

  console.log(`[Auth Interceptor] Request to ${req.url}, Content-Type: ${authReq.headers.get('Content-Type') || 'auto-set by browser'}`);

  return next(authReq);
};