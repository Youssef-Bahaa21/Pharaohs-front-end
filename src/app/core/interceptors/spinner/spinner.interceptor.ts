import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { SpinnerService } from '../../services/spinner.service';

export const spinnerInterceptor: HttpInterceptorFn = (req, next) => {
    const spinnerService = inject(SpinnerService);

    // Show spinner for all HTTP requests
    spinnerService.show();

    return next(req).pipe(
        finalize(() => {
            // Hide spinner when request completes
            spinnerService.hide();
        })
    );
}; 