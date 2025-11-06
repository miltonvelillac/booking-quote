import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';

type DayCell = { date: Date; inMonth: boolean; };

function startOfMonthUTC(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonthsUTC(d: Date, m: number) { return new Date(d.getFullYear(), d.getMonth() + m, 1); }
function sameDay(a: Date | null, b: Date | null) {
  return !!a && !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function buildMonthCells(monthLocal: Date): DayCell[] {
  const y = monthLocal.getFullYear(), m = monthLocal.getMonth();
  const first = new Date(y, m, 1);
  const firstWeekday = first.getDay(); // domingo=0
  const start = new Date(y, m, 1 - firstWeekday);
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === m });
  }
  return cells;
}

function getTitleFormat(value?: string): string | undefined {
  return !value ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

@Component({
  selector: 'app-calendar-range',
  imports: [
    CommonModule,
    MatDatepickerModule
  ],
  templateUrl: './calendar-range.html',
  styleUrl: './calendar-range.scss',
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarRange {
  formFieldStart = input.required<FormControl<Date | null>>();
  formFieldEnd = input.required<FormControl<Date | null>>();
  maxDays = input<number | null>(null);
  minDate = input<Date | null>(null);
  maxDate = input<Date | null>(null);

  // Estado local
  currentMonth = signal(startOfMonthUTC(new Date()));
  hover = signal<Date | null>(null);

  weekdays = computed(() => ['D', 'L', 'M', 'X', 'J', 'V', 'S']);

  months = computed(() => {
    const first = this.currentMonth();
    const second = addMonthsUTC(first, 1);
    const fmt = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return [
      { index: 0, date: first, label: getTitleFormat(fmt.format(first)), cells: buildMonthCells(first) },
      { index: 1, date: second, label: getTitleFormat(fmt.format(second)), cells: buildMonthCells(second) },
    ];
  });

  isStart(date: Date) { return sameDay(this.startValue() ?? null, date); }
  isEnd(date: Date) { return sameDay(this.endValue() ?? null, date); }

  inRange(date: Date): boolean {
    const start = this.startValue(), end = this.endValue() ?? this.hover();
    if (!start || !end) return false;
    const a = +start, b = +end;
    const min = Math.min(a, b), max = Math.max(a, b);
    return +date >= min && +date <= max;
  }

  isDisabled(date: Date): boolean {
    const min = this.minDate(), max = this.maxDate();
    if (min && +date < +this.stripUTC(min)) return true;
    if (max && +date > +this.stripUTC(max)) return true;

    const maxDays = this.maxDays();
    const startDate = this.startValue();
    if (maxDays && startDate) {
      const start = this.stripUTC(startDate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const maxEnd = new Date(start.getTime() + (maxDays - 1) * msPerDay);
      const dUTC = this.stripUTC(date);
      if (+dUTC < +start || +dUTC > +maxEnd) return true;
    }
    return false;
  }

  onPick(date: Date) {
    const start = this.startValue();
    const end = this.endValue();

    if (!start || (start && end) || (start > date)) {
      this.formFieldStart().setValue(date);
      this.formFieldEnd().setValue(null);
      this.markTouched();
    } else {
      if (+date < +start) {
        this.formFieldEnd().setValue(start);
        this.formFieldStart().setValue(date);
      } else {
        this.formFieldEnd().setValue(date);
      }
      this.markTouched();
    }
  }

  prev() { this.currentMonth.set(addMonthsUTC(this.currentMonth(), -1)); }
  next() { this.currentMonth.set(addMonthsUTC(this.currentMonth(), 1)); }

  ariaLabel(d: Date) {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(d);
  }

  private stripUTC(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private markTouched() {
    const s = this.formFieldStart(), e = this.formFieldEnd();
    s.markAsDirty(); s.markAsTouched();
    e.markAsDirty(); e.markAsTouched();
  }

  private startValue(): Date | null { return this.formFieldStart().value; }
  private endValue(): Date | null { return this.formFieldEnd().value; }

}


