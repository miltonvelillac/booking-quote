import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SHEETS_SPREADSHEET_ID } from '../../shared/config/sheets';
import { QuoteFormNamesEnum } from '../../shared/enums/quote-form-names.enum';
import { DataUtilsService } from '../../shared/services/utils/data/data-utils.service';
import { DateUtilsService } from '../../shared/services/utils/date/date-utils.service';
import { CalendarRange } from '../../shared/ui/atoms/calendar-range/calendar-range';
import { DataStoreService } from '../../store/data/data-store.service';

@Component({
  selector: 'app-quote',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CalendarRange,
  ],
  templateUrl: './quote.html',
  styleUrl: './quote.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quote implements OnInit, OnDestroy {
  private dateUtils = inject(DateUtilsService);
  private dataStoreService = inject(DataStoreService);
  private dataUtilsService = inject(DataUtilsService);

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
    const totalPrice = this.dataUtilsService.calcTotalPrice({ startDate, endDate, data: this.data() });
    this.price.update(() => totalPrice);
  }

}
