import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { menuSegundoNivel } from '../interfaces/menu.interface';
import { RoleService } from '../../../../../auth/services/role.service';

@Component({
  selector: 'app-menu-segundo-nivel',
  standalone: true,
  imports: [ RouterLink, RouterLinkActive],
  templateUrl: './menu-segundo-nivel.component.html',
  styleUrl: './menu-segundo-nivel.component.css'
})
export class MenuSegundoNivelComponent {
  private roleService = inject(RoleService);

  segundonivel = input.required<menuSegundoNivel[]>();
  menusVisibles: menuSegundoNivel[] = [];

  ngOnInit() {
    this.verificarPermisos();
  }

  private verificarPermisos() {
    const menus = this.segundonivel();
    console.log('🔍 MenuSegundoNivel: Verificando', menus.length, 'menus principales');

    // ✅ Verificar menus principales Y filtrar todos sus contenidos con manejo de undefined
    this.menusVisibles = menus
      .filter(menu => this.roleService.hasAnyRole(menu.roles || []))
      .map(menu => ({
        ...menu,
        // ✅ Filtrar items simples con permisos (manejar undefined)
        opcionSimple: (menu.opcionSimple || []).filter(simple =>
          this.roleService.hasAnyRole(simple.roles || [])
        ),
        // ✅ Filtrar items de primer nivel con permisos Y sus submenús (manejar undefined)
        menuPrimerNivel: (menu.menuPrimerNivel || [])
          .filter(primerNivel => this.roleService.hasAnyRole(primerNivel.roles || []))
          .map(primerNivel => ({
            ...primerNivel,
            // ✅ Filtrar subitems con permisos (manejar undefined)
            opcionSimple: (primerNivel.opcionSimple || []).filter(subitem =>
              this.roleService.hasAnyRole(subitem.roles || [])
            )
          }))
          // ✅ Solo mantener primer nivel que tiene subitems visibles
          .filter(primerNivel => primerNivel.opcionSimple.length > 0)
      }))
      // ✅ Solo mantener menus que tienen al menos un contenido visible
      .filter(menu => menu.opcionSimple.length > 0 || menu.menuPrimerNivel.length > 0);

    // console.log('==================>>>>>>>>>>>>>>>>>>', this.menusVisibles.length);
  }

}
