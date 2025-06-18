import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LazyLoadImageDirective } from './lazy-load-image.directive';
import { LazyLoadVideoDirective } from './lazy-load-video.directive';

@NgModule({
  imports: [
    CommonModule,
    LazyLoadImageDirective,
    LazyLoadVideoDirective
  ],
  exports: [
    LazyLoadImageDirective,
    LazyLoadVideoDirective
  ]
})
export class LazyLoadModule {}
