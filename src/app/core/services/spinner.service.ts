import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
    providedIn: 'root'
})
export class SpinnerService {
    private readonly DEFAULT_SPINNER = 'primary';
    private requestCount = 0;

    constructor(private spinner: NgxSpinnerService) { }

    /**
     * Shows the spinner
     * @param name The spinner name
     */
    show(name: string = this.DEFAULT_SPINNER) {
        this.requestCount++;
        this.spinner.show(name);
    }

    /**
     * Hides the spinner when all requests are completed
     * @param name The spinner name
     */
    hide(name: string = this.DEFAULT_SPINNER) {
        this.requestCount--;
        if (this.requestCount <= 0) {
            this.requestCount = 0;
            this.spinner.hide(name);
        }
    }
} 