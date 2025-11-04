import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DateField } from '../../shared/ui/atoms/date-field/date-field';
import { QuoteFormNamesEnum } from '../../shared/enums/quote-form-names.enum';

@Component({
  selector: 'app-quote',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DateField
  ],
  templateUrl: './quote.html',
  styleUrl: './quote.scss',
})
export class Quote {
  formNames = QuoteFormNamesEnum;

  form = new FormGroup({
    [this.formNames.fromDate]: new FormControl(),
    [this.formNames.toDate]: new FormControl()
  });

  submit(): void {
    console.log('hi', this.form.value)
  }

}
