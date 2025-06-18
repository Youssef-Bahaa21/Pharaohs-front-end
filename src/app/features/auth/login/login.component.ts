import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AuthResponse, LoginRequest } from '../../../core/models/models';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FeatureHeaderComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  toastService = inject(SimpleToastService);

  // Login form with email and password validation
  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Processes login form submission and redirects based on user role
  login() {
    if (this.form.valid) {
      const credentials: LoginRequest = this.form.value;
      this.authService.login(credentials).subscribe({
        next: (response) => {
          const userRole = response.user?.role || this.authService.getCurrentUser()?.role;

          if (userRole === 'player') {
            // For players, redirect to profile page
            this.router.navigate(['/profile']);

            // message to update profile
            setTimeout(() => {
              this.toastService.info(
                'Please update your profile information to help scouts find you easily.',
                2500
              );
            }, 500);
          } else if (userRole === 'scout') {
            // For scouts, redirect to scout profile page
            this.router.navigate(['/scout/profile']);

            //  message to scouts
            setTimeout(() => {
              this.toastService.success(
                'Welcome back! Update your scout profile to enhance your scouting experience.',
                2500
              );
            }, 500);
          } else {
            // For admins, redirect to dashboard
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          if (err.status === 401) {
            this.toastService.error('Invalid email or password. Please try again.', 3000);
            this.form.get('password')?.setErrors({ 'incorrect': true });
          } else if (err.status === 404) {
            this.toastService.error('Account not found. Please check your email or register.', 3000);
            this.form.get('email')?.setErrors({ 'notFound': true });
          } else {
            this.toastService.error(err.error?.message || 'Login failed. Please try again later.', 3000);
          }
        }
      });
    } else {
      // Form validation errors
      if (this.form.get('email')?.hasError('required') || this.form.get('password')?.hasError('required')) {
        this.toastService.error('Please enter both email and password', 2500);
      } else if (this.form.get('email')?.hasError('email')) {
        this.toastService.error('Please enter a valid email address', 2500);
      } else if (this.form.get('password')?.hasError('minlength')) {
        this.toastService.error('Password must be at least 6 characters', 2500);
      }
    }
  }
}