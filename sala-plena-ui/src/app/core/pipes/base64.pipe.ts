import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'base64',
  standalone: true
})
export class Base64Pipe implements PipeTransform {
  public transform(value: any, contentType: string = 'image/png'): any {
    if (!value) return '';
    return `data:${contentType};base64,${value}`;
  }
}
