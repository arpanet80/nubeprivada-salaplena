import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import Swal, { SweetAlertIcon, SweetAlertResult, SweetAlertOptions } from 'sweetalert2';

export interface AlertConfig {
  title?: string;
  message: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  allowOutsideClick?: boolean;
  allowEscapeKey?: boolean;
}

export interface InputBoxConfig {
  title?: string;
  message?: string;
  inputType?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea';
  placeholder?: string;
  defaultValue?: string | number;
  validator?: (value: string) => string | null | Promise<string | null>;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowEmpty?: boolean;
  html?: boolean; // ⚠️ Solo usar con contenido confiable
}

export interface MultiInputField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'select' | 'textarea';
  placeholder?: string;
  defaultValue?: string | number;
  options?: { [key: string]: string }; // Para selects
  required?: boolean;
  validator?: (value: string) => string | null;
}

export interface MultiInputResult {
  isConfirmed: boolean;
  isDenied: boolean;
  isDismissed: boolean;
  values: { [key: string]: string };
  dismiss?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SweetAlertService {

  constructor(private sanitizer: DomSanitizer) {}

  /*═══════════════════════════════════════════════════════════════
    ALERTAS BÁSICAS (Corregidas con sanitización y manejo de errores)
  ═══════════════════════════════════════════════════════════════*/

  /**
   * Alerta de éxito con manejo de errores
   */
  success(message: string, title: string = '¡Éxito!'): Promise<SweetAlertResult> {
    return this.fireSafe({
      icon: 'success',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#28a745',
      timer: 3000,
      timerProgressBar: true
    });
  }

  /**
   * Alerta de error
   */
  error(message: string, title: string = 'Error'): Promise<SweetAlertResult> {
    return this.fireSafe({
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#dc3545'
    });
  }

  /**
   * Alerta de advertencia
   */
  warning(message: string, title: string = 'Advertencia'): Promise<SweetAlertResult> {
    return this.fireSafe({
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#ffc107',
      customClass: { confirmButton: 'text-dark' } // Mejor contraste
    });
  }

  /**
   * Alerta informativa
   */
  info(message: string, title: string = 'Información'): Promise<SweetAlertResult> {
    return this.fireSafe({
      icon: 'info',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#17a2b8'
    });
  }

  /*═══════════════════════════════════════════════════════════════
    CONFIRMACIONES (Sanitizadas y seguras)
  ═══════════════════════════════════════════════════════════════*/

  /**
   * Confirmación SÍ/NO segura
   * @deprecated El parámetro `html` booleano es inseguro. Usar `confirmHtml()` para contenido HTML confiable.
   */
  confirm(
    message: string,
    title: string = '¿Estás seguro?',
    confirmText: string = 'Sí, continuar',
    cancelText: string = 'Cancelar',
    allowHtml: boolean = false
  ): Promise<SweetAlertResult> {
    if (allowHtml) {
      console.warn('SweetAlertService.confirm(): allowHtml=true puede ser inseguro. Usa confirmHtml() para contenido HTML explícito.');
    }

    return this.fireSafe({
      icon: 'question',
      title,
      html: allowHtml ? this.sanitizeHtml(message) : undefined,
      text: allowHtml ? undefined : message,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });
  }

  /**
   * Confirmación con HTML sanitizado (solo usar con contenido confiable)
   */
  confirmHtml(
    htmlContent: string,
    title: string = '¿Estás seguro?',
    confirmText: string = 'Sí, continuar',
    cancelText: string = 'Cancelar'
  ): Promise<SweetAlertResult> {
    return this.fireSafe({
      icon: 'question',
      title,
      html: this.sanitizeHtml(htmlContent),
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });
  }

  /**
   * Confirmación de eliminación
   */
  confirmDelete(
    message: string = 'Esta acción no se puede deshacer',
    title: string = '¿Eliminar registro?'
  ): Promise<SweetAlertResult> {
    return this.fireSafe({
      icon: 'warning',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      focusCancel: true // Foco en cancelar por seguridad
    });
  }

  /*═══════════════════════════════════════════════════════════════
    TOASTS (Sin fugas de memoria)
  ═══════════════════════════════════════════════════════════════*/

  /**
   * Toast configurable sin fugas de memoria
   */
  toast(
    message: string,
    icon: SweetAlertIcon = 'success',
    position: 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start' | 'top' | 'bottom' | 'center' = 'top-end',
    duration: number = 3000
  ): Promise<SweetAlertResult> {
    const Toast = Swal.mixin({
      toast: true,
      position,
      showConfirmButton: false,
      timer: duration,
      timerProgressBar: true,
      didOpen: (toast) => {
        const enterHandler = () => Swal.stopTimer();
        const leaveHandler = () => Swal.resumeTimer();
        toast.addEventListener('mouseenter', enterHandler);
        toast.addEventListener('mouseleave', leaveHandler);
        
        // Guardar referencia para cleanup (SweetAlert2 no expone remove, pero el DOM se destruye)
        (toast as any).__swalHandlers = { enterHandler, leaveHandler };
      },
      willClose: (toast) => {
        const handlers = (toast as any).__swalHandlers;
        if (handlers) {
          toast.removeEventListener('mouseenter', handlers.enterHandler);
          toast.removeEventListener('mouseleave', handlers.leaveHandler);
        }
      }
    });

    return Toast.fire({ icon, title: message });
  }

  toastSuccess(message: string, position?: any): Promise<SweetAlertResult> {
    return this.toast(message, 'success', position);
  }

  toastError(message: string, position?: any): Promise<SweetAlertResult> {
    return this.toast(message, 'error', position);
  }

  toastWarning(message: string, position?: any): Promise<SweetAlertResult> {
    return this.toast(message, 'warning', position);
  }

  toastInfo(message: string, position?: any): Promise<SweetAlertResult> {
    return this.toast(message, 'info', position);
  }

  /*═══════════════════════════════════════════════════════════════
    INPUTBOX COMPLETO (Nueva funcionalidad robusta)
  ═══════════════════════════════════════════════════════════════*/

  /**
   * InputBox simple con validación completa
   */
    async inputbox(config: InputBoxConfig): Promise<SweetAlertResult & { value?: string }> {
    const {
      title = 'Ingrese un valor',
      message = '',
      inputType = 'text',
      placeholder = '',
      defaultValue = '',
      validator,
      required = true,
      minLength,
      maxLength,
      min,
      max,
      pattern,
      allowEmpty = false
    } = config;

    const result = await this.fireSafe({
      title,
      text: message,
      input: inputType === 'textarea' ? 'textarea' : inputType,
      inputPlaceholder: placeholder,
      inputValue: defaultValue?.toString() ?? '',
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      inputAttributes: {
        ...(minLength !== undefined && { minlength: minLength.toString() }),
        ...(maxLength !== undefined && { maxlength: maxLength.toString() }),
        ...(min !== undefined && { min: min.toString() }),
        ...(max !== undefined && { max: max.toString() }),
        ...(pattern && { pattern }),
        autocomplete: 'off'
      },
      // 🆕 TIPADO EXPLÍCITO DEL VALOR EN INPUTVALIDATOR
      inputValidator: async (value: string): Promise<string | null> => {
        // Validación de requerido
        if (required && (!value || value.trim() === '')) {
          return 'Este campo es obligatorio';
        }

        // Permitir vacío si se configura
        if (!allowEmpty && value === '') {
          return 'Este campo no puede estar vacío';
        }

        const strValue = value.trim();

        // Validación de longitud
        if (minLength !== undefined && strValue.length < minLength) {
          return `Mínimo ${minLength} caracteres`;
        }
        if (maxLength !== undefined && strValue.length > maxLength) {
          return `Máximo ${maxLength} caracteres`;
        }

        // Validación numérica
        if (inputType === 'number' && strValue !== '') {
          const num = Number(strValue);
          if (isNaN(num)) return 'Debe ser un número válido';
          if (min !== undefined && num < min) return `Valor mínimo: ${min}`;
          if (max !== undefined && num > max) return `Valor máximo: ${max}`;
        }

        // Validación de patrón
        if (pattern && strValue !== '') {
          const regex = new RegExp(pattern);
          if (!regex.test(strValue)) {
            return 'Formato inválido';
          }
        }

        // Validador personalizado asíncrono
        if (validator) {
          const customError = await validator(strValue);
          if (customError) return customError;
        }

        return null;
      }
    });

    return result;
  }

  /**
   * InputBox para número con validación numérica robusta
   */
  async inputNumber(
    message: string,
    title: string = 'Ingrese un número',
    config?: Omit<InputBoxConfig, 'inputType' | 'message' | 'title'>
  ): Promise<SweetAlertResult & { value?: number }> {
    const result = await this.inputbox({
      title,
      message,
      inputType: 'number',
      ...config
    });

    if (result.isConfirmed && result.value !== undefined) {
      const num = Number(result.value);
      return { ...result, value: isNaN(num) ? undefined : num };
    }

    return result as any;
  }

  /**
   * InputBox para email con validación de formato
   */
  async inputEmail(
    message: string = 'Ingrese su correo electrónico',
    title: string = 'Email',
    config?: Omit<InputBoxConfig, 'inputType' | 'message' | 'title'>
  ): Promise<SweetAlertResult & { value?: string }> {
    return this.inputbox({
      title,
      message,
      inputType: 'email',
      placeholder: 'ejemplo@correo.com',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      ...config
    });
  }

  /**
   * InputBox de contraseña con confirmación
   */
  async inputPassword(
    message: string = 'Ingrese su contraseña',
    title: string = 'Contraseña',
    confirmPassword: boolean = false
  ): Promise<SweetAlertResult & { value?: string }> {
    if (!confirmPassword) {
      return this.inputbox({
        title,
        message,
        inputType: 'password',
        placeholder: '••••••••',
        minLength: 6
      });
    }

    // Doble input para confirmación
    return this.fireSafe({
      title,
      html: `
        <div class="swal2-input-group mb-3">
          <input id="swal-password1" class="swal2-input" type="password" placeholder="Contraseña" autocomplete="new-password">
        </div>
        <div class="swal2-input-group">
          <input id="swal-password2" class="swal2-input" type="password" placeholder="Confirmar contraseña" autocomplete="new-password">
        </div>
        <div id="swal-password-error" class="swal2-validation-message" style="display:none;"></div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      preConfirm: () => {
        const p1 = (document.getElementById('swal-password1') as HTMLInputElement)?.value;
        const p2 = (document.getElementById('swal-password2') as HTMLInputElement)?.value;
        const errorEl = document.getElementById('swal-password-error');

        if (!p1 || p1.length < 6) {
          if (errorEl) {
            errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
            errorEl.style.display = 'block';
          }
          return false;
        }

        if (p1 !== p2) {
          if (errorEl) {
            errorEl.textContent = 'Las contraseñas no coinciden';
            errorEl.style.display = 'block';
          }
          return false;
        }

        return p1;
      }
    }) as Promise<any>;
  }

  /*═══════════════════════════════════════════════════════════════
    MÚLTIPLES INPUTS (Nueva funcionalidad)
  ═══════════════════════════════════════════════════════════════*/

  /**
   * Formulario con múltiples campos en un solo modal
   */
  async multiInput(
    fields: MultiInputField[],
    title: string = 'Complete los datos',
    message?: string
  ): Promise<MultiInputResult> {
    const htmlFields = fields.map((field, index) => {
      const inputId = `swal-field-${index}`;
      const requiredAttr = field.required ? 'required' : '';
      
      let inputHtml = '';
      
      if (field.type === 'select' && field.options) {
        const optionsHtml = Object.entries(field.options)
          .map(([key, val]) => `<option value="${key}">${val}</option>`)
          .join('');
        inputHtml = `
          <select id="${inputId}" class="swal2-input" ${requiredAttr}>
            <option value="">${field.placeholder || 'Seleccionar...'}</option>
            ${optionsHtml}
          </select>
        `;
      } else if (field.type === 'textarea') {
        inputHtml = `
          <textarea id="${inputId}" class="swal2-textarea" 
            placeholder="${field.placeholder || ''}" ${requiredAttr}>${field.defaultValue || ''}</textarea>
        `;
      } else {
        inputHtml = `
          <input id="${inputId}" class="swal2-input" type="${field.type || 'text'}" 
            placeholder="${field.placeholder || ''}" value="${field.defaultValue || ''}" ${requiredAttr}>
        `;
      }

      return `
        <div class="swal2-input-group mb-3 text-start">
          <label for="${inputId}" class="form-label fw-semibold text-gray-700 mb-1">${field.label}</label>
          ${inputHtml}
          <div id="${inputId}-error" class="text-danger fs-7 mt-1" style="display:none;"></div>
        </div>
      `;
    }).join('');

    const result = await this.fireSafe({
      title,
      html: `
        ${message ? `<p class="mb-4 text-gray-600">${message}</p>` : ''}
        ${htmlFields}
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      preConfirm: () => {
        const values: { [key: string]: string } = {};
        const errors: string[] = [];

        fields.forEach((field, index) => {
          const el = document.getElementById(`swal-field-${index}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          const errorEl = document.getElementById(`swal-field-${index}-error`);
          const value = el?.value?.trim() || '';

          // Limpiar error previo
          if (errorEl) errorEl.style.display = 'none';

          // Validar requerido
          if (field.required && !value) {
            if (errorEl) {
              errorEl.textContent = `${field.label} es obligatorio`;
              errorEl.style.display = 'block';
            }
            errors.push(field.name);
            return;
          }

          // Validador personalizado
          if (field.validator && value) {
            const customError = field.validator(value);
            if (customError) {
              if (errorEl) {
                errorEl.textContent = customError;
                errorEl.style.display = 'block';
              }
              errors.push(field.name);
              return;
            }
          }

          values[field.name] = value;
        });

        if (errors.length > 0) {
          return false;
        }

        return values;
      }
    });

    return {
      isConfirmed: result.isConfirmed,
      isDenied: result.isDenied,
      isDismissed: result.isDismissed,
      values: (result.value as any) || {},
      dismiss: (result as any).dismiss
    };
  }

  /*═══════════════════════════════════════════════════════════════
    LOADING Y UTILIDADES
  ═══════════════════════════════════════════════════════════════*/

  /**
   * Loading con protección contra cierre accidental
   */
  loading(message: string = 'Cargando...', title: string = 'Por favor espera'): void {
    Swal.fire({
      title,
      text: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * Cierra cualquier alerta abierta de forma segura
   */
  close(): void {
    if (Swal.isVisible()) {
      Swal.close();
    }
  }

  /**
   * Alerta con HTML sanitizado (solo contenido confiable)
   */
  html(htmlContent: string, title: string = '', icon?: SweetAlertIcon): Promise<SweetAlertResult> {
    return this.fireSafe({
      title,
      html: this.sanitizeHtml(htmlContent),
      icon,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6c757d'
    });
  }

  /**
   * Alerta personalizada completa
   */
  custom(config: AlertConfig): Promise<SweetAlertResult> {
    return this.fireSafe({
      icon: config.icon || 'info',
      title: config.title || '',
      text: config.message,
      confirmButtonText: config.confirmButtonText || 'Aceptar',
      cancelButtonText: config.cancelButtonText || 'Cancelar',
      showCancelButton: config.showCancelButton || false,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      allowOutsideClick: config.allowOutsideClick ?? true,
      allowEscapeKey: config.allowEscapeKey ?? true
    });
  }

  /*═══════════════════════════════════════════════════════════════
    ALERTAS ESPECÍFICAS DE DOMINIO
  ═══════════════════════════════════════════════════════════════*/

  sessionExpired(): Promise<SweetAlertResult> {
    return this.warning(
      'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      'Sesión expirada'
    );
  }

  unauthorized(): Promise<SweetAlertResult> {
    return this.warning(
      'No tienes permisos para realizar esta acción.',
      'Acceso denegado'
    );
  }

  validationError(message: string = 'Por favor, verifica los campos del formulario'): Promise<SweetAlertResult> {
    return this.error(message, 'Error de validación');
  }

  serverError(message: string = 'Ha ocurrido un error en el servidor'): Promise<SweetAlertResult> {
    return this.error(message, 'Error del servidor');
  }

  networkError(message: string = 'No se pudo conectar con el servidor'): Promise<SweetAlertResult> {
    return this.error(message, 'Error de conexión');
  }

  /*═══════════════════════════════════════════════════════════════
    MÉTODOS PRIVADOS DE SEGURIDAD
  ═══════════════════════════════════════════════════════════════*/

  /**
   * Ejecuta Swal.fire con sanitización y manejo de errores
   */
  private fireSafe(options: SweetAlertOptions): Promise<SweetAlertResult> {
    return Swal.fire(options).catch(err => {
      console.error('SweetAlert2 error:', err);
      return {
        isConfirmed: false,
        isDenied: false,
        isDismissed: true,
        value: null
      } as SweetAlertResult;
    });
  }

  /**
   * Sanitiza HTML para prevenir XSS
   */
  private sanitizeHtml(html: string): string {
    // Usa Angular DomSanitizer para eliminar scripts y eventos peligrosos
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html);
    return sanitized || '';
  }
}