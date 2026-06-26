import { Component, inject } from '@angular/core';
import { Meta, MetaDefinition } from '@angular/platform-browser';
import { ActivationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-breadcrumbs',
  imports: [],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css'
})
export class Breadcrumbs {

  private meta = inject(Meta);
  public  router = inject(Router);

  titulo!: string;
  subtitulo!: string;
  rutaBreadcrumbs!: string;

  constructor(){
    this.getDataRoute()
    .subscribe( (data:any) => {
      this.titulo = data['titulo'];
      this.subtitulo = data['subtitulo'];
      this.rutaBreadcrumbs = data['rutaBreadcrumbs'];

      /// Agrega un metatag en el head con descripcion de la pagina
      const metaTag: MetaDefinition = {
        name: 'description',
        content: this.titulo
      };
      this.meta.updateTag(metaTag);
    });
  }

  getDataRoute(){
    return this.router.events.pipe(
      filter( evento => evento instanceof ActivationEnd),
      filter( ( evento: any) =>evento.snapshot.firstChild === null ),
      map( (evento: ActivationEnd) => evento.snapshot.data )
    )
  }

}
