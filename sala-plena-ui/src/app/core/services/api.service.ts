import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Permiso } from '../models/especifico/permiso.model';
import { Rol } from '../models/especifico/rol.model';
import { Sistema } from '../models/especifico/sistema.model';
import { UsuarioModel } from '../models/especifico/usuario.model';
import { PaginatedResponse } from '../components/tabla-generica/tabla-column.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private url = environment.apiUrl?.endsWith('/') ? environment.apiUrl : `${environment.apiUrl}/`;


}
