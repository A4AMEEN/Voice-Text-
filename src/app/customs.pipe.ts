import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'customs'
})
export class CustomsPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
