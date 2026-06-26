import { AfterViewInit, Component, OnInit } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Breadcrumbs } from '../breadcrumbs/breadcrumbs';

declare var KTMenu: any;
declare var KTDrawer: any;
declare var KTScroll: any;

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header, Footer, Breadcrumbs],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout  {
  /*ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    // Inicializar componentes de Keen
    this.initKeenComponents();
  }

  private initKeenComponents(): void {
    // Inicializar menús
    if (typeof KTMenu !== 'undefined') {
      KTMenu.createInstances();
    }
    
    // Inicializar drawers
    if (typeof KTDrawer !== 'undefined') {
      KTDrawer.createInstances();
    }
    
    // Inicializar scroll
    if (typeof KTScroll !== 'undefined') {
      KTScroll.createInstances();
    }
  }
    */
}
