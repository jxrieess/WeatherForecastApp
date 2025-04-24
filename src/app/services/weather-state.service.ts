import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WeatherStateService {
  selectedCity: string = '';

  constructor() { }
}
