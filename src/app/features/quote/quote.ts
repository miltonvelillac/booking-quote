import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuoteFormNamesEnum } from '../../shared/enums/quote-form-names.enum';
import { DateRangeField } from '../../shared/ui/atoms/date-range-field/date-range-field';
import { Button } from '../../shared/ui/atoms/button/button';
import { CalendarRange } from '../../shared/ui/atoms/calendar-range/calendar-range';

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
export class Quote {
  formNames = QuoteFormNamesEnum;

  form = new FormGroup({
    [this.formNames.fromDate]: new FormControl('', Validators.required),
    [this.formNames.toDate]: new FormControl('', Validators.required)
  });

  submit(): void {
    this.form.markAllAsTouched();
    console.log('hi', this.form.value);
  }

}
