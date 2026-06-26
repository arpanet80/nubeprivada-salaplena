////// ARMAR EL MENU EN EL ORDEN QUE APARECERA EN EL SIDEBAR ////////////

import { Role } from "../../../../../auth/enums/role.enum";

export const menuDeOpciones = {

    etiquetaInicio: {
        titulo: 'Sesiones sala plena',
        roles: [Role.Admin, Role.Usuario]
    },

    opcionSimpleDashboard: {
      titulo: 'Dashboard',
      icono:  "bi bi-grid-fill",
      url: "/dashboard/home",
      roles: [Role.Admin, Role.Rrhh, Role.Usuario]
    },
    opcionSimpleSesion: {
      titulo: 'Nueva Sesion',
      icono:  "bi bi-bell-fill",
      url: "/dashboard/nueva-sesion",
      roles: [Role.Admin, Role.Usuario]
    },
    opcionSimpleNotificaciones: {
      titulo: 'Notificaciones',
      icono:  "bi bi-bell-fill",
      url: "/dashboard/notificacion",
      roles: [Role.Admin, Role.Rrhh, Role.Usuario]
    },
    opcionSimpleExplorar: {
      titulo: 'Explorar Nuba',
      icono:  "bi bi-collection-fill",
      url: "/dashboard/explorar-nextcloud",
      roles: [Role.Admin, Role.Usuario]
    },
    opcionSimpleReportes: {
      titulo: 'Reportes',
      icono:  "bi bi-clipboard-data",
      url: "/dashboard/reportes",
      roles: [Role.Admin]
    },
}


////////////////////////////////////////////////////////
///////// EJEMPLO DE MENU COMPLETO ///////////////////
////////////////////////////////////////////////////////

/*
export const menuDeOpcionesVotante = {

    etiquetaFuncionarios: {
        titulo: 'Funcionarios',
        roles: [Role.Admin,]
    },

    etiquetaSistema: {
        titulo: 'Sistema'
    },

    opcionSimple: {
            titulo: 'Configuracion',
            icono:  "bi bi-gear-fill",
            url: "/dashboard/configuracion",
            roles: [Role.Admin,]
    },
    opcionSimpleAcercade: {
        titulo: 'Acerca de..',
        icono:  "bi bi-gear-fill",
        url: "/dashboard/configuracion",
        roles: [Role.Admin, Role.Rrhh, Role.Usuario]
    },
    menuPrimerNivel: [
        {
            titulo: 'Funcionarios',
            icono: "bi bi-android",
            url: "/dashboard/funcionarios",
            roles: [Role.Admin, Role.Usuario],
            opcionSimple: [
                {
                    titulo: 'Registro',
                    url: "/dashboard/funcionarios/usuarioslist",
                    icono: "bi bi-android",
                    roles: [Role.Admin, Role.Usuario],
                },
                {
                    titulo: 'Perfil',
                    url: "/dashboard/funcionarios/usuariosperfil",
                    roles: [Role.Admin],


                },
                {
                    titulo: 'Credencial',
                    url: "/dashboard/funcionarios/credenciales",
                    roles: [Role.Admin],

                },
                {
                    titulo: 'Entrega Credencial',
                    url: "/dashboard/funcionarios/actacredenciales"
                },
            ]

        },
        {
            titulo: 'Sistemas',
            icono: "bi bi-android",
            url: "/dashboard/sistema",
            roles: [Role.Admin, Role.Usuario],
            opcionSimple: [

                {
                    titulo: 'Usuarios',
                    // icono:  "bi bi-gear-fill",
                    url: "/dashboard/sistema/usuarios"
                },
                {
                    titulo: 'Sistemas Permisos',
                    // icono:  "bi bi-gear-fill",
                    url: "/dashboard/sistema/sistemalist"
                },
            ]

        }
    ],
    menuSegundoNivel: [
        {
            titulo: 'MenuSEgundo Nivel',
            icono: "bi bi-android",
            url: "/dashboard/usuarios",
            roles: [Role.Admin, Role.Usuario],
            menuPrimerNivel: [
                {
                    titulo: 'Usuarios',
                    icono: "bi bi-android",
                    url: "/dashboard/usuarios",
                    roles: [Role.Admin, Role.Usuario],

                    opcionSimple: [
                        {
                            titulo: 'Lista usuarios',
                            url: "/dashboard/usuarios/usuarioslist",
                            roles: [Role.Admin],
                        },
                        {
                            titulo: 'Perfil',
                            // icono:  "bi bi-gear-fill",
                            url: "/dashboard/usuarios/usuariosperfil"
                        },
                    ]

                },
                {
                    titulo: 'Formularios',
                    icono: "bi bi-android",
                    url: "/dashboard/formularios",
                    opcionSimple: [
                        {
                            titulo: 'Lista',
                            // icono:  "bi bi-gear-fill",
                            url: "/dashboard/formularios/usuarioslist"
                        },
                        {
                            titulo: 'Reportes',
                            // icono:  "bi bi-gear-fill",
                            url: "/dashboard/formularios/reporteslist"
                        },
                    ]

                }
            ]
        }
    ]
}

*/
