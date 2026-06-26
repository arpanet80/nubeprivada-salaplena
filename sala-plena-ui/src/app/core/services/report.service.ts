import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class ReportsService {

  private http = inject( HttpClient );
  private readonly baseUrl: string = environment.reportsUrl;
  private url  = `${ this.baseUrl }generate-pdf-parameters?reportName=reports/monitoreo/`;

  constructor() {   }

  GeneraPDF(reportFileName: string, parametros: { nombre: string, valor: string }[]) {

    const paramsString = parametros
      .map(param => `&parameters[${encodeURIComponent(param.nombre)}]=${encodeURIComponent(param.valor)}`)
      .join('');

    const finalUrl = `${this.url}${reportFileName}${paramsString}`;

    return this.http.get(finalUrl, { observe: 'response', responseType: 'blob' });
  }

}
