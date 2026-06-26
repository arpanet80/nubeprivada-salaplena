// src/app/shared/not-found/not-found.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="d-flex flex-column flex-root">
      <div class="d-flex flex-column flex-center flex-column-fluid">
        <div class="d-flex flex-column flex-center text-center p-10">

          <div class="card card-flush w-lg-650px py-5 mb-10">
            <div class="card-body py-15 py-lg-20">

              <div class="mb-14">
                <a routerLink="/" class="mb-12">
                  <span class="text-primary fs-2x fw-bold">🎁</span>
                  <span class="text-gray-800 fs-2x fw-bold ms-2">{{nombresistema}}</span>
                </a>
              </div>

              <h1 class="fw-bolder text-gray-900 mb-5" style="font-size: 10rem; line-height: 1;">404</h1>
              <div class="fw-semibold fs-2x text-gray-500 mb-7">
                Página No Encontrada
              </div>
              <div class="fw-semibold fs-6 text-gray-600 mb-10">
                La página que estás buscando no existe o ha sido movida.
              </div>

              <div class="notice d-flex bg-light-info rounded border-info border border-dashed p-6 mb-10">
                <i class="ki-duotone ki-information fs-2tx text-info me-4">
                  <span class="path1"></span>
                  <span class="path2"></span>
                  <span class="path3"></span>
                </i>
                <div class="d-flex flex-stack flex-grow-1">
                  <div class="fw-semibold text-start">
                    <div class="fs-6 text-gray-700 fw-bold mb-2">Posibles razones:</div>
                    <div class="fs-7 text-gray-600">
                      • La URL puede contener errores<br>
                      • La página fue eliminada o movida<br>
                      • No tienes permisos para acceder<br>
                      • Enlace externo incorrecto
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-10">
                <div class="d-flex flex-center flex-wrap gap-3">
                  <button class="btn btn-lg btn-light-primary" (click)="goBack()">
                    <i class="ki-duotone ki-arrow-left fs-2">
                      <span class="path1"></span>
                      <span class="path2"></span>
                    </i>
                    Volver Atrás
                  </button>

                  <button class="btn btn-lg btn-light" (click)="goHome()">
                    <i class="ki-duotone ki-shop fs-2">
                      <span class="path1"></span>
                      <span class="path2"></span>
                      <span class="path3"></span>
                      <span class="path4"></span>
                      <span class="path5"></span>
                    </i>
                    Página Principal
                  </button>
                </div>
              </div>

              <div class="notice d-flex bg-light-warning rounded border-warning border border-dashed p-6">
                <i class="ki-duotone ki-notification-bing fs-2tx text-warning me-4">
                  <span class="path1"></span>
                  <span class="path2"></span>
                  <span class="path3"></span>
                </i>
                <div class="d-flex flex-stack flex-grow-1">
                  <div class="fw-semibold">
                    <h4 class="text-gray-900 fw-bold mb-2">¿Necesitas ayuda?</h4>
                    <div class="fs-6 text-gray-700 mb-3">
                      Si crees que esto es un error, contacta al equipo de soporte:
                    </div>
                    <div class="d-flex flex-wrap gap-5">
                      <a href="mailto:soporte@oep.org.bo" class="text-primary text-hover-primary fw-semibold">
                        <i class="ki-duotone ki-sms fs-3 me-1">
                          <span class="path1"></span>
                          <span class="path2"></span>
                        </i>
                        soporte@oep.org.bo
                      </a>
                      <a href="tel:+59100000000" class="text-primary text-hover-primary fw-semibold">
                        <i class="ki-duotone ki-phone fs-3 me-1">
                          <span class="path1"></span>
                          <span class="path2"></span>
                        </i>
                        +591 00000000
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div class="d-flex flex-center flex-wrap px-5">
            <div class="text-gray-600 fw-semibold fs-6 me-5">
              &copy; 2025 {{nombresistema}}. Todos los derechos reservados.
            </div>
            <div class="d-flex gap-2">
              <a (click)="refreshPage()" class="text-gray-600 text-hover-primary fw-semibold fs-7 cursor-pointer">
                Recargar página
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .cursor-pointer {
      cursor: pointer;
    }

    .hover-elevate-up {
      transition: all 0.3s ease;
    }

    .hover-elevate-up:hover {
      transform: translateY(-5px);
      box-shadow: 0 0.5rem 1.5rem 0.5rem rgba(0, 0, 0, 0.075);
    }

    .card-bordered {
      border: 1px solid #eff2f5;
    }

    .badge {
      transition: all 0.3s ease;
    }

    .badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card {
      animation: fadeInUp 0.5s ease;
    }

    .btn {
      transition: all 0.3s ease;
    }

    .btn:hover {
      transform: translateY(-2px);
    }

    .notice {
      transition: all 0.3s ease;
    }

    .notice:hover {
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.075);
    }

    .symbol-label {
      transition: all 0.3s ease;
    }

    .card:hover .symbol-label {
      transform: scale(1.1);
    }

    @media (max-width: 768px) {
      .w-lg-650px {
        width: 100% !important;
      }

      h1 {
        font-size: 6rem !important;
      }

      .col-md-6 {
        width: 100%;
      }
    }
  `]
})
export class NotFoundComponent  {
  public readonly nombresistema = environment.systemName ?? 'Sistema de Usuarios';

  constructor(
    private router: Router,
  ) {}

  goBack(): void {
    window.history.back();
  }

  goHome(): void {
      this.router.navigate(['/dashboard']);
  }

  refreshPage(): void {
    window.location.reload();
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
