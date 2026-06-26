import { Routes } from '@angular/router';
import { MainLayout } from './layouts/keen-layout/main-layout/main-layout';
import { Home } from './dashboard/pages/home/home';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { LoginComponent } from './auth/pages/login/login.component';
import { notLoguedGuard } from './auth/guards/not-logued.guard';
import { loguedGuard } from './auth/guards/logued.guard';
import { roleGuard } from './auth/guards/role.guard';
import { Role } from './auth/enums/role.enum';
import { NuevaSesion } from './dashboard/pages/nueva-sesion/nueva-sesion';
import { Notificacion } from './dashboard/pages/notificacion/notificacion';
import { ExplorarNextcloud } from './dashboard/pages/explorar-nextcloud/explorar-nextcloud';
import { Reportes } from './dashboard/pages/reportes/reportes';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canActivate: [notLoguedGuard],
    component: AuthLayout,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
    ]
  },
  {
    path: 'dashboard',
    canActivate: [loguedGuard],
    component: MainLayout,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        component: Home,
        data: { titulo: 'Inicio', subtitulo: 'Página principal' }
      },
      {
        path: 'nueva-sesion',
        component: NuevaSesion,
        canActivate: [roleGuard],
        data: {
          roles: [Role.Admin, Role.Usuario],
          titulo: 'Nueva Sesion',
          subtitulo: 'Registra una nueva sesion de Sala Plena',
          rutaBreadcrumbs: 'Nueva Sesion'
        }
      },
      {
        path: 'notificacion',
        component: Notificacion,
        canActivate: [roleGuard],
        data: {
          roles: [Role.Admin, Role.Usuario],
          titulo: 'Notificaciones',
          subtitulo: 'Reenvio de notificaciones',
          rutaBreadcrumbs: 'Notificaciones'
        }
      },
      {
        path: 'explorar-nextcloud',
        component: ExplorarNextcloud,
        canActivate: [roleGuard],
        data: {
          roles: [Role.Admin, Role.Usuario],
          titulo: 'Explorar Nube',
          subtitulo: 'Lista los archivos subidos a la Nube Privada',
          rutaBreadcrumbs: 'Explorar Nube'
        }
      },
      {
        path: 'reportes',
        component: Reportes,
        canActivate: [roleGuard],
        data: {
          roles: [Role.Admin, Role.Usuario],
          titulo: 'Reportes',
          subtitulo: 'Obtencion de estadisticas y reportes',
          rutaBreadcrumbs: 'Reportes'
        }
      },


    ]
  },
  { path: 'not-found', loadComponent: () => import('./core/components/not-found/not-found.component').then(c => c.NotFoundComponent) },
  { path: '**', redirectTo: '/not-found' },
];
