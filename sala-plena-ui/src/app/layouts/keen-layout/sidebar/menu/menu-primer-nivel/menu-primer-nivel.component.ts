import {  Component, computed, inject, input, Input, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { menuPrimerNivel } from '../interfaces/menu.interface';
import { RoleService } from '../../../../../auth/services/role.service';

@Component({
  selector: 'app-menu-primer-nivel',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './menu-primer-nivel.component.html',
  styleUrl: './menu-primer-nivel.component.css'
})
export class MenuPrimerNivelComponent  implements OnInit  {
  private roleService = inject(RoleService);

  primernivel = input.required<menuPrimerNivel[]>();
  itemsVisibles: menuPrimerNivel[] = [];

  ngOnInit() {
    this.verificarPermisos();
  }

  private verificarPermisos() {
    const items = this.primernivel();

    this.itemsVisibles = items.filter(item =>
      this.roleService.hasAnyRole(item.roles || [])
    );

    this.itemsVisibles = items
      .filter(item => this.roleService.hasAnyRole(item.roles || []))
      .map(item => ({
        ...item,
        // ✅ Filtrar solo los submenús que tienen permisos
        opcionSimple: item.opcionSimple.filter(submenu =>
          this.roleService.hasAnyRole(submenu.roles || [])
        )
      }))
      // ✅ Solo mantener items que tienen al menos un submenú visible
      .filter(item => item.opcionSimple.length > 0);

    // console.log('=======================>>>>>>>>>>', this.itemsVisibles);


  }

}
