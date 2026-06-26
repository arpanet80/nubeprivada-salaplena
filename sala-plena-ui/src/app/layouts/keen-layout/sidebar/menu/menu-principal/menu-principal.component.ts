import { Component } from '@angular/core';
import { MenuSimpleComponent } from '../menu-simple/menu-simple.component';
import { MenuEtiquetaComponent } from '../menu-etiqueta/menu-etiqueta.component';
import { MenuPrimerNivelComponent } from '../menu-primer-nivel/menu-primer-nivel.component';
import { menuDeOpciones } from '../interfaces/menu-opcionex-sidebar';

@Component({
  selector: 'app-menu-principal',
  standalone: true,
  imports: [MenuSimpleComponent, MenuEtiquetaComponent],
  templateUrl: './menu-principal.component.html',
})
export class MenuPrincipalComponent {

  menu = menuDeOpciones;

}
