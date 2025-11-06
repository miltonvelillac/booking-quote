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
    if (input == null) return null;

    // If already a Date instance
    if (input instanceof Date && !isNaN(input.getTime())) {
      const y = input.getFullYear(), m = input.getMonth(), d = input.getDate();
      const utc = new Date(Date.UTC(y, m, d));
      return utc.toISOString().slice(0, 10);
    }

    // If numeric (e.g., Google Sheets/Excel serial date)
    if (typeof input === 'number' || /^-?\d+(\.\d+)?$/.test(String(input).trim())) {
      const n = typeof input === 'number' ? input : parseFloat(String(input).trim());
      if (Number.isFinite(n)) {
        const msPerDay = 24 * 60 * 60 * 1000;
        // Excel/Sheets epoch (1899-12-30) in UTC
        const excelEpochUTC = Date.UTC(1899, 11, 30);
        const utcMs = excelEpochUTC + Math.floor(n) * msPerDay;
        const d = new Date(utcMs);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
    }

    let s = String(input).trim();
    // Guard against headers like 'Fecha'
    if (/fecha/i.test(s)) return null;

    // Remove surrounding quotes
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }

    // Strip time portion if present (e.g., "DD/MM/YYYY HH:mm[:ss]", "YYYY-MM-DDTHH:mm:ssZ")
    // Keep only the first date-like segment
    const timeIdx = s.search(/[ T]\d{1,2}:\d{2}/);
    if (timeIdx > 0) s = s.slice(0, timeIdx).trim();

    // ISO YYYY-MM-DD (avoid Date(string) parsing differences in Safari/Firefox)
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const da = parseInt(m[3], 10);
      const d = new Date(Date.UTC(y, mo - 1, da));
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return null;
    }

    // YYYY/MM/DD (common from some exports)
    m = s.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const da = parseInt(m[3], 10);
      const d = new Date(Date.UTC(y, mo - 1, da));
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return null;
    }

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      let year = parseInt(m[3], 10);
      if (year < 100) year += 2000; // assume 20xx for 2-digit years
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return null;
    }

    // Fallback: let Date parse string, then normalize via UTC components
    const tmp = new Date(s);
    if (!isNaN(tmp.getTime())) {
      const y = tmp.getFullYear(), mo = tmp.getMonth(), da = tmp.getDate();
      const d = new Date(Date.UTC(y, mo, da));
      return d.toISOString().slice(0, 10);
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
