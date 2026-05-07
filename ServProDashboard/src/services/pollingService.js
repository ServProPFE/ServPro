import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class PollingService {
  constructor() {
    this.pollingIntervals = {};
    this.listeners = {};
  }

  subscribe(key, callback, interval = 5000) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);

    if (!this.pollingIntervals[key]) {
      this.startPolling(key, interval);
    }

    return () => {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
      if (this.listeners[key].length === 0) {
        this.stopPolling(key);
      }
    };
  }

  startPolling(key, interval) {
    const poll = async () => {
      try {
        let data;
        switch (key) {
          case 'bookings':
            data = await apiService.get(API_ENDPOINTS.BOOKINGS);
            break;
          case 'stats':
            data = await apiService.get(API_ENDPOINTS.BOOKINGS);
            break;
          case 'notifications':
            // Assuming there's a notifications endpoint
            data = await apiService.get(`${API_ENDPOINTS.BOOKINGS.split('/bookings')[0]}/notifications`);
            break;
          default:
            return;
        }

        if (this.listeners[key]) {
          this.listeners[key].forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Error in polling listener for ${key}:`, error);
            }
          });
        }
      } catch (error) {
        console.error(`Polling error for ${key}:`, error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    this.pollingIntervals[key] = setInterval(poll, interval);
  }

  stopPolling(key) {
    if (this.pollingIntervals[key]) {
      clearInterval(this.pollingIntervals[key]);
      delete this.pollingIntervals[key];
    }
  }

  stopAllPolling() {
    Object.keys(this.pollingIntervals).forEach(key => {
      this.stopPolling(key);
    });
  }
}

export default new PollingService();
