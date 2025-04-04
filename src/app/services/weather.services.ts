import { Injectable } from '@angular/core';
import axios from 'axios';
import { Geolocation } from '@capacitor/geolocation';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  async getCurrentPosition() {
    const coordinates = await Geolocation.getCurrentPosition();
    return {
      latitude: coordinates.coords.latitude,
      longitude: coordinates.coords.longitude,
    };
  }

  async getCurrentWeather(lat: number, lon: number) {
    const response = await axios.get(`${environment.apiUrl}weather`, {
      params: {
        lat,
        lon,
        appid: environment.apiKey,
        units: 'metric'
      }
    });
    return response.data;
  }

  async getHourlyForecast(lat: number, lon: number) {
    const response = await axios.get(`${environment.apiUrl}onecall`, {
      params: {
        lat,
        lon,
        appid: environment.apiKey,
        units: 'metric',
        exclude: 'minutely,daily,alerts'
      }
    });
    return response.data.hourly;
  }

  async getFiveDayForecast(lat: number, lon: number) {
    const response = await axios.get(`${environment.apiUrl}forecast`, {
      params: {
        lat,
        lon,
        appid: environment.apiKey,
        units: 'metric'
      }
    });
    return response.data.list;
  }



}
