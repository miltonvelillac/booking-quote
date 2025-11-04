import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-date-range-field',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './date-range-field.html',
  styleUrl: './date-range-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangeField {
  formFieldStart = input(new FormControl());
  formFieldEnd = input(new FormControl());
  idStart = input('');
  idEnd = input('');
  nameStart = input('');
  nameEnd = input('');
  label = input('');
  placeholderStart = input('');
  placeholderEnd = input('');
  hint = input('MM/DD/YYYY – MM/DD/YYYY');
  showHint = input(true);
  type = input('date');
}
