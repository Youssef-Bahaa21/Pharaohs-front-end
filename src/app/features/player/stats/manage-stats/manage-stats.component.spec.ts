import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ManageStatsComponent } from './manage-stats.component';
import { PlayerService } from '../../../../core/services/player/player.service';

describe('ManageStatsComponent', () => {
  let component: ManageStatsComponent;
  let fixture: ComponentFixture<ManageStatsComponent>;
  let playerServiceSpy: jasmine.SpyObj<PlayerService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('PlayerService', ['getPlayerStats', 'updatePerformanceStats']);
    
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, ManageStatsComponent],
      providers: [
        { provide: PlayerService, useValue: spy }
      ]
    }).compileComponents();

    playerServiceSpy = TestBed.inject(PlayerService) as jasmine.SpyObj<PlayerService>;
    
    // Mock the getPlayerStats method
    playerServiceSpy.getPlayerStats.and.returnValue(of({
      mediaCount: 5,
      invitationCount: 2,
      pendingCount: 1,
      performanceStats: {
        matches_played: 10,
        goals: 5,
        assists: 3,
        yellow_cards: 2,
        red_cards: 0
      }
    }));
    
    fixture = TestBed.createComponent(ManageStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load player stats on init', () => {
    expect(playerServiceSpy.getPlayerStats).toHaveBeenCalled();
    expect(component.statsForm.value).toEqual({
      matches_played: 10,
      goals: 5,
      assists: 3,
      yellow_cards: 2,
      red_cards: 0
    });
  });

  it('should calculate efficiency rating correctly', () => {
    // Set form values
    component.statsForm.setValue({
      matches_played: 10,
      goals: 5,
      assists: 3,
      yellow_cards: 2,
      red_cards: 0
    });
    
    // (5*2 + 3 - 2 - 0*3) / 10 = 11/10 = 1.1
    // (1.1 + 3) * 10 = 41
    expect(component.calculateEfficiency()).toBeCloseTo(41, 0);
  });

  it('should handle form submission with valid data', () => {
    // Set form values
    component.statsForm.setValue({
      matches_played: 10,
      goals: 5,
      assists: 3,
      yellow_cards: 2,
      red_cards: 0
    });
    
    // Mock successful update
    playerServiceSpy.updatePerformanceStats.and.returnValue(of({
      message: 'Performance statistics updated successfully',
      stats: {
        matches_played: 10,
        goals: 5,
        assists: 3,
        yellow_cards: 2,
        red_cards: 0
      }
    }));
    
    // Spy on alert
    spyOn(window, 'alert');
    
    // Submit form
    component.saveStats();
    
    // Verify service was called with correct data
    expect(playerServiceSpy.updatePerformanceStats).toHaveBeenCalledWith({
      matches_played: 10,
      goals: 5,
      assists: 3,
      yellow_cards: 2,
      red_cards: 0
    });
    
    // Verify alert was shown
    expect(window.alert).toHaveBeenCalledWith('Statistics updated successfully');
    
    // Verify loading state was reset
    expect(component.isSaving).toBeFalse();
  });

  it('should handle errors when updating stats', () => {
    // Set form values
    component.statsForm.setValue({
      matches_played: 10,
      goals: 5,
      assists: 3,
      yellow_cards: 2,
      red_cards: 0
    });
    
    // Mock error response
    playerServiceSpy.updatePerformanceStats.and.returnValue(throwError(() => new Error('Server error')));
    
    // Spy on console.error and alert
    spyOn(console, 'error');
    spyOn(window, 'alert');
    
    // Submit form
    component.saveStats();
    
    // Verify error handling
    expect(console.error).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Failed to update your statistics');
    expect(component.isSaving).toBeFalse();
  });

  it('should validate form input', () => {
    // Set invalid values (negative numbers)
    component.statsForm.setValue({
      matches_played: -1,
      goals: 5,
      assists: 3,
      yellow_cards: 2,
      red_cards: 0
    });
    
    // Form should be invalid
    expect(component.statsForm.valid).toBeFalse();
    
    // Spy on alert
    spyOn(window, 'alert');
    
    // Try to submit form
    component.saveStats();
    
    // Service should not be called
    expect(playerServiceSpy.updatePerformanceStats).not.toHaveBeenCalled();
    
    // Alert should be shown
    expect(window.alert).toHaveBeenCalledWith('Please correct the errors in the form');
  });
});
