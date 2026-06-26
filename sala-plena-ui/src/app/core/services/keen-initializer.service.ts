import { Injectable } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";

declare var KTMenu: any;
declare var KTDrawer: any;
declare var KTScroll: any;
declare var KTScrolltop: any;
declare var KTDialer: any;
declare var KTImageInput: any;
declare var KTPasswordMeter: any;
declare var KTThemeMode: any;
declare var KTToggle: any;
declare var KTSticky: any;
declare var KTSwapper: any;
declare var KTApp: any;

@Injectable({
  providedIn: 'root'
})
export class KeenInitializerService {

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          this.reinitKeenComponents();
        }, 100);
      });
  }

  /**
   * Re-inicializa todos los componentes de Keen
   * Limpia instancias previas y crea nuevas
   */
  public reinitKeenComponents(): void {
    try {
      // Primero destruir instancias existentes
      this.destroyKeenComponents();
      
      // Luego crear nuevas instancias
      this.initKeenComponents();
      
      // console.log('Keen components reinitialized');
    } catch (error) {
      console.error('Error reinitializing Keen components:', error);
    }
  }

  /**
   * Destruye las instancias existentes de componentes Keen
   */
  private destroyKeenComponents(): void {
    try {
      // Destruir menús
      if (typeof KTMenu !== 'undefined' && KTMenu.getInstance) {
        const menuElements = document.querySelectorAll('[data-kt-menu="true"]');
        menuElements.forEach((el: Element) => {
          const instance = KTMenu.getInstance(el);
          if (instance) {
            instance.destroy();
          }
        });
      }

      // Destruir drawers
      if (typeof KTDrawer !== 'undefined' && KTDrawer.getInstance) {
        const drawerElements = document.querySelectorAll('[data-kt-drawer="true"]');
        drawerElements.forEach((el: Element) => {
          const instance = KTDrawer.getInstance(el);
          if (instance) {
            instance.destroy();
          }
        });
      }

      // Destruir scrolls
      if (typeof KTScroll !== 'undefined' && KTScroll.getInstance) {
        const scrollElements = document.querySelectorAll('[data-kt-scroll="true"]');
        scrollElements.forEach((el: Element) => {
          const instance = KTScroll.getInstance(el);
          if (instance) {
            instance.destroy();
          }
        });
      }

      // Destruir toggles
      if (typeof KTToggle !== 'undefined' && KTToggle.getInstance) {
        const toggleElements = document.querySelectorAll('[data-kt-toggle="true"]');
        toggleElements.forEach((el: Element) => {
          const instance = KTToggle.getInstance(el);
          if (instance) {
            instance.destroy();
          }
        });
      }

      // Destruir sticky elements
      if (typeof KTSticky !== 'undefined' && KTSticky.getInstance) {
        const stickyElements = document.querySelectorAll('[data-kt-sticky="true"]');
        stickyElements.forEach((el: Element) => {
          const instance = KTSticky.getInstance(el);
          if (instance) {
            instance.destroy();
          }
        });
      }

      // Destruir swappers
      if (typeof KTSwapper !== 'undefined' && KTSwapper.getInstance) {
        const swapperElements = document.querySelectorAll('[data-kt-swapper="true"]');
        swapperElements.forEach((el: Element) => {
          const instance = KTSwapper.getInstance(el);
          if (instance) {
            instance.destroy();
          }
        });
      }

      // console.log('Keen components destroyed');
    } catch (error) {
      console.error('Error destroying Keen components:', error);
    }
  }

  /**
   * Inicializa todos los componentes de Keen
   */
  private initKeenComponents(): void {
    try {
      if (typeof KTMenu !== 'undefined') {
        KTMenu.createInstances();
      }

      if (typeof KTDrawer !== 'undefined') {
        KTDrawer.createInstances();
      }

      if (typeof KTScroll !== 'undefined') {
        KTScroll.createInstances();
      }

      if (typeof KTScrolltop !== 'undefined') {
        KTScrolltop.createInstances();
      }

      if (typeof KTDialer !== 'undefined') {
        KTDialer.createInstances();
      }

      if (typeof KTImageInput !== 'undefined') {
        KTImageInput.createInstances();
      }

      if (typeof KTPasswordMeter !== 'undefined') {
        KTPasswordMeter.createInstances();
      }

      if (typeof KTToggle !== 'undefined') {
        KTToggle.createInstances();
      }

      if (typeof KTSticky !== 'undefined') {
        KTSticky.createInstances();
      }

      if (typeof KTSwapper !== 'undefined') {
        KTSwapper.createInstances();
      }

      // Inicializar el tema (no destruir, solo inicializar)
      if (typeof KTThemeMode !== 'undefined') {
        KTThemeMode.init();
      }

      // Inicializar la aplicación general
      if (typeof KTApp !== 'undefined' && typeof KTApp.init === 'function') {
        KTApp.init();
      }

      // console.log('Keen components initialized');
    } catch (error) {
      console.error('Error initializing Keen components:', error);
    }
  }

  /**
   * Método público para inicializar manualmente (primera carga)
   */
  public init(): void {
    this.initKeenComponents();
  }
}