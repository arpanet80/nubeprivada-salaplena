declare module 'httpntlm' {
  interface NtlmOptions {
    url: string;
    username: string;
    password: string;
    domain?: string;
    workstation?: string;
    body?: string;
    headers?: Record<string, string>;
  }

  interface NtlmResponse {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  export function post(
    options: NtlmOptions,
    callback: (err: Error | null, res: NtlmResponse) => void,
  ): void;

  export function get(
    options: NtlmOptions,
    callback: (err: Error | null, res: NtlmResponse) => void,
  ): void;
}   