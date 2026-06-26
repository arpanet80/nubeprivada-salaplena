import { CommonModule } from '@angular/common';
import {
  Component, Input, Output, EventEmitter, TemplateRef,
  OnInit, OnDestroy, AfterViewInit, booleanAttribute
} from '@angular/core';

declare const bootstrap: any;

@Component({
  selector: 'app-generic-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-modal.html',
  styleUrls: ['./generic-modal.css']
})
export class GenericModalComponent implements OnInit, AfterViewInit, OnDestroy {

  /* ─────────────── Inputs ─────────────── */

  @Input() modalId = 'keenModal';
  @Input() title = 'Modal';
  @Input() width = '650px';
  @Input() height = 'auto';
  @Input() contentTemplate?: TemplateRef<any>;

  /** Transforma string "false" a boolean false */
  @Input({ transform: booleanAttribute }) showSaveButton = true;

  /* ─────────────── Outputs ─────────────── */

  @Output() saveClicked = new EventEmitter<void>();
  @Output() closeClicked = new EventEmitter<void>();
  @Output() opened = new EventEmitter<void>();

  /* ─────────────── Estado interno ─────────────── */

  private modalInstance: any;
  private triggerElement: HTMLElement | null = null;
  private hiddenHandler: (() => void) | null = null;

  /* ─────────────── Ciclo de vida ─────────────── */

  ngOnInit(): void {
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
      console.error('[GenericModal] Bootstrap 5 no está cargado. Asegúrate de incluir bootstrap.bundle.js');
    }
  }

  ngAfterViewInit(): void {
    this.applyDimensions();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /* ─────────────── API Pública ─────────────── */

  /** Abre el modal. Previene múltiples instancias. */
  open(): void {
    if (this.modalInstance) {
      console.warn(`[GenericModal] Modal ${this.modalId} ya está abierto`);
      return;
    }

    this.triggerElement = document.activeElement as HTMLElement;

    const el = document.getElementById(this.modalId);
    if (!el) {
      console.error(`[GenericModal] No se encontró elemento #${this.modalId}`);
      return;
    }

    try {
      this.modalInstance = new bootstrap.Modal(el, {
        backdrop: true,
        keyboard: true,
        focus: true
      });

      this.hiddenHandler = () => this.onModalHidden();
      el.addEventListener('hidden.bs.modal', this.hiddenHandler);

      this.modalInstance.show();
      this.opened.emit();

    } catch (err) {
      console.error(`[GenericModal] Error abriendo modal:`, err);
    }
  }

  /** Cierra el modal manualmente. Limpia todo. */
  close(): void {
    if (!this.modalInstance) return;

    const el = document.getElementById(this.modalId);
    if (el && this.hiddenHandler) {
      el.removeEventListener('hidden.bs.modal', this.hiddenHandler);
      this.hiddenHandler = null;
    }

    this.modalInstance.hide();
    this.cleanup();
    this.closeClicked.emit();
  }

  /** Cierra sin emitir evento (para casos internos) */
  dismiss(): void {
    if (!this.modalInstance) return;
    this.modalInstance.hide();
    this.cleanup();
  }

  /** Verifica si el modal está actualmente abierto */
  isOpen(): boolean {
    return !!this.modalInstance;
  }

  /* ─────────────── Handlers ─────────────── */

  onSave(): void {
    this.saveClicked.emit();
  }

  /** Handler del evento hidden.bs.modal de Bootstrap */
  private onModalHidden(): void {
    this.cleanup();
    this.closeClicked.emit();
  }

  /* ─────────────── Cleanup ─────────────── */

  private cleanup(): void {
    document.body.classList.remove('modal-open', 'kt-modal-open', 'kt-scroll-lock');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.documentElement.style.removeProperty('overflow');

    // Eliminar solo el último backdrop (el de este modal)
    const backdrops = document.querySelectorAll('.modal-backdrop');
    if (backdrops.length > 0) {
      backdrops[backdrops.length - 1].remove();
    }

    if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
      setTimeout(() => this.triggerElement?.focus(), 50);
    }

    this.modalInstance = null;
    this.hiddenHandler = null;
  }

  /** Aplica width/height directamente al DOM */
  private applyDimensions(): void {
    const el = document.getElementById(this.modalId);
    if (!el) return;

    const dialog = el.querySelector('.modal-dialog') as HTMLElement | null;
    const content = el.querySelector('.modal-content') as HTMLElement | null;

    if (dialog) dialog.style.maxWidth = this.width;
    if (content && this.height !== 'auto') content.style.height = this.height;
  }
}
