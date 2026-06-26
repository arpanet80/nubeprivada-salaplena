// ============================================================
// src/app/dashboard/models/nextcloud.model.ts
// ============================================================
export interface NextcloudQuota {
  used: number;
  available: number;
  total: number;
  usedPercent: number;
  freePercent: number;
}

export interface NextcloudFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: string;
  etag?: string;
}

export interface NextcloudShare {
  id: string;
  token: string;
  url: string;
  path: string;
  shareType: number;
  permissions: number;
  expiration?: string;
  password?: string;
}

export interface CreateShareDto {
  path: string;
  password: string;
  expireDate?: string;
}

export interface BrowseDirectoryDto {
  path?: string;
}
