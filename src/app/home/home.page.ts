import { Component, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import axios from 'axios';
import { environment } from 'src/environments/environment';
import { ModalController } from '@ionic/angular';
import { WeatherStateService } from '../services/weather-state.service';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { Storage } from '@capacitor/storage';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  apiKey = environment.apiKey;
  weatherData: any;
  hourlyForecast: any[] = [];
  fiveDayForecast: any[] = [];
  currentTime: string = new Date().toLocaleTimeString();
  cityName: string = '';
  showSearch: boolean = false;
  temperatureUnit: string = 'metric';
  weatherAlerts: boolean = false;
  isDarkMode: boolean = false;
  showSettings: boolean = false;
  isOffline: boolean = false;
  windSpeedUnit: string = 'km/h';

  constructor(private modalCtrl: ModalController, 
    private weatherState: WeatherStateService) {}

 ngOnInit() {
    this.getLocationAndWeather();
    this.loadSettings();
    this.checkNetworkStatus();
    this.loadCachedForecast();

    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }

  async checkNetworkStatus() {
    try {
      const status = await Network.getStatus();
      this.isOffline = !status.connected;
      Network.addListener('networkStatusChange', (status) => {
        this.isOffline = !status.connected;
        if (!this.isOffline) {
          this.getLocationAndWeather();
        }
      });
    } catch (error) {
      console.error('Error checking network status:', error);
      this.isOffline = true;
    }
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  }

  async openSettings() {
    this.showSettings = true;
  }

  async closeSettings() {
    this.showSettings = false;
  }

  toggleDarkMode(event: any) {
    this.isDarkMode = event.detail.checked;
    document.body.classList.toggle('dark', this.isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(this.isDarkMode));
  }
  
  applyDarkMode() {
    document.body.classList.toggle('dark', this.isDarkMode);
  }  

  toggleWeatherAlerts(event: any) {
    this.weatherAlerts = event.detail.checked;
    localStorage.setItem('weatherAlerts', JSON.stringify(this.weatherAlerts));
    alert(this.weatherAlerts ? 'Severe weather alerts enabled.' : 'Severe weather alerts disabled.');
  }

  updateTemperatureUnit(event: any) {
    this.temperatureUnit = event.detail.value;
    localStorage.setItem('temperatureUnit', this.temperatureUnit);
    this.getLocationAndWeather();
  }

  updateWindSpeedUnit(event: any) {
    this.windSpeedUnit = event.detail.value;
    localStorage.setItem('windSpeedUnit', this.windSpeedUnit);
    this.getLocationAndWeather();
  }

  loadSettings() {
    const storedUnit = localStorage.getItem('temperatureUnit');
    const storedAlerts = localStorage.getItem('weatherAlerts');
    const storedDarkMode = localStorage.getItem('darkMode');
    const storedWindUnit = localStorage.getItem('windSpeedUnit');
  
    if (storedUnit) this.temperatureUnit = storedUnit;
    if (storedAlerts) this.weatherAlerts = JSON.parse(storedAlerts);
    if (storedDarkMode) this.isDarkMode = JSON.parse(storedDarkMode);
    if (storedWindUnit) this.windSpeedUnit = storedWindUnit;

    this.applyDarkMode();
  }
  
  async fetchWeatherByCity() {
    try {
      if (!this.cityName || this.cityName.trim() === '') {
        alert('Please enter a city name.');
        return;
      }
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${this.cityName}&appid=${this.apiKey}&units=${this.temperatureUnit}`
      );

      this.weatherData = weatherResponse.data;
      this.weatherState.selectedCity = this.cityName; 
      this.cacheWeatherData(this.weatherData, 'currentWeather');

      const { latitude, longitude } = this.weatherData.coord;
      await this.fetchForecast(latitude, longitude);

      this.cityName = '';
      this.showSearch = false;
    } catch (error) {
      console.error('Error fetching weather by city:', error);
      alert('City not found. Please enter a valid city name.');
    }
  }

  async getLocationAndWeather() {
    try {
      if (this.weatherState.selectedCity) {
        this.cityName = this.weatherState.selectedCity;
        await this.fetchWeatherByCity();
        return;
      }

      if (this.isOffline) {
        await this.loadCachedWeather('currentWeather');
        await this.loadCachedForecast(); 
        return;
      }
      const position = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      await this.fetchWeather(latitude, longitude);
      await this.fetchForecast(latitude, longitude);
    } catch (error) {
      console.error('Error getting location or weather:', error);
      alert("Failed to get location. Please enable GPS.");
      await this.loadCachedWeather('currentWeather');
      await this.loadCachedForecast();
    }
  }

  async fetchWeather(lat: number, lon: number) {
    try {
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.temperatureUnit}`
      );
      this.weatherData = weatherResponse.data;
      await Preferences.set({ key: 'currentWeather', value: JSON.stringify(this.weatherData) });
    } catch (error) {
      console.error('Error fetching weather data:', error);
      await this.loadCachedWeather('currentWeather');
    }
  }

  async cacheWeatherData(data: any, key: string) {
    try {
      await Preferences.set({ key, value: JSON.stringify(data) });
    } catch (error) {
      console.error('Error caching weather data:', error);
    }
  }
  
  async loadCachedWeather(key: string) {
    try {
      const { value } = await Preferences.get({ key });
      if (value) {
        this.weatherData = JSON.parse(value);
      } else if (this.isOffline) {
          alert('No cached weather data available. Please connect to the internet.');
        }
    } catch (error) {
      console.error('Error loading cached data:', error);
      if (this.isOffline) {
        alert('Error accessing cached weather data. Please connect to the internet.');
      }
    }
  }
  
  async loadCachedForecast() {
    try {
      const { value } = await Storage.get({ key: 'forecastData' });
      if (value) {
        const data = JSON.parse(value);
        this.hourlyForecast = data.hourly;
        this.fiveDayForecast = data.daily;
        return true;
      } else {
        alert('No cached forecast data available.');
        return false;
      }
    } catch (error) {
      console.error('Error loading cached forecast data:', error);
      return false;
    }
  }

  async fetchForecast(lat: number, lon: number) {
  try {
      const forecastResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.temperatureUnit}`
      );
      const forecastData = forecastResponse.data.list;

      const now = new Date();
      now.setMinutes(0, 0, 0);

      this.hourlyForecast = [];
      const addedHours = new Set(); 

      const isDaytime = now.getHours() >= 6 && now.getHours() < 18;

      this.hourlyForecast.push({
          dt: Math.floor(now.getTime() / 1000),
          time: "Now",
          temp: this.weatherData.main.temp.toFixed(2),
          wind: this.convertWindSpeed(this.weatherData.wind.speed),
          weather: this.weatherData.weather[0].main,
          description: this.weatherData.weather[0].description,
          humidity: this.weatherData.main.humidity,
          isDaytime: isDaytime
      });

      for (const forecast of forecastData) {
          const forecastTime = new Date(forecast.dt * 1000);
          const hourString = forecastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

          if (addedHours.has(hourString)) continue;
          addedHours.add(hourString);

          const isDaytimeForecast = forecastTime.getHours() >= 6 && forecastTime.getHours() < 18;
          
          this.hourlyForecast.push({
            dt: forecast.dt,
            time: hourString,
            temp: forecast.main.temp.toFixed(2),
            wind: this.convertWindSpeed(forecast.wind.speed),
            weather: forecast.weather[0].main,
            description: forecast.weather[0].description,
            humidity: forecast.main.humidity,
            isDaytimeForecast
          });
  
          if (this.hourlyForecast.length >= 24) break;
        }
  
      this.fiveDayForecast = forecastData.filter((item: any) => item.dt_txt.includes('12:00:00')).slice(0, 5).map((item: any) => ({
            date: new Date(item.dt * 1000).toLocaleDateString(),
            temp: item.main.temp.toFixed(2),
            wind:  this.convertWindSpeed(item.wind.speed),
            humidity: item.main.humidity,
            weather: item.weather[0].main,
            description: item.weather[0].description
       }));
  } catch (error) {
      console.error('Error fetching forecast:', error);
  }
}

convertWindSpeed(speedMps: number): string {
  let value = speedMps;
  switch (this.windSpeedUnit) {
    case 'km/h':
      value = speedMps * 3.6;
      break;
    case 'mph':
      value = speedMps * 2.237;
      break;
    case 'knot':
      value = speedMps * 1.944;
      break;
    case 'm/s':
    default:
      value = speedMps;
      break;
  }
  return `${value.toFixed(2)} ${this.windSpeedUnit}`;
}
    
    formatDate(dateString: string): string {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  
    getWeatherIcon(weather: string, isDaytime: boolean): string {
      if (!weather) return 'assets/weather-icons/sun.png';
      
      const lowerWeather = weather.toLowerCase();
      const isDay = isDaytime;
    
      const iconMap: { [key: string]: string } = {
        clear: isDay ? 'sun.png' : 'night.png',
        clouds: isDay ? 'cloudy.png' : 'cloudy-night.png',
        rain: 'raining.png',
        drizzle: 'raining.png',
        thunderstorm: 'storm.png',
        snow: 'snow.png',
        mist: 'mist.png'
      };
    
      for (const key in iconMap) {
        if (lowerWeather.includes(key)) {
          return `assets/weather-icons/${iconMap[key]}`;
        }
      }
      return isDay ? 'assets/weather-icons/sun.png' : 'assets/weather-icons/night.png';
    }

}