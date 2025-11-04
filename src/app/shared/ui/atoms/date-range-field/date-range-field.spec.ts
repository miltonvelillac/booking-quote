import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateRangeField } from './date-range-field';

describe('DateRangeField', () => {
  let component: DateRangeField;
  let fixture: ComponentFixture<DateRangeField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateRangeField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateRangeField);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
