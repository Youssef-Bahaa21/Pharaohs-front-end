import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureHeaderComponent } from '../../shared/components/feature-header/feature-header.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, FeatureHeaderComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {

}
