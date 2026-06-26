import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService  {

  private toastr= inject( ToastrService );

  showSuccess(message: string, title: string){
      this.toastr.success(message, title, { closeButton: true, timeOut: 4000, progressBar: true } )
  }

  showError(message: string, title: string){
      this.toastr.error(message, title, { closeButton: true, timeOut: 4000, progressBar: true } )
  }

  showInfo(message: string, title: string){
      this.toastr.info(message, title, { closeButton: true, timeOut: 4000, progressBar: true } )
  }

  showWarning(message: string, title: string){
      this.toastr.warning(message, title, { closeButton: true, timeOut: 4000, progressBar: true } )
  }
}
