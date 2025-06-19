import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { RegisterRequest } from '../../../core/models/models';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FeatureHeaderComponent],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  toastService = inject(SimpleToastService);

  // Date picker options
  days: number[] = [];
  months: number[] = [];
  years: number[] = [];
  currentYear: number = new Date().getFullYear();

  // Current date string for date picker max attribute
  today: string = new Date().toISOString().split('T')[0];

  // Registration form with validation
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    role: ['player', Validators.required], // default or selectable role
    dobDay: ['', Validators.required],
    dobMonth: ['', Validators.required],
    dobYear: ['', Validators.required]
  });

  ngOnInit() {
    // Generate days 1-31
    this.days = Array.from({ length: 31 }, (_, i) => i + 1);

    // Generate months 1-12
    this.months = Array.from({ length: 12 }, (_, i) => i + 1);

    // Generate years from 100 years ago to current year
    const startYear = this.currentYear - 100;
    this.years = Array.from({ length: 101 }, (_, i) => startYear + i).reverse();
  }

  // Processes registration form submission with validation
  register() {
    if (this.form.invalid) {
      this.toastService.warning('Please fill in all required fields correctly.');
      return;
    }

    const name = this.form.get('name')?.value as string;
    const email = this.form.get('email')?.value as string;
    const password = this.form.get('password')?.value as string;
    const confirmPassword = this.form.get('confirmPassword')?.value as string;
    const role = this.form.get('role')?.value as string;

    // Create date string from separate inputs
    const day = this.padZero(this.form.get('dobDay')?.value as string);
    const month = this.padZero(this.form.get('dobMonth')?.value as string);
    const year = this.form.get('dobYear')?.value as string;
    const date_of_birth = `${year}-${month}-${day}`;

    if (password !== confirmPassword) {
      this.toastService.error('Passwords do not match');
      return;
    }

    const requestData: RegisterRequest = { name, email, password, confirmPassword, role, date_of_birth };
    this.authService.register(requestData).subscribe({
      next: () => {
        this.toastService.success('Registration successful! Please log in.');
        this.router.navigate(['/login']);
      },
      error: err => this.toastService.error(err.error?.message || 'Registration failed')
    });
  }

  // Helper function to pad single digit numbers with a leading zero
  private padZero(value: string): string {
    return value.length < 2 ? `0${value}` : value;
  }
}