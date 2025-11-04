import { Component, input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { DateRange, MatDatepickerModule } from '@angular/material/datepicker';

@Component({
  selector: 'app-calendar-range',
  imports: [
    MatDatepickerModule
  ],
  templateUrl: './calendar-range.html',
  styleUrl: './calendar-range.scss',
  providers: [provideNativeDateAdapter()],
})
export class CalendarRange {
  formFieldStart = input(new FormControl());
  formFieldEnd = input(new FormControl());

  selectedRange: DateRange<Date> | null = null;
  private start: Date | null = null;

  onSelect(date: Date) {
    if (!this.start || (this.selectedRange && this.selectedRange.end) || this.start > date) {
      this.start = date;
      this.selectedRange = new DateRange(date, null);
    } else {      
      this.selectedRange = new DateRange(this.start, date);
      this.start = null;
    }

    this.formFieldStart().setValue(this.selectedRange.start);
    this.formFieldEnd().setValue(this.selectedRange.end);
  }
}
