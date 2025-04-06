import { Component, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import axios from 'axios';
import { ModalController } from '@ionic/angular';
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
  weatherData: any;
  hourlyForecast: any[] = [];
  fiveDayForecast: any[] = [];
  currentTime: string = new Date().toLocaleTimeString();
  apiKey = 'a886d4319cc77bab76571802b2e116ce';
  cityName: string = '';
  showSearch: boolean = false;
  temperatureUnit: string = 'metric';
  weatherAlerts: boolean = false;
  isDarkMode: boolean = false;
  showSettings: boolean = false;
  isOffline: boolean = false;

  tempUnitSelection: string = this.temperatureUnit;
  alertSelection: boolean = this.weatherAlerts;
  darkModeSelection: boolean = this.isDarkMode;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.getLocationAndWeather();
    this.loadSettings();
    this.checkNetworkStatus();
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);

    if (!this.weatherData) {
      console.log("No weather data available.");
    } else {
      console.log("Weather data loaded:", this.weatherData);
    }
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
    this.tempUnitSelection = this.temperatureUnit;
    this.alertSelection = this.weatherAlerts;
    this.darkModeSelection = this.isDarkMode;
    this.showSettings = true;
  }

  async closeSettings() {
    this.showSettings = false;
  }

  toggleDarkMode(event: any) {
    this.isDarkMode = event.detail.checked;
    if (this.isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
  
  applyDarkMode() {
    if (this.isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
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

  loadSettings() {
    const storedUnit = localStorage.getItem('temperatureUnit');
    const storedAlerts = localStorage.getItem('weatherAlerts');
    const storedDarkMode = localStorage.getItem('darkMode');
  
    if (storedUnit) this.temperatureUnit = storedUnit;
    if (storedAlerts) this.weatherAlerts = JSON.parse(storedAlerts);
    if (storedDarkMode) this.isDarkMode = JSON.parse(storedDarkMode);
  
    this.tempUnitSelection = this.temperatureUnit;
    this.alertSelection = this.weatherAlerts;
    this.darkModeSelection = this.isDarkMode;
    this.applyDarkMode();
  }

  async fetchWeatherByCity() {
    try {
      if (!this.cityName || this.cityName.trim() === '') {
        alert('Please enter a city name.');
        return;
      }
      const unit = this.temperatureUnit === 'metric' ? 'metric' : 'imperial';
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${this.cityName}&appid=${this.apiKey}&units=metric`
      );
      if (!weatherResponse.data) {
        alert('Weather data not available. Please try again.');
        return;
      }
      
      this.weatherData = weatherResponse.data;
      this.cacheWeatherData(this.weatherData, 'currentWeather');
      const lat = this.weatherData.coord.lat;
      const lon = this.weatherData.coord.lon;
      await this.fetchForecast(lat, lon);
      this.cityName = '';
      this.showSearch = false;
    } catch (error) {
      console.error('Error fetching weather by city:', error);
      alert('City not found. Please enter a valid city name.');
    }
  }

  async getLocationAndWeather() {
    try {
      if (this.isOffline) {
        await this.loadCachedWeather('currentWeather');
        return;
      }
      const position = await Geolocation.getCurrentPosition();
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      await this.fetchWeather(lat, lon);
      await this.fetchForecast(lat, lon);
    } catch (error) {
      console.error('Error getting location or weather:', error);
      alert("Failed to get location. Please enable GPS.");
      await this.loadCachedWeather('currentWeather');
    }
  }
  
  async cacheWeatherData(data: any, key: string) {
    try {
      await Preferences.set({
        key: key,
        value: JSON.stringify(data),
      });
      console.log('Weather data cached:', key);
    } catch (error) {
      console.error('Error caching weather data:', error);
    }
  }
  
  async loadCachedWeather(key: string) {
    try {
      const { value } = await Preferences.get({ key });
      if (value) {
        this.weatherData = JSON.parse(value);
        console.log('Loaded cached data:', this.weatherData);
      } else {
        console.warn('No cached data found.');
        if (this.isOffline) {
          alert('No cached weather data available. Please connect to the internet.');
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
      if (this.isOffline) {
        alert('Error accessing cached weather data. Please connect to the internet.');
      }
    }
  }

  async fetchWeather(lat: number, lon: number) {
    try {
      const unit = this.temperatureUnit === 'metric' ? 'metric' : 'imperial';
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${unit}`
      );
      this.weatherData = weatherResponse.data;
      await Preferences.set({ key: 'currentWeather', value: JSON.stringify(this.weatherData) });
      console.log('Weather data fetched:', this.weatherData);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      await this.loadCachedWeather('currentWeather');
    }
  }
  
  async loadCachedForecast() {
    try {
      const { value } = await Storage.get({ key: 'forecastData' });
      if (value) {
        const data = JSON.parse(value);
        this.hourlyForecast = data.hourly;
        this.fiveDayForecast = data.daily;
        console.log('Loaded cached forecast data:', this.hourlyForecast, this.fiveDayForecast);
        return true;
      } else {
        console.log('No cached forecast data available');
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
      const units = this.temperatureUnit === 'metric' ? 'km/h' : 'mph';
      const forecastResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.temperatureUnit}`
      );
      const forecastData = forecastResponse.data.list;
      console.log('Fetched forecast data:', forecastData);

      this.hourlyForecast = [];
      let addedHours = new Set();

      let currentTime = new Date();
      currentTime.setMinutes(0, 0, 0); 

      const currentWeatherTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const isDaytime = currentTime.getHours() >= 6 && currentTime.getHours() < 18;

      this.hourlyForecast.push({
          dt: Math.floor(currentTime.getTime() / 1000),
          time: "Now",
          temp: this.weatherData.main.temp.toFixed(2),
          wind: `${this.weatherData.wind.speed.toFixed(2)} ${units}`,
          weather: this.weatherData.weather[0].main,
          isDaytime: isDaytime
      });

      addedHours.add("Now");
      currentTime.setHours(currentTime.getHours() + 1);

      for (let i = 0; i < forecastData.length; i++) {
          const current = forecastData[i];
          const forecastTime = new Date(current.dt * 1000);
          const hourString = forecastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

          if (addedHours.has(hourString)) continue;
          addedHours.add(hourString);

          while (currentTime < forecastTime) {
              const interpolatedTime = new Date(currentTime.getTime());
              const interpolatedHourString = interpolatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

              if (!addedHours.has(interpolatedHourString)) {
                  addedHours.add(interpolatedHourString);
                  const isDaytime = interpolatedTime.getHours() >= 6 && interpolatedTime.getHours() < 18;

                  this.hourlyForecast.push({
                      dt: Math.floor(interpolatedTime.getTime() / 1000),
                      time: interpolatedHourString,
                      temp: current.main.temp.toFixed(2),
                      wind: `${current.wind.speed.toFixed(2)} ${units}`,
                      weather: current.weather[0].main,
                      isDaytime: isDaytime
                  });
              }
              currentTime.setHours(currentTime.getHours() + 1);
          }

          const isDaytimeForecast = forecastTime.getHours() >= 6 && forecastTime.getHours() < 18;
          this.hourlyForecast.push({
              dt: Math.floor(forecastTime.getTime() / 1000),
              time: hourString,
              temp: current.main.temp.toFixed(2),
              wind: `${current.wind.speed.toFixed(2)} ${units}`,
              weather: current.weather[0].main,
              isDaytime: isDaytimeForecast
          });
          currentTime = new Date(forecastTime.getTime() + 60 * 60 * 1000);
      }

      this.hourlyForecast = this.hourlyForecast.slice(0, 24);

      this.fiveDayForecast = forecastData.filter((item: any) => item.dt_txt.includes('12:00:00')).slice(0, 5).map((item: any) => {
        let windSpeed = item.wind.speed;
        if (this.temperatureUnit === 'imperial') {
          windSpeed = windSpeed * 0.621371;
        }
          return {
            date: new Date(item.dt * 1000).toLocaleDateString(),
            temp: item.main.temp.toFixed(2),
            wind: `${windSpeed.toFixed(2)} ${units}`,
            weather: item.weather[0].main
          };
       });

      console.log('Processed hourly forecast:', this.hourlyForecast);
      console.log('Processed 5-day forecast:', this.fiveDayForecast);
  } catch (error) {
      console.error('Error fetching forecast:', error);
  }
}

  clearCache() {
      localStorage.removeItem('currentWeather');
      localStorage.removeItem('forecastData');
      alert('Cache cleared.');
    }
    
    formatDate(dateString: string): string {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  
    getWeatherIcon(weather: string, isDaytime: boolean): string {
      if (!weather) return 'assets/weather-icons/sun.png';
      
      const lowerWeather = weather.toLowerCase();
      const currentHour = new Date().getHours();
      const isDay = currentHour >= 6 && currentHour < 18;
    
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
