import { UsuarioSalaPlena } from "../../../auth/interfaces/usuario";
import { Rol } from "./rol.model";
import { Sistema } from "./sistema.model";

export interface Permiso {
    id?: number;
    idusuario: number;
    idrol: number
    idsistema:number
    activo?: boolean;
    usuario?: UsuarioSalaPlena;
    sistema?: Sistema;
    rol?: Rol;

    isEdit?: boolean;

}
