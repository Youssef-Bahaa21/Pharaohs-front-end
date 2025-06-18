import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fileUrl', standalone: true })
export class FileUrlPipe implements PipeTransform {
    transform(file: File): string {
        return URL.createObjectURL(file);
    }
}
