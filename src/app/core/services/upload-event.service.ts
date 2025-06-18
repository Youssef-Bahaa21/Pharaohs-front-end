import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UploadEventService {
  private uploadSubject = new Subject<void>();
  uploadCompleted$ = this.uploadSubject.asObservable();

  notifyUploadCompleted(): void {
    this.uploadSubject.next();
  }
}