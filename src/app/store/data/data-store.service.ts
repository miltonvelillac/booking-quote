import { computed, inject, Injectable, signal } from '@angular/core';
import { map, take, tap } from 'rxjs';
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
    if (priceIdx < 0) priceIdx = 7; // H
    if (dateIdx < 0) dateIdx = 0; // A

    return lines.slice(1).map((line) => {
      const formatedLine = line.replaceAll(`",`, `";`)
      const cells = formatedLine.split(';');
      const a = cells[dateIdx];
      const h = cells[priceIdx];
      const date = this.normalizeDate(a);
      const price = this.toNumber(h);
      return { date, price } as DataModel;
    }).filter((r) => !!r.date && Number.isFinite(r.price));
  }

  private normalizeDate(input: any): string | null {
    if (!input) return null;
    // Try to parse as Date. Supports ISO or DD/MM/YYYY/MM-DD-YYYY heuristics
    const s = String(input).trim();
    // Guard against headers like 'Fecha'
    if (/fecha/i.test(s)) return null;

    let d: Date | null = null;
    // If looks like DD/MM/YYYY, rearrange to YYYY-MM-DD
    const m = s.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/);
    if (m) {
      const day = m[1].padStart(2, '0');
      const month = m[2].padStart(2, '0');
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      d = new Date(`${year}-${month}-${day}T00:00:00`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      d = new Date(`${s}T00:00:00`);
    } else {
      const tmp = new Date(s);
      if (!isNaN(tmp.getTime())) d = tmp;
    }

    if (!d || isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
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
