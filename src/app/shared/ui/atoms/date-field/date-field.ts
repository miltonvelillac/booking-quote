import { Component, input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-date-field',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule
  ],
  templateUrl: './date-field.html',
  styleUrl: './date-field.scss',
})
export class DateField {
  formField = input(new FormControl());
  id = input('');
  name = input('');
  placeholder = input('');
  type = input('date');
}
