import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarRange } from './calendar-range';

describe('CalendarRange', () => {
  let component: CalendarRange;
  let fixture: ComponentFixture<CalendarRange>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarRange]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarRange);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
