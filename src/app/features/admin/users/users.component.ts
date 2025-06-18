import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin/admin.service';
import { User } from '../../../core/models/models';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';

@Component({
  standalone: true,
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule, MatDialogModule, FeatureHeaderComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  adminService = inject(AdminService);
  toastService = inject(SimpleToastService);
  dialog = inject(MatDialog);
  users: User[] = [];
  isLoading = false;

  editingUser: User | null = null;
  selectedStatus: 'active' | 'inactive' | 'suspended' = 'active';

  resetPasswordResult: { userId: string; tempPassword: string } | null = null;

  ngOnInit(): void {
    this.loadUsers();
  }

  // Fetches users from the API and populates the users array
  loadUsers(): void {
    this.isLoading = true;
    this.adminService.getUsers().subscribe({
      next: (data: User[]) => {
        this.users = data;
        this.isLoading = false;
      },
      error: err => {
        this.toastService.error('Failed to load users');
        this.isLoading = false;
      }
    });
  }

  // Displays confirmation dialog and deletes user upon confirmation
  deleteUser(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete User',
        message: 'Are you sure you want to delete this user? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.adminService.deleteUser(id).subscribe({
          next: () => {
            this.users = this.users.filter(u => u.id !== id);
            this.isLoading = false;
            this.toastService.success('User deleted successfully');
          },
          error: () => {
            this.toastService.error('Failed to delete user');
            this.isLoading = false;
          }
        });
      }
    });
  }

  // Prepares UI for editing a user's status
  startEditStatus(user: User): void {
    this.editingUser = { ...user };
    this.selectedStatus = user.status || 'active';
  }

  // Cancels the status editing process
  cancelEditStatus(): void {
    this.editingUser = null;
  }

  // Saves the updated user status to the backend
  saveUserStatus(): void {
    if (!this.editingUser) return;

    this.isLoading = true;
    this.adminService.updateUserStatus(this.editingUser.id, this.selectedStatus).subscribe({
      next: () => {
        const index = this.users.findIndex(u => u.id === this.editingUser!.id);
        if (index !== -1) {
          this.users[index].status = this.selectedStatus;
        }
        this.editingUser = null;
        this.isLoading = false;
        this.toastService.success(`User status updated to ${this.selectedStatus}`);
      },
      error: () => {
        this.toastService.error('Failed to update user status');
        this.isLoading = false;
      }
    });
  }

  // Initiates password reset process with confirmation
  resetPassword(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Reset Password',
        message: `Are you sure you want to reset the password for ${user.name}?`,
        confirmText: 'Reset',
        cancelText: 'Cancel'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.adminService.resetUserPassword(user.id).subscribe({
          next: (result) => {
            this.resetPasswordResult = {
              userId: user.id,
              tempPassword: result.tempPassword
            };
            this.isLoading = false;
            this.toastService.success('Password reset successfully');
          },
          error: () => {
            this.toastService.error('Failed to reset password');
            this.isLoading = false;
          }
        });
      }
    });
  }

  // Closes the password reset result modal
  closePasswordReset(): void {
    this.resetPasswordResult = null;
  }

  // Formats date string to localized format
  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }

  // Returns CSS class based on user status
  getStatusClass(status?: string): string {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'inactive': return 'text-yellow-500';
      case 'suspended': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  // Returns CSS class based on user role
  getRoleClass(role?: string): string {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-300';
      case 'scout': return 'bg-blue-500/20 text-blue-300';
      case 'player': return 'bg-green-500/20 text-green-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  }
}
