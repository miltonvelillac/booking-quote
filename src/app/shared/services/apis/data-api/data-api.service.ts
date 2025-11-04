import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataApiService {
  private http = inject(HttpClient);

  getData(props: { spreadsheetId: string, sheetName: string }): Observable<string> {
    const { spreadsheetId, sheetName } = props;

    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      sheetName
    )}&range=A:H`;

    return this.http.get(url, { responseType: 'text' });
  }

  getDataApiKey(props: { spreadsheetId: string, sheetName: string, apiKey?: string }): Observable<any> {
    const { spreadsheetId, sheetName, apiKey } = props;
    const range = `${encodeURIComponent(sheetName)}!A:H`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    return this.http.get<any>(url);
  }

}
