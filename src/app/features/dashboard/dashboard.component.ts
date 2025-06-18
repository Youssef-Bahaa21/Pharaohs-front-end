import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Chart from 'chart.js/auto';
import { PlayerService } from '../../core/services/player/player.service';
import { ScoutService } from '../../core/services/scout/scout.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { AdminService } from '../../core/services/admin/admin.service';
import { RouterLink, RouterModule } from '@angular/router';
import { DateFormatUtil } from '../../core/utils/date-format.util';
import { VideoPlayerComponent } from '../../shared/components/video-player/video-player.component';
import { FormsModule } from '@angular/forms';
import { FeatureHeaderComponent } from '../../shared/components/feature-header/feature-header.component';
import { SimpleToastService } from '../../shared/components/toast/simple-toast.service';
import { DashboardData, MediaItem } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DateFormatUtil, RouterModule, RouterLink, VideoPlayerComponent, FormsModule, FeatureHeaderComponent],
  templateUrl: './dashboard.component.html',
  styles: []
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // Injected services
  playerService = inject(PlayerService);
  scoutService = inject(ScoutService);
  authService = inject(AuthService);
  adminService = inject(AdminService);
  sanitizer = inject(DomSanitizer);
  cdr = inject(ChangeDetectorRef);
  toastService = inject(SimpleToastService);

  // Dashboard data properties
  dashboardData: DashboardData['data'] = {};
  role: string = '';
  playerStats: any = null;
  scoutEfficiency: any = {
    acceptanceRate: 0,
    pendingRate: 0,
    rejectionRate: 0,
    totalInvites: 0,
    shortlistedPlayers: 0
  };
  timelineData: any[] = [];
  mediaByTypeData: any = { video: 0, image: 0 };

  // Chart properties
  @ViewChild('dashboardChart') chartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | undefined;
  showCanvas: boolean = false;
  chartData: { labels: string[]; datasets: any[] } = { labels: [], datasets: [] };
  chartType: string = 'bar';
  analyticsMetric: string = 'default';
  private resizeTimeout: any;

  // Location management properties
  showLocationManager: boolean = false;
  locations: string[] = [];
  newLocation: string = '';
  isLoadingLocations: boolean = false;
  isAddingLocation: boolean = false;
  isDeletingLocation: string | null = null;
  showValidationError: boolean = false;

  // Lifecycle methods
  // -------------------------------------------------------------------------

  // Initializes dashboard data and loads analytics data based on user role
  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.role = currentUser?.role || 'admin';
    this.loadDashboardData();

    if (this.role === 'player') {
      this.loadPlayerAnalytics();
    } else if (this.role === 'scout') {
      this.loadScoutAnalytics();
    }
  }

  // Initializes chart when modal is opened
  ngAfterViewInit(): void {
  }

  // Destroys chart on component destroy
  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  // Handles window resize to resize the chart
  @HostListener('window:resize')
  onResize(): void {
    if (this.showCanvas && this.chart) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.executeChart();
      }, 100);
    }
  }

  // Data loading methods
  // -------------------------------------------------------------------------

  // Loads dashboard data based on user role
  loadDashboardData(): void {
    this.playerService.getDashboardData().subscribe({
      next: (response) => {
        this.role = response.role || this.role;
        this.dashboardData = response.data || {};
        this.dashboardData.recentMedia = this.dashboardData.recentMedia?.map((item: MediaItem) => ({
          ...item,
          url: item.url.startsWith('http') ? item.url : `http://localhost:3000${item.url}`
        })) || [];
        this.generateChartData();
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        this.toastService.error('Failed to load dashboard data');
        this.dashboardData = {};
      }
    });
  }

  // Loads player-specific analytics data
  loadPlayerAnalytics(): void {
    this.playerService.getPlayerStats().subscribe({
      next: (stats) => {
        this.playerStats = stats;

        if (this.dashboardData.recentMedia?.length) {
          this.dashboardData.recentMedia.forEach((media: any) => {
            if (media.type === 'video') this.mediaByTypeData.video++;
            else if (media.type === 'image') this.mediaByTypeData.image++;
          });
        }

        this.generateTimelineData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error('Failed to load player analytics');
      }
    });
  }

  // Loads scout-specific analytics data
  loadScoutAnalytics(): void {
    this.playerService.getScoutInvitations().subscribe({
      next: (invitations) => {
        const totalInvites = invitations.length;
        const accepted = invitations.filter(inv => inv.status === 'accepted').length;
        const rejected = invitations.filter(inv => inv.status === 'rejected').length;
        const pending = invitations.filter(inv => inv.status === 'pending').length;

        this.scoutEfficiency = {
          acceptanceRate: totalInvites ? (accepted / totalInvites) * 100 : 0,
          rejectionRate: totalInvites ? (rejected / totalInvites) * 100 : 0,
          pendingRate: totalInvites ? (pending / totalInvites) * 100 : 0,
          totalInvites: totalInvites,
          shortlistedPlayers: 0
        };

        this.updateTimelineData();

        this.scoutService.getShortlist().subscribe({
          next: (shortlist) => {
            this.scoutEfficiency.shortlistedPlayers = shortlist.length;
            this.cdr.detectChanges();
          }
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error('Failed to load scout analytics');
      }
    });
  }

  // Helper methods
  // -------------------------------------------------------------------------

  // Sanitizes URL for secure display of media
  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // Handles media loading errors
  onMediaError(event: Event, url: string): void {
    this.toastService.error('Media playback error. Unable to load media.');
  }

  // Resets timeline data
  updateTimelineData(): void {
    this.timelineData = [];
    this.cdr.detectChanges();
  }

  // Calculates percentage of users by role
  getUserPercentage(userCount: number): number {
    const totalUsers = this.dashboardData.totalUsers || 0;
    if (totalUsers === 0) return 0;
    return (userCount / totalUsers) * 100;
  }

  // Analytics and chart methods
  // -------------------------------------------------------------------------

  // Opens analytics canvas modal and initializes chart
  openCanvas(): void {
    this.showCanvas = true;
    this.showLocationManager = false;

    if (this.role === 'player') {
      this.analyticsMetric = 'media_type';
      this.chartType = 'pie';
    } else if (this.role === 'scout') {
      this.analyticsMetric = 'invitation_stats';
      this.chartType = 'pie';
    } else {
      this.analyticsMetric = 'default';
      this.chartType = 'bar';
    }

    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.chartRef && this.chartRef.nativeElement) {
        this.generateChartData();
        this.executeChart();
      } else {
        this.toastService.error('Failed to initialize chart canvas');
      }
    }, 150);
  }

  // Closes analytics canvas and destroys chart
  closeCanvas(): void {
    this.showCanvas = false;
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
    this.cdr.detectChanges();
  }

  // Sets chart type based on selected analytics metric
  setChartTypeForMetric(metric: string): void {
    switch (metric) {
      case 'media_type':
      case 'invitation_stats':
        this.chartType = 'pie';
        break;
      case 'performance':
      case 'activity_overview':
        this.chartType = 'bar';
        break;

      case 'invitations':
        this.chartType = 'doughnut';
        break;
      default:
        this.chartType = 'bar';
    }
  }

  // Updates chart when analytics metric changes
  changeAnalyticsMetric(metric: string): void {
    this.analyticsMetric = metric;
    this.setChartTypeForMetric(metric);
    this.generateChartData();
    this.executeChart();
  }

  // Generates chart data based on user role
  generateChartData(): void {
    if (this.role === 'player') {
      this.generatePlayerChartData();
    } else if (this.role === 'scout') {
      this.generateScoutChartData();
    } else if (this.role === 'admin') {
      this.generateAdminChartData();
    } else {
      this.chartData = { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
  }

  // Generates player-specific chart data based on selected metric
  generatePlayerChartData(): void {
    switch (this.analyticsMetric) {
      case 'media_timeline':
        if (this.dashboardData.recentMedia?.length) {
          const mediaByDate = new Map();
          this.dashboardData.recentMedia.forEach((item: any) => {
            const date = new Date(item.createdAt).toLocaleDateString();
            if (!mediaByDate.has(date)) mediaByDate.set(date, 0);
            mediaByDate.set(date, mediaByDate.get(date) + 1);
          });

          this.chartData = {
            labels: Array.from(mediaByDate.keys()),
            datasets: [{
              label: 'Media Uploads Timeline',
              data: Array.from(mediaByDate.values()),
              backgroundColor: 'rgba(34, 197, 94, 0.6)'
            }]
          };
        } else {
          this.chartData = { labels: ['No Media Data'], datasets: [{ data: [0] }] };
        }
        break;

      case 'media_type':
        this.chartData = {
          labels: ['Videos', 'Images'],
          datasets: [{
            label: 'Media by Type',
            data: [this.mediaByTypeData.video, this.mediaByTypeData.image],
            backgroundColor: ['rgba(59, 130, 246, 0.6)', 'rgba(139, 92, 246, 0.6)']
          }]
        };
        break;

      case 'performance':
        if (this.playerStats?.performanceStats) {
          const stats = this.playerStats.performanceStats;
          this.chartData = {
            labels: ['Matches', 'Goals', 'Assists', 'Yellow Cards', 'Red Cards'],
            datasets: [{
              label: 'Performance Stats',
              data: [
                stats.matches_played,
                stats.goals,
                stats.assists,
                stats.yellow_cards,
                stats.red_cards
              ],
              backgroundColor: [
                'rgba(34, 197, 94, 0.6)',
                'rgba(59, 130, 246, 0.6)',
                'rgba(139, 92, 246, 0.6)',
                'rgba(249, 115, 22, 0.6)',
                'rgba(236, 72, 153, 0.6)'
              ]
            }]
          };
        } else {
          this.chartData = { labels: ['No Performance Data'], datasets: [{ data: [0] }] };
        }
        break;

      case 'invitations':
        this.chartData = {
          labels: ['Media', 'Total Invitations', 'Pending Invitations'],
          datasets: [{
            label: 'Activity Overview',
            data: [
              this.playerStats?.mediaCount || 0,
              this.playerStats?.invitationCount || 0,
              this.playerStats?.pendingCount || 0
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.6)',
              'rgba(59, 130, 246, 0.6)',
              'rgba(249, 115, 22, 0.6)'
            ]
          }]
        };
        break;

      default:
        if (this.dashboardData.recentMedia?.length) {
          this.chartData = {
            labels: this.dashboardData.recentMedia.map((v: MediaItem) => new Date(v.createdAt).toLocaleDateString()),
            datasets: [{
              label: 'Recent Media',
              data: Array(this.dashboardData.recentMedia.length).fill(1),
              backgroundColor: 'rgba(34, 197, 94, 0.6)'
            }]
          };
        } else {
          this.chartData = { labels: ['No Media Available'], datasets: [{ data: [0] }] };
        }
    }
  }

  // Generates scout-specific chart data based on selected metric
  generateScoutChartData(): void {
    switch (this.analyticsMetric) {
      case 'invitation_stats':
        this.chartData = {
          labels: ['Accepted', 'Pending', 'Rejected'],
          datasets: [{
            label: 'Invitation Status Breakdown',
            data: [
              this.scoutEfficiency.acceptanceRate.toFixed(1),
              this.scoutEfficiency.pendingRate.toFixed(1),
              this.scoutEfficiency.rejectionRate.toFixed(1)
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.6)',
              'rgba(249, 115, 22, 0.6)',
              'rgba(236, 72, 153, 0.6)'
            ]
          }]
        };
        break;

      case 'activity_overview':
        this.chartData = {
          labels: ['Tryouts', 'Invitations', 'Shortlisted Players'],
          datasets: [{
            label: 'Scouting Activity',
            data: [
              this.dashboardData.tryoutCount || 0,
              this.scoutEfficiency.totalInvites,
              this.scoutEfficiency.shortlistedPlayers
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.6)',
              'rgba(59, 130, 246, 0.6)',
              'rgba(139, 92, 246, 0.6)'
            ]
          }]
        };
        break;

      default:
        if (this.dashboardData.recentTryouts?.length) {
          this.chartData = {
            labels: this.dashboardData.recentTryouts.map((t: any) => t.name),
            datasets: [{
              label: 'Recent Tryouts',
              data: Array(this.dashboardData.recentTryouts.length).fill(1),
              backgroundColor: 'rgba(34, 197, 94, 0.6)'
            }]
          };
        } else {
          this.chartData = { labels: ['No Tryout Data'], datasets: [{ data: [0] }] };
        }
    }
  }

  // Generates admin-specific chart data
  generateAdminChartData(): void {
    if (this.dashboardData.userBreakdown?.length) {
      this.chartData = {
        labels: this.dashboardData.userBreakdown.map((u: any) => u.role),
        datasets: [{
          label: 'User Distribution',
          data: this.dashboardData.userBreakdown.map((u: any) => u.userCount || 0),
          backgroundColor: [
            'rgba(34, 197, 94, 0.6)',
            'rgba(59, 130, 246, 0.6)',
            'rgba(139, 92, 246, 0.6)'
          ]
        }]
      };
    } else {
      this.chartData = { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
  }

  // Generates timeline data for activity visualization
  generateTimelineData(): void {
    const today = new Date();
    const dates: string[] = [];
    const mediaData: number[] = [];
    const inviteData: number[] = [];

    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString());
      mediaData.push(0);
      inviteData.push(0);
    }

    if (this.dashboardData.recentMedia?.length) {
      this.dashboardData.recentMedia.forEach((media: any) => {
        const mediaDate = new Date(media.createdAt).toLocaleDateString();
        const index = dates.indexOf(mediaDate);
        if (index !== -1) {
          mediaData[index]++;
        }
      });
    }

    this.timelineData = dates.map((date, index) => {
      return {
        date,
        media: mediaData[index],
        invites: inviteData[index]
      };
    });
  }

  // Creates and renders the chart
  executeChart(): void {
    if (!this.chartRef || !this.chartRef.nativeElement) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.chart) this.chart.destroy();

      const container = this.chartRef.nativeElement.parentElement;
      if (container) {
        this.chartRef.nativeElement.width = container.clientWidth;
        this.chartRef.nativeElement.height = container.clientHeight;
      }

      Chart.register({
        id: 'centerTextPlugin',
        beforeDraw: (chart: any) => {
          const centerText = chart.options.plugins.centerText;
          if (centerText && centerText.display && chart.config.type === 'doughnut') {
            const ctx = chart.ctx;
            const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
            const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const textLines = Array.isArray(centerText.text) ?
              centerText.text :
              [centerText.text];

            const fontSize = chart.height / 14;
            const lineHeight = fontSize * 1.2;
            const totalHeight = lineHeight * textLines.length;
            const startY = centerY - (totalHeight / 2) + (lineHeight / 2);

            textLines.forEach((line: string, i: number) => {
              ctx.font = `${centerText.fontStyle || 'normal'} ${fontSize}px sans-serif`;
              ctx.fillStyle = centerText.color || '#000';
              ctx.fillText(
                line,
                centerX,
                startY + (i * lineHeight),
                chart.innerRadius * 2 - centerText.sidePadding * 2
              );
            });
          }
        }
      });

      const chartColors = [
        'rgba(34, 197, 94, 0.6)',
        'rgba(59, 130, 246, 0.6)',
        'rgba(139, 92, 246, 0.6)',
        'rgba(249, 115, 22, 0.6)',
        'rgba(236, 72, 153, 0.6)',
        'rgba(244, 63, 94, 0.6)',
        'rgba(250, 204, 21, 0.6)',
        'rgba(6, 182, 212, 0.6)'
      ];

      const datasets = this.chartData.datasets.map((dataset, i) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor ||
          (Array.isArray(dataset.data)
            ? dataset.data.map((_: any, j: number) => chartColors[j % chartColors.length])
            : chartColors[i % chartColors.length])
      }));

      const chartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 20
        },
        scales: {},
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: {
                size: 12
              },
              padding: 15,
              boxWidth: 15
            }
          },
          title: {
            display: true,
            text: this.getChartTitle(),
            color: 'rgba(255, 255, 255, 0.9)',
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(34, 197, 94, 0.6)',
            borderWidth: 1,
            padding: 8,
            displayColors: true
          }
        }
      };

      if (this.chartType === 'horizontalBar') {
        chartOptions.scales = {
          x: {
            beginAtZero: true,
            stacked: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          y: {
            stacked: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              autoSkip: false,
              maxRotation: 0,
              font: {
                size: 11
              }
            }
          }
        };
      } else if (this.chartType === 'bar' || this.chartType === 'line') {
        chartOptions.scales = {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              maxRotation: 45
            }
          }
        };
      }

      this.chart = new Chart(ctx, {
        type: this.chartType as any,
        data: {
          labels: this.chartData.labels,
          datasets: datasets
        },
        options: chartOptions
      });
    }
  }

  // Gets chart title based on user role and selected metric
  getChartTitle(): string {
    if (this.role === 'player') {
      switch (this.analyticsMetric) {
        case 'media_timeline': return 'Media Upload Timeline';
        case 'media_type': return 'Media Types Distribution';
        case 'performance': return 'Performance Statistics';
        case 'invitations': return 'Activity Overview';
        default: return 'Player Analytics';
      }
    } else if (this.role === 'scout') {
      switch (this.analyticsMetric) {
        case 'invitation_stats': return 'Invitation Response Rates (%)';
        case 'activity_overview': return 'Scouting Activity Overview';
        default: return 'Scout Analytics';
      }
    } else if (this.role === 'admin') {
      return 'Platform Usage Statistics';
    }
    return 'Analytics';
  }

  // Gets chart label based on user role
  getChartLabel(): string {
    if (this.role === 'player') return 'Media Uploads Over Time';
    if (this.role === 'scout') return 'Recent Tryouts';
    if (this.role === 'admin') return 'User Role Breakdown';
    return 'Statistics';
  }

  // Location management methods
  // -------------------------------------------------------------------------

  // Opens location manager modal
  openLocationManager(): void {
    this.showLocationManager = true;
    this.showCanvas = false;
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
    this.loadLocations();
    this.cdr.detectChanges();
  }

  // Closes location manager modal
  closeLocationManager(): void {
    this.showLocationManager = false;
    this.newLocation = '';
    this.isAddingLocation = false;
    this.showValidationError = false;
    this.isDeletingLocation = null;
    this.cdr.detectChanges();
  }

  // Loads available tryout locations from API
  loadLocations(): void {
    if (this.role !== 'admin') return;

    this.isLoadingLocations = true;
    this.adminService.getTryoutLocations().subscribe({
      next: (locations) => {
        this.locations = locations;
        this.isLoadingLocations = false;
      },
      error: (error) => {
        console.error('Error loading locations:', error);
        this.toastService.error('Failed to load locations');
        this.isLoadingLocations = false;
      }
    });
  }

  // Adds a new tryout location
  addLocation(): void {
    if (!this.newLocation || this.newLocation.trim() === '') {
      this.showValidationError = true;
      this.toastService.error('Please enter a location name');
      return;
    }

    // Reset validation error
    this.showValidationError = false;

    this.isAddingLocation = true;
    this.adminService.addTryoutLocation(this.newLocation.trim()).subscribe({
      next: (response) => {
        this.toastService.success('Location added successfully');
        this.locations.push(response.location);
        this.locations.sort(); // Keep locations sorted alphabetically
        this.newLocation = '';
        this.isAddingLocation = false;
      },
      error: (error) => {
        console.error('Error adding location:', error);
        let errorMessage = 'Failed to add location';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        this.toastService.error(errorMessage);
        this.isAddingLocation = false;
        this.showValidationError = true;
      }
    });
  }

  // Deletes a tryout location after confirmation
  deleteLocation(location: string): void {
    if (!confirm(`Are you sure you want to delete the location "${location}"?`)) {
      return;
    }

    this.isDeletingLocation = location;
    this.adminService.deleteTryoutLocation(location).subscribe({
      next: () => {
        this.toastService.success('Location deleted successfully');
        this.locations = this.locations.filter(loc => loc !== location);
        this.isDeletingLocation = null;
      },
      error: (error) => {
        console.error('Error deleting location:', error);
        let errorMessage = 'Failed to delete location';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        this.toastService.error(errorMessage);
        this.isDeletingLocation = null;
      }
    });
  }
}