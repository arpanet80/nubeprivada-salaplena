import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ValidationService } from './validation.service';

@Component({
  selector: 'control-messages',
  standalone: true,
  imports: [
    NgIf
  ],
  template: `
    <div class="fv-row"
       [class.has-error]="control.invalid && control.touched"
       [class.has-success]="control.valid && control.touched">

    <div class="input-icon-wrapper">
      <ng-content></ng-content>

      <!-- icono ROJO error -->
      <span class="input-icon input-icon-error"
            *ngIf="control.invalid && control.touched">✕</span>

      <!-- icono VERDE éxito -->
      <span class="input-icon input-icon-success"
            *ngIf="control.valid && control.touched">✓</span>
    </div>

    <div class="field-error-message" *ngIf="control.invalid && control.touched">
      <span>{{ errorMessage }}</span>
    </div>
  </div>
  `,
  styleUrls: ['./validation-messages.component.css']
})
export class ControlMessagesComponent {

  @Input() control!: FormControl;

  get errorMessage() {
    for (let propertyName in this.control.errors) {
      if (this.control.errors.hasOwnProperty(propertyName) && this.control.touched) {

        return ValidationService.getValidatorErrorMessage(propertyName, this.control.errors[propertyName]);

      }
    }

    return null;
  }
}
