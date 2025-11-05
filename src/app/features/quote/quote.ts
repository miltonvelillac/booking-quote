import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SHEETS_SPREADSHEET_ID } from '../../shared/config/sheets';
import { DataStoreService } from '../../shared/data/data-store.service';
import { QuoteFormNamesEnum } from '../../shared/enums/quote-form-names.enum';
import { CalendarRange } from '../../shared/ui/atoms/calendar-range/calendar-range';
import { DateUtils } from '../../shared/utils/date/date-utils';

@Component({
  selector: 'app-quote',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CalendarRange
  ],
  templateUrl: './quote.html',
  styleUrl: './quote.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quote implements OnInit, OnDestroy {
  private dateUtils = inject(DateUtils);
  private dataStoreService = inject(DataStoreService);
  formNames = QuoteFormNamesEnum;

  form = new FormGroup({
    [this.formNames.range]: new FormGroup({
      [this.formNames.fromDate]: new FormControl(),
      [this.formNames.toDate]: new FormControl()
    })
  });

  price = signal(0);
  diffDays = signal(0);
  data = this.dataStoreService.getData();

  subscription$ = new Subscription();

  constructor() { }

  ngOnInit(): void {
    this.listenDateChanges();
    this.getData();
  }

  ngOnDestroy(): void {
    this.subscription$.unsubscribe();
  }

  getFormRangeFields(formField: string): FormControl {
    return (this.form.controls[this.formNames.range] as FormGroup).controls[formField] as FormControl;
  }

  private setDateDiff(): void {
    const diff = this.getDateDiff();
    this.diffDays.update(() => diff);
  }

  private getDateDiff(): number {
    const fromDate = this.getFormRangeFields(this.formNames.fromDate)?.value;
    const toDate = this.getFormRangeFields(this.formNames.toDate)?.value;
    if (!fromDate || !toDate) return 0;
    return this.dateUtils.substractDates(toDate, fromDate);
  }

  private getData(): void {
    this.dataStoreService.getDatePrices(SHEETS_SPREADSHEET_ID);
  }

  /**
   * Calcula el precio por fecha en el rango [startDate, endDate] (inclusive)
   * usando los datos cargados en el store (date -> price).
   */
  private getPricePerDate(startDate: Date, endDate: Date): { date: string; price: number }[] {
    if (!startDate || !endDate) return [];

    const map = new Map(
      this.data()
        .map((d) => [d.date, d.price] as const)
    );

    const results: { date: string; price: number }[] = [];
    const start = this.stripUTC(startDate);
    const end = this.stripUTC(endDate);

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = this.toISODate(d);
      const price = map.get(key);
      if (Number.isFinite(price)) {
        results.push({ date: key, price: price as number });
      }
    }
    return results;
  }

  private toISODate(d: Date): string {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      .toISOString()
      .slice(0, 10);
  }

  private stripUTC(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private listenDateChanges(): void {
    this.subscription$ = this.form.valueChanges.subscribe(
      () => {
        this.setDateDiff();
        this.calcTotalPrice();
      }
    );
  }

  private calcTotalPrice(): void {
    const startDate = this.getFormRangeFields(this.formNames.fromDate)?.value;
    const endDate = this.getFormRangeFields(this.formNames.toDate)?.value;
    const pricePerDate = this.getPricePerDate(startDate, endDate);

    const totalPrice = pricePerDate.slice(0, -1).reduce((value, obj) => obj.price + value, 0);
    this.price.update(() => totalPrice);
  }

}
