import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';

export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const toastService = inject(SimpleToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const errorMessage = getErrorMessage(error);

      if (error.status === 401) {
        toastService.error('Your session has expired. Please log in again.');
        router.navigate(['/login']);
      } else if (error.status === 403) {
        toastService.error('You do not have permission to access this resource.');
        router.navigate(['/unauthorized']);
      } else if (error.status === 0) {
        // Network error or server not responding
        toastService.error('Cannot connect to the server. Please check your internet connection.');
      } else if (error.status >= 500) {
        // Server error
        toastService.error('Server error. Please try again later.');
      } else {
        // Other client errors
        toastService.error(errorMessage);
        console.error('API Error:', error);
      }

      return throwError(() => error);
    })
  );
};


function getErrorMessage(error: HttpErrorResponse): string {
  // Try to get the error message from the response
  if (error.error?.message) {
    return error.error.message;
  }

  // If there's an error object with a message
  if (typeof error.error === 'object' && error.error !== null) {
    if (error.error.error) {
      return error.error.error;
    }
  }

  // If the error is a string
  if (typeof error.error === 'string') {
    return error.error;
  }

  // Default error messages based on status code
  switch (error.status) {
    case 400:
      return 'Bad request. Please check your input.';
    case 401:
      return 'Unauthorized. Please log in.';
    case 403:
      return 'Forbidden. You do not have permission.';
    case 404:
      return 'Resource not found.';
    case 409:
      return 'Conflict with existing data.';
    case 422:
      return 'Validation error. Please check your input.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 0:
      return 'Network error. Please check your connection.';
    default:
      return `An error occurred (${error.status}). Please try again.`;
  }
}
