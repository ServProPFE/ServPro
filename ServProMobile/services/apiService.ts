import { storage } from '@/services/storage';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

class ApiService {
  async request<T>(url: string, options: RequestOptions = {}) {
    const token = await storage.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown network error';
      throw new Error(`Network request failed for ${url}. ${details}. Verify API server availability and mobile API base URL.`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Server returned non-JSON response: ${response.status}`);
    }

    const data = (await response.json()) as T & { message?: string };

    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  }

  get<T>(url: string) {
    return this.request<T>(url, { method: 'GET' });
  }

  post<T>(url: string, body: unknown) {
    return this.request<T>(url, { method: 'POST', body });
  }
}

export const apiService = new ApiService();
