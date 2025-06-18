import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ViewProfileComponent } from './view-profile.component';
import { PlayerService } from '../../../../core/services/player/player.service';
import { DateFormatUtil } from '../../../../core/utils/date-format.util';

describe('ViewProfileComponent', () => {
  let component: ViewProfileComponent;
  let fixture: ComponentFixture<ViewProfileComponent>;
  let playerServiceSpy: jasmine.SpyObj<PlayerService>;
  let sanitizerSpy: jasmine.SpyObj<DomSanitizer>;

  beforeEach(async () => {
    const playerSpy = jasmine.createSpyObj('PlayerService', ['getPublicProfile']);
    const domSanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustResourceUrl']);

    await TestBed.configureTestingModule({
      imports: [ViewProfileComponent, DateFormatUtil],
      providers: [
        { provide: PlayerService, useValue: playerSpy },
        { provide: DomSanitizer, useValue: domSanitizerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '1'
              }
            }
          }
        }
      ]
    }).compileComponents();

    playerServiceSpy = TestBed.inject(PlayerService) as jasmine.SpyObj<PlayerService>;
    sanitizerSpy = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;

    // Mock the sanitizer
    sanitizerSpy.bypassSecurityTrustResourceUrl.and.callFake(url => url);

    // Mock player data
    playerServiceSpy.getPublicProfile.and.returnValue(of({
      id: 1,
      name: 'Test Player',
      email: 'test@example.com',
      role: 'player',
      position: 'Forward',
      club: 'Test FC',
      bio: 'Test bio',
      profileImage: '/uploads/images/test.jpg',
      age: 25,
      videos: [
        {
          id: '1',
          url: '/uploads/videos/test.mp4',
          type: 'video',
          description: 'Test video',
          playerId: '1',
          createdAt: '2023-01-01'
        },
        {
          id: '2',
          url: '/uploads/images/test.jpg',
          type: 'image',
          description: 'Test image',
          playerId: '1',
          createdAt: '2023-01-02'
        }
      ],
      stats: {
        matches_played: 10,
        goals: 5,
        assists: 3,
        yellow_cards: 2,
        red_cards: 0
      }
    }));

    fixture = TestBed.createComponent(ViewProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load player profile on init', () => {
    expect(playerServiceSpy.getPublicProfile).toHaveBeenCalledWith(1);
    expect(component.player).toBeTruthy();
    expect(component.player?.name).toBe('Test Player');
  });

  it('should categorize media correctly', () => {
    expect(component.videoMedia.length).toBe(1);
    expect(component.imageMedia.length).toBe(1);
    expect(component.videoMedia[0].type).toBe('video');
    expect(component.imageMedia[0].type).toBe('image');
  });

  it('should calculate efficiency rating correctly', () => {
    // (5*2 + 3 - 2 - 0*3) / 10 = 11/10 = 1.1
    // (1.1 + 3) * 10 = 41
    expect(component.calculateEfficiencyRating()).toBeCloseTo(41, 0);
  });

  it('should identify position category correctly', () => {
    expect(component.getPositionCategory()).toBe('Forward');

    // Test other positions
    if (component.player) {
      component.player.position = 'Midfielder';
      expect(component.getPositionCategory()).toBe('Midfielder');

      component.player.position = 'Defender';
      expect(component.getPositionCategory()).toBe('Defender');

      component.player.position = 'Goalkeeper';
      expect(component.getPositionCategory()).toBe('Goalkeeper');

      component.player.position = 'Unknown Position';
      expect(component.getPositionCategory()).toBe('Unknown Position');
    }
  });

  it('should switch tabs correctly', () => {
    expect(component.activeTab).toBe('overview');

    component.setActiveTab('statistics');
    expect(component.activeTab).toBe('statistics');

    component.setActiveTab('media');
    expect(component.activeTab).toBe('media');

    component.setActiveTab('achievements');
    expect(component.activeTab).toBe('achievements');
  });

  it('should sanitize URLs', () => {
    const url = 'http://example.com/video.mp4';
    component.sanitizeUrl(url);
    expect(sanitizerSpy.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(url);
  });

  it('should handle media errors', () => {
    // Create mock elements
    const mockElement = document.createElement('img');
    const mockParent = document.createElement('div');
    mockParent.appendChild(mockElement);

    // Spy on console.error
    spyOn(console, 'error');

    // Call error handler
    component.onMediaError({ target: mockElement } as unknown as Event, 'test.jpg');

    // Verify error was logged
    expect(console.error).toHaveBeenCalled();

    // Verify element was hidden
    expect(mockElement.style.display).toBe('none');

    // Verify error message was added
    const errorMsg = mockParent.querySelector('.text-red-500');
    expect(errorMsg).toBeTruthy();
    expect(errorMsg?.textContent).toBe('Media failed to load');
  });
});
