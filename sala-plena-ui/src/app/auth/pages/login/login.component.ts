import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BruteForceProtectionService } from '../../services/brute-force.service';
import { InactivityService } from '../../services/inactivity.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnDestroy, OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private bruteForceService = inject(BruteForceProtectionService);
  private inactivityService = inject(InactivityService);
  private logger = inject(LoggerService);

  private destroy$ = new Subject<void>();

  loading: boolean = false;
  errorMessage: string = "";
  isBlocked: boolean = false;
  remainingTime: number = 0;

  public myForm: FormGroup = this.fb.group({
    usuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    password: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32)]],
  });

  ngOnInit(): void {
    this.checkBlockStatus();

    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkBlockStatus();
        this.updateFormControlsState();
      });
  }

  private updateFormControlsState(): void {
    if (this.isBlocked) {
      this.myForm.get('usuario')?.disable();
      this.myForm.get('password')?.disable();
    } else {
      this.myForm.get('usuario')?.enable();
      this.myForm.get('password')?.enable();
    }
  }

  private checkBlockStatus(): void {
    this.isBlocked = this.bruteForceService.isBlocked();
    if (this.isBlocked) {
      this.remainingTime = this.bruteForceService.getRemainingBlockTime();
    } else {
      this.remainingTime = 0;
    }
  }

  login(): void {
    if (this.myForm.valid && !this.isBlocked) {
      this.loading = true;
      this.errorMessage = "";

      const { usuario, password } = this.myForm.value;

      this.authService.login(usuario, password)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loading = false;
            this.logger.info('LoginComponent: login exitoso, iniciando inactivity');
            this.inactivityService.startMonitoring();
            this.router.navigate(['/dashboard/home'])
              .then(success => {
                if (!success) {
                  console.error('Error en redirección después del login');
                }
              });
          },
          error: (error) => {
            this.loading = false;
            this.myForm.get('password')?.reset();
            this.checkBlockStatus();
            this.updateFormControlsState();

            if (error.error?.message) {
              this.errorMessage = error.error.message;
            }
            console.error('Error en login:', error);
          }
        });
    } else {
      this.myForm.markAllAsTouched();
    }
  }

  getRemainingTimeText(): string {
    if (!this.isBlocked) return '';
    const minutes = Math.ceil(this.remainingTime / 60000);
    return `Tiempo restante: ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }

  getAttemptsCount(): number {
    return this.bruteForceService.getAttemptCount();
  }

  onInputChange(): void {
    this.errorMessage = "";
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
