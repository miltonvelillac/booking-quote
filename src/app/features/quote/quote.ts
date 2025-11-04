import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuoteFormNamesEnum } from '../../shared/enums/quote-form-names.enum';
import { DateRangeField } from '../../shared/ui/atoms/date-range-field/date-range-field';
import { Button } from '../../shared/ui/atoms/button/button';
import { CalendarRange } from '../../shared/ui/atoms/calendar-range/calendar-range';
import { DateUtils } from '../../shared/utils/date/date-utils';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quote',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DateRangeField,
    Button,
    CalendarRange
  ],
  templateUrl: './quote.html',
  styleUrl: './quote.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quote implements OnInit, OnDestroy {
  private dateUtils = inject(DateUtils);
  formNames = QuoteFormNamesEnum;

  form = new FormGroup({
    [this.formNames.range]: new FormGroup({
      [this.formNames.fromDate]: new FormControl(),
      [this.formNames.toDate]: new FormControl()
    })
  });

  diffDays = signal(0);

  subscription$ = new Subscription();

  ngOnInit(): void {
    this.subscription$ = this.form.valueChanges.subscribe(
      data => {
        this.setDateDiff();
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription$.unsubscribe();
  }

  getFormRangeFields(formField: string): FormControl {
    return (this.form.controls[this.formNames.range] as FormGroup).controls[formField] as FormControl;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if(!this.form.valid) return;
  }

  private setDateDiff(): void {
    const diff = this.getDateDiff();
    this.diffDays.update(() => diff);
  }

  private getDateDiff(): number {
    const fromDate = this.getFormRangeFields(this.formNames.fromDate)?.value;
    const toDate = this.getFormRangeFields(this.formNames.toDate)?.value;
    if(!fromDate || !toDate) return 0;
    return this.dateUtils.substractDates(toDate, fromDate);
  }

}
