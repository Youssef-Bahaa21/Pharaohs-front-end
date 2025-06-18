import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoutProfileComponent } from './scout-profile.component';

describe('ScoutProfileComponent', () => {
  let component: ScoutProfileComponent;
  let fixture: ComponentFixture<ScoutProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoutProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScoutProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
