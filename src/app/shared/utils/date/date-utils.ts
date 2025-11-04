import { Injectable } from '@angular/core';
import moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class DateUtils {
  substractDates(date1: Date | moment.Moment, date2: Date | moment.Moment): number {
    return moment(date1).diff(date2, 'days');
  }
  
}
