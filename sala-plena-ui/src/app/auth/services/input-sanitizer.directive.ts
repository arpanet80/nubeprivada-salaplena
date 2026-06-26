import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { LoggerService } from './logger.service';

@Directive({
  selector: '[appInputSanitizer]',
  standalone: true
})
export class InputSanitizerDirective {
  private el = inject(ElementRef);
  private control = inject(NgControl, { optional: true });
  private logger = inject(LoggerService);

  @Input() sanitizeType: 'alphanumeric' | 'numeric' | 'text' | 'email' | 'username' = 'text';
  @Input() maxLength: number = 255;
  @Input() allowSpaces: boolean = true;

  private readonly patterns = {
    alphanumeric: /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,
    numeric: /[^0-9]/g,
    text: /[<>]/g,
    email: /[^a-zA-Z0-9@._-]/g,
    username: /[^a-zA-Z0-9._-]/g
  };

  private readonly criticalPatterns = [
    /<script[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]*)/gi,
    /eval\s*\(/gi
  ];

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (this.containsCriticalPattern(value)) {
      this.logger.security('Input con XSS crítico detectado y sanitizado', {
        type: this.sanitizeType,
        timestamp: new Date().toISOString()
      });
      value = this.removeCriticalPatterns(value);
    }

    const sanitized = this.sanitize(value);

    if (sanitized !== input.value) {
      input.value = sanitized;
      if (this.control?.control) {
        this.control.control.setValue(sanitized, { emitEvent: false });
      }
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') || '';
    const sanitized = this.sanitize(this.removeCriticalPatterns(pastedText));

    const input = event.target as HTMLInputElement;
    input.value = sanitized;

    if (this.control?.control) {
      this.control.control.setValue(sanitized, { emitEvent: false });
    }
  }

  private sanitize(value: string): string {
    if (!value) return value;

    let sanitized = value;

    const pattern = this.patterns[this.sanitizeType];
    if (pattern) {
      sanitized = sanitized.replace(pattern, '');
    }

    if (!this.allowSpaces) {
      sanitized = sanitized.replace(/\s/g, '');
    }

    if (sanitized.length > this.maxLength) {
      sanitized = sanitized.substring(0, this.maxLength);
    }

    return sanitized.trim();
  }

  private containsCriticalPattern(value: string): boolean {
    return this.criticalPatterns.some(pattern => pattern.test(value));
  }

  private removeCriticalPatterns(value: string): string {
    let cleaned = value;
    this.criticalPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    return cleaned;
  }
}
