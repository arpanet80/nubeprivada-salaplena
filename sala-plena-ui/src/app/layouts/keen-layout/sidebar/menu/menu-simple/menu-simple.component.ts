import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { opcionSimple } from '../interfaces/menu.interface';
import { RoleService } from '../../../../../auth/services/role.service';

@Component({
  selector: 'app-menu-simple',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './menu-simple.component.html',
  styleUrl: './menu-simple.component.css'
})
export class MenuSimpleComponent {
  private roleService = inject(RoleService);

  menusimple = input.required<opcionSimple>();

  // ✅ computed() reevalúa automáticamente cuando cambia la autenticación
  tienePermiso = computed(() => {
    const menu = this.menusimple();
    return this.roleService.hasAnyRole(menu.roles || []);
  });
}
