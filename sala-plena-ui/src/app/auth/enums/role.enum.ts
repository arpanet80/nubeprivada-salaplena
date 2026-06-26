// src/app/core/enums/role.enum.ts
export enum Role {
    Admin = 1,
    Rrhh = 2,
    Usuario = 3
}

export class RoleHelper {

  static hasRole(userRoleIds: number[], requiredRole: number): boolean {
    return userRoleIds.includes(requiredRole);
  }

  static hasAnyRole(userRoleIds: number[], requiredRoles: number[]): boolean {
    return requiredRoles.some(role => this.hasRole(userRoleIds, role));
  }

  static hasAllRoles(userRoleIds: number[], requiredRoles: number[]): boolean {
    return requiredRoles.every(role => this.hasRole(userRoleIds, role));
  }

  static getRoleNames(userRoleIds: number[]): string[] {
    const names: string[] = [];
    const roleEntries = Object.entries(Role).filter(([_, v]) => typeof v === 'number');

    for (const [key, value] of roleEntries) {
      if (userRoleIds.includes(value as number)) {
        names.push(key);
      }
    }
    return names;
  }

  static fromRoleIds(roleIds: number[]): number[] {
    return roleIds;
  }
}
