import { computed, inject, Injectable, signal } from '@angular/core';
import { map, take, tap } from 'rxjs';
import moment from 'moment';
import { DataModel } from '../../shared/models/data.model';
import { DataApiService } from '../../shared/services/apis/data-api/data-api.service';
import { SHEETS_SHEET_NAME } from '../../shared/config/sheets';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  private dataApiService = inject(DataApiService);

  #data = signal<DataModel[]>([]);
  getData = computed(() => this.#data);
  setData = (data: DataModel[]) => this.#data.update(() => data);

  /**
   * Reads two columns from a Google Sheet: A (date) and H (price).
   * Prefers Google Sheets API v4 when `apiKey` is provided. Otherwise tries CSV via gviz.
   * @param spreadsheetId The Google Sheets document ID
   * @param sheetName Sheet/tab name. Defaults to 'Calenadario'.
   * @param apiKey Optional Google Sheets API key
   */
  getDatePrices(
    spreadsheetId: string,
    sheetName = SHEETS_SHEET_NAME,
    apiKey?: string
  ): void {
    if (apiKey) {
      this.dataApiService.getDataApiKey({ spreadsheetId, sheetName, apiKey }).pipe(
        take(1),
        map((res) => this.parseValues(res?.values ?? [], 'FirstDate')),
        tap(data => this.setData(data))
      ).subscribe();
    }

    // Fallback to CSV export via gviz (works for public/published sheets)
    this.dataApiService.getData({ spreadsheetId, sheetName }).pipe(
      take(1),
      map((csv) => this.parseCsv(csv, 'FirstDate')),
      tap(data => this.setData(data))
    ).subscribe();
  }

  private parseValues(values: any[][], dateHeader: string): DataModel[] {
    const rows = Array.isArray(values) ? values : [];
    if (rows.length === 0) return [];

    const header = rows[0]?.map((c: any) => String(c ?? '').trim());
    let dateIdx = header.findIndex((c: string) => c.toLowerCase() === dateHeader.toLowerCase());
    // Price: try to find by header 'Precio' or 'Price', else fallback to H(7)
    let priceIdx = header.findIndex((c: string) => /^(precio|price)$/i.test(c));
    if (priceIdx < 0) priceIdx = 7; // H
    if (dateIdx < 0) dateIdx = 0; // fallback to A

    return rows.slice(1) // skip header
      .map((row) => {
        console.log('rowsss', row)
        const a = row?.[dateIdx];
        const h = row?.[priceIdx];
        const date = this.normalizeDate(a);
        const price = this.toNumber(h);
        return { date, price } as DataModel;
      })
      .filter((r) => !!r.date && Number.isFinite(r.price));
  }

  private parseCsv(csv: string, dateHeader: string): DataModel[] {
    const lines = (csv || '').split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length === 0) return [];

    // Split headers
    const headerCells = lines[0].split(',').map((c) => c.trim());
    let dateIdx = headerCells.findIndex((c) => c.toLowerCase() === dateHeader.toLowerCase());
    let priceIdx = headerCells.findIndex((c) => /^(precio|price)$/i.test(c));
    let priceOneNight = headerCells.findIndex((c) => /^(precioUnaNoche|priceOneNight)$/i.test(c));
    if (priceOneNight < 0) priceOneNight = 8; // I
    if (priceIdx < 0) priceIdx = 7; // H
    if (dateIdx < 0) dateIdx = 0; // A

    return lines.slice(1).map((line) => {
      const formatedLine = line.replaceAll(`",`, `";`)
      const cells = formatedLine.split(';');
      const a = cells[dateIdx];
      const h = cells[priceIdx];
      const p1nigth = cells[priceOneNight];
      const date = this.normalizeDate(a);
      const price = this.toNumber(h);
      const oneNightPrice = this.toNumber(p1nigth);
      return { date, price, priceOneNigth: oneNightPrice } as DataModel;
    }).filter((r) => !!r.date && Number.isFinite(r.price));
  }

  private normalizeDate(input: any): string | null {
    if (input == null) return null;

    // Date instance
    if (input instanceof Date && !isNaN(input.getTime())) {
      return moment
        .utc([input.getFullYear(), input.getMonth(), input.getDate()])
        .format('YYYY-MM-DD');
    }

    // Numeric or numeric string: Google Sheets/Excel serial (epoch 1899-12-30)
    if (typeof input === 'number' || /^-?\d+(\.\d+)?$/.test(String(input).trim())) {
      const n = typeof input === 'number' ? input : parseFloat(String(input).trim());
      if (Number.isFinite(n)) {
        return moment.utc('1899-12-30', 'YYYY-MM-DD', true).add(Math.floor(n), 'days').format('YYYY-MM-DD');
      }
    }

    let s = String(input).trim();
    if (/fecha/i.test(s)) return null;
    s = s.replace(/^['"]|['"]$/g, '').trim();

    // Try ISO 8601 first
    let m = moment.utc(s, moment.ISO_8601, true);
    if (m.isValid()) return m.format('YYYY-MM-DD');

    // Try a set of strict date-only formats, prioritizing Spanish-style DD/MM/YYYY
    const formats = [
      'YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD',
      'DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY',
      'D/M/YYYY', 'D-M-YYYY', 'D.M.YYYY',
      'DD/MM/YY', 'DD-MM-YY', 'DD.MM.YY',
    ];
    m = moment.utc(s, formats as any, true);
    if (m.isValid()) return m.format('YYYY-MM-DD');

    // If the string includes a time after a space or 'T', keep date part and retry
    const cut = s.split(/[T ]/)[0];
    if (cut && cut !== s) {
      m = moment.utc(cut, formats as any, true);
      if (m.isValid()) return m.format('YYYY-MM-DD');
    }

    return null;
  }

  private toNumber(input: any): number {
    if (input == null) return NaN;
    if (typeof input === 'number') return input;
    const raw = String(input).trim();
    if (/precio/i.test(raw)) return NaN;

    // Keep only digits, comma, dot, and minus
    let s = raw.replace(/[^\d,.-]/g, '');

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
      // Decide decimal separator by the last occurrence
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      if (lastComma > lastDot) {
        // comma is decimal -> remove dots (thousands), replace comma with dot
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // dot is decimal -> remove commas (thousands)
        s = s.replace(/,/g, '');
      }
    } else if (hasComma && !hasDot) {
      // If matches thousands pattern like 1,234,567 treat comma as thousands; else as decimal
      if (/^\d{1,3}(,\d{3})+(,\d+)?$/.test(s)) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(',', '.');
      }
    } else if (!hasComma && hasDot) {
      // dot as decimal; no change
    } else {
      // digits only
    }

    const n = Number(s);
    return isFinite(n) ? n : NaN;
  }
}
