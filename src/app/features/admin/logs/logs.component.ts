import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, LogFilter, SystemLog } from '../../../core/services/admin/admin.service';
import { SimpleToastService } from '../../../shared/components/toast/simple-toast.service';
import { FeatureHeaderComponent } from '../../../shared/components/feature-header/feature-header.component';

@Component({
  standalone: true,
  selector: 'app-admin-logs',
  imports: [CommonModule, FormsModule, FeatureHeaderComponent],
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit {
  adminService = inject(AdminService);
  toastService = inject(SimpleToastService);

  logs: SystemLog[] = [];
  totalLogs = 0;
  currentPage = 1;
  pageSize = 20;

  // Make Math available in the template
  Math = Math;

  // Filters state
  filter: LogFilter = {
    startDate: '',
    endDate: '',
    action: '',
    entityType: '',
    limit: this.pageSize,
    offset: 0
  };

  // Filter dropdown options
  actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'RESET_PASSWORD'];
  entityTypes = ['user', 'video', 'comment', 'invitation'];

  isLoading = false;

  ngOnInit(): void {
    this.loadLogs();
  }

  // Fetch system logs with current filter parameters
  loadLogs(): void {
    this.isLoading = true;
    this.filter.offset = (this.currentPage - 1) * this.pageSize;
    this.filter.limit = this.pageSize;

    this.adminService.getSystemLogs(this.filter).subscribe({
      next: (response) => {
        this.logs = response.logs;
        this.totalLogs = response.pagination.total;
        this.isLoading = false;
      },
      error: (err) => {
        this.toastService.error('Failed to load system logs');
        this.isLoading = false;
      }
    });
  }

  // Apply the current filter settings and reload data
  applyFilters(): void {
    this.currentPage = 1;
    this.loadLogs();
    this.toastService.info('Filters applied');
  }

  // Clear all filter settings and reload data
  resetFilters(): void {
    this.filter = {
      startDate: '',
      endDate: '',
      action: '',
      entityType: '',
      limit: this.pageSize,
      offset: 0
    };
    this.currentPage = 1;
    this.loadLogs();
    this.toastService.info('Filters reset');
  }

  // Navigate to next page of results
  nextPage(): void {
    if (this.currentPage * this.pageSize < this.totalLogs) {
      this.currentPage++;
      this.loadLogs();
    }
  }

  // Navigate to previous page of results
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  // Format timestamp to readable date string
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  // Format JSON details into readable text
  parseDetails(details: string): string {
    try {
      const parsed = JSON.parse(details);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return details;
    }
  }

  // Get CSS class for different action types
  getActionClass(action: string): string {
    switch (action) {
      case 'CREATE': return 'bg-green-500/20 text-green-300';
      case 'UPDATE': return 'bg-blue-500/20 text-blue-300';
      case 'DELETE': return 'bg-red-500/20 text-red-300';
      case 'RESET_PASSWORD': return 'bg-yellow-500/20 text-yellow-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  }

  // Get CSS class for different entity types
  getEntityClass(entityType: string): string {
    switch (entityType) {
      case 'user': return 'text-purple-300';
      case 'video': return 'text-blue-300';
      case 'comment': return 'text-green-300';
      case 'invitation': return 'text-yellow-300';
      default: return 'text-gray-300';
    }
  }
}
