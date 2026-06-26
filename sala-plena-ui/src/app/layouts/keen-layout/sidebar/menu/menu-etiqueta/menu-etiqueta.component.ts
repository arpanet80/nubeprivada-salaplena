import { Component, inject, input, Input, OnInit } from '@angular/core';
import { etiqueta } from '../interfaces/menu.interface';
import { RoleService } from '../../../../../auth/services/role.service';

@Component({
  selector: 'app-menu-etiqueta',
  standalone: true,
  imports: [],
  templateUrl: './menu-etiqueta.component.html',
  styleUrl: './menu-etiqueta.component.css'
})
export class MenuEtiquetaComponent implements OnInit {
 private roleService = inject(RoleService);

  etiqueta = input.required<etiqueta>();
  tienePermiso = false;

  ngOnInit() {
    this.verificarPermisos();
  }

  private verificarPermisos() {
    const menu = this.etiqueta();

    this.tienePermiso = this.roleService.hasAnyRole(menu.roles || []);
  }

}
