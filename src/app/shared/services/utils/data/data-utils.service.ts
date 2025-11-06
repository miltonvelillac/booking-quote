import { inject, Injectable, signal } from '@angular/core';
import { DataModel } from '../../../models/data.model';
import { DateUtilsService } from '../date/date-utils.service';

type PriceObjType = { price: number; priceOneNigth: number; } | undefined;

@Injectable({
  providedIn: 'root',
})
export class DataUtilsService {
  private dateUtils = inject(DateUtilsService);
  surcharge = signal(0);

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
        .map((data) => [data.date, { price: data.price, priceOneNigth: data.priceOneNigth }] as const)
    );

    const diffInDays = this.dateUtils.substractDates(endDate, startDate);
    const results: { date: string; price: number }[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = this.dateUtils.toISODate(d);
      const priceObj = this.getPriceObj({ map, key });
      const price = this.getPrice({ priceObj, diffInDays });
      this.calcSurcharge({ priceObj, diffInDays });

      if (Number.isFinite(price)) {
        results.push({ date: key, price: price as number });
      }
    }

    return results;
  }

  private getPriceObj(props: { map: Map<string, { price: number; priceOneNigth: number; }>, key: string }): PriceObjType {
    const { map, key } = props;
    return map.get(key);
  }

  private getPrice(props: { priceObj: PriceObjType, diffInDays: number}): number | undefined {
    const { priceObj, diffInDays } = props;

    return diffInDays === 1 ? priceObj?.priceOneNigth : priceObj?.price;
  }

  private calcSurcharge(props: { priceObj: PriceObjType, diffInDays: number}): void {
    const { priceObj, diffInDays } = props;

    if(diffInDays === 1) {
      this.surcharge.update(() => (priceObj?.price || 0) * 100 / (priceObj?.priceOneNigth || 1));
    } else {
      this.surcharge.update(() => 0);
    }
  }

}
