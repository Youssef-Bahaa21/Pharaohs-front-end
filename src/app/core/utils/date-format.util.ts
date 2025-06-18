


import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'dateFormat',
    standalone: true
})
export class DateFormatUtil implements PipeTransform {
    transform(value: string | Date): string {
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}