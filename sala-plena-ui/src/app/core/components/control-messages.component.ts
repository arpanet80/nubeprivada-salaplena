import { Component, Input } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { ValidationService } from '../services/validation.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'control-messages',
  standalone: true,
  imports: [
    NgIf
  ],
  template: `<div *ngIf="errorMessage !== null" > <span class="form-text text-danger"> {{errorMessage}} </span>  </div>`

})
export class ControlMessagesComponent {
////////////////////////////////////////////////////////////////
////// Este componente usa el servicio ValidationService  //////
////////////////////////////////////////////////////////////////

  @Input() control!: FormControl;
  constructor() { }

  get errorMessage() {
    for (let propertyName in this.control.errors) {
      if (this.control.errors.hasOwnProperty(propertyName) && this.control.touched) {

        return ValidationService.getValidatorErrorMessage(propertyName, this.control.errors[propertyName]);

      }
    }

    return null;
  }
}
