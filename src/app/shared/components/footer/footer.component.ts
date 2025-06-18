import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-footer',
  imports: [CommonModule,RouterLink],
  templateUrl: './footer.component.html'
})
export class FooterComponent { }
