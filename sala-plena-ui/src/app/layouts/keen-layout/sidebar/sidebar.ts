import { Component, inject, computed } from '@angular/core';
import { MenuPrincipalComponent } from './menu/menu-principal/menu-principal.component';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [MenuPrincipalComponent, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  private authService = inject(AuthService);
  estadoUsuario = this.authService.estadoUsuario;

  // ✅ computed() se reevalúa automáticamente cuando el signal cambia
  rol = computed(() => {
    const user = this.estadoUsuario();
    return user?.rol ?? '';
  });
}
