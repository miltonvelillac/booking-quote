import { inject, Injectable } from '@angular/core';
import { DataModel } from '../../../models/data.model';
import { DateUtilsService } from '../date/date-utils.service';

@Injectable({
  providedIn: 'root',
})
export class DataUtilsService {
  private dateUtils = inject(DateUtilsService);

  calcTotalPrice(props: { startDate: Date, endDate: Date, data: DataModel[] }): number {
    const { startDate, endDate, data } = props;

    const pricePerDate = this.getPricePerDate({ startDate, endDate, data });
    return pricePerDate.slice(0, -1).reduce((value, obj) => obj.price + value, 0);    
  }

  /**
   * Calcula el precio por fecha en el rango [startDate, endDate] (inclusive)
   * usando los datos cargados en el store (date -> price).
   */
  private getPricePerDate(props: { startDate: Date, endDate: Date, data: DataModel[] }): { date: string; price: number }[] {
    const { startDate, endDate, data } = props;
    if (!startDate || !endDate) return [];

    const map = new Map(
      data
        .map((data) => [data.date, data.price] as const)
    );

    const results: { date: string; price: number }[] = [];
    const start = this.dateUtils.stripUTC(startDate);
    const end = this.dateUtils.stripUTC(endDate);

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = this.dateUtils.toISODate(d);
      const price = map.get(key);
      if (Number.isFinite(price)) {
        results.push({ date: key, price: price as number });
      }
    }
    return results;
  }

}
