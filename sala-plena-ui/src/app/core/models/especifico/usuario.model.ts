import { Permiso } from "./permiso.model";

export interface UsuarioModel {
    id?: number;
    usuario: string;
    idfuncionario: number
    contrasena:string
    activo?: boolean;
    permisos?: Permiso[];

    isEdit?: boolean;

}
