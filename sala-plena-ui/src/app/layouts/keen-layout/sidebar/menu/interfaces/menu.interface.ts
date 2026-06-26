export interface etiqueta {
      titulo: string,
      roles?: number[]
  }
  
  
  export interface opcionSimple {
      titulo: string,
      icono?: string,
      url: string,
      roles?: number[]
  }
  
  export interface menuPrimerNivel {
      titulo: string,
      icono?: string,
      url: string,
      roles?: number[]
      opcionSimple: opcionSimple[],

  }
  
  export interface menuSegundoNivel {
      titulo: string,
      icono?: string,
      url: string,
      roles?: number[]
      opcionSimple?: opcionSimple[]
      menuPrimerNivel?: menuPrimerNivel[]
  }
  
  export interface menuSidebar {
    etiqueta: string,
    opcionSimple?: opcionSimple[],
    menuPrimerNivel?: menuPrimerNivel[],
    menuSegundoNivel?: menuSegundoNivel[]
  }

//   export interface Role {
//     rol: number
//   }
  