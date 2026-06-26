// validation.service.ts
import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  /* ---------- 1. Catálogo centralizado ---------- */
  private static readonly ERROR_MESSAGES: Record<string, (err?: any) => string> = {
    /* ----- Angular built-in ----- */
    required: () => 'Campo requerido',
    email: () => 'Formato de correo inválido',
    minlength: err => `Mínimo ${err.requiredLength} caracteres (actual ${err.actualLength})`,
    maxlength: err => `Máximo ${err.requiredLength} caracteres (actual ${err.actualLength})`,
    min: err => `El valor mínimo es ${err.min}`,
    max: err => `El valor máximo es ${err.max}`,
    pattern: err => `Formato incorrecto (${err.requiredPattern})`,

    /* ----- Custom tuyos ----- */
    invalidCreditCard: () => 'Número de tarjeta inválido',
    invalidPassword: () => 'Requiere 6-100 caracteres y al menos un número',
    passwordMismatch: () => 'Las contraseñas no coinciden',
    // <--- añade aquí más cuando los vayas creando
  };

  /* ---------- 2. Traductor ---------- */
  static getValidatorErrorMessage(validatorName: string, validatorValue?: any): string {
    const translator = ValidationService.ERROR_MESSAGES[validatorName];
    return translator ? translator(validatorValue) : 'Campo inválido';
  }

  /* ---------- 3. Validadores custom ---------- */
  static creditCardValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value || '';
    const regex = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/;
    return regex.test(v) ? null : { invalidCreditCard: true };
  }

  static passwordValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value || '';
    return /^(?=.*[0-9])[a-zA-Z0-9!@#$%^&*]{6,100}$/.test(v)
      ? null
      : { invalidPassword: true };
  }

  /* Ejemplo: validar que dos campos sean iguales */
  static match(otherControlName: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      const other = control.parent.get(otherControlName);
      return other && control.value === other.value
        ? null
        : { passwordMismatch: true };
    };
  }
}