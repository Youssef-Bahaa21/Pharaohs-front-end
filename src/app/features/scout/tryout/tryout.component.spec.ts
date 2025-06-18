import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TryoutComponent } from './tryout.component';

describe('ScoutTryoutsComponent', () => {
  let component: ScoutTryoutsComponent;
  let fixture: ComponentFixture<ScoutTryoutsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoutTryoutsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ScoutTryoutsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
