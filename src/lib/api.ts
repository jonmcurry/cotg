/**
 * Frontend API Client
 * Centralized HTTP client for backend API calls
 *
 * Usage:
 *   import { api } from '../lib/api'
 *   const leagues = await api.get<League[]>('/leagues')
 *   const league = await api.post<League>('/leagues', { name: 'My League', ... })
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorBody: unknown
    try {
      errorBody = await res.json()
    } catch {
      errorBody = await res.text()
    }

    const message = typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody
      ? String((errorBody as { error: string }).error)
      : `HTTP ${res.status}: ${res.statusText}`

    throw new ApiError(message, res.status, errorBody)
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

export const api = {
  /**
   * GET request
   */
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}/api${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return handleResponse<T>(res)
  },

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(res)
  },

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(res)
  },

  /**
   * DELETE request
   */
  async delete<T = void>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}/api${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return handleResponse<T>(res)
  },
}

// Export base URL for debugging
export const getApiBaseUrl = () => API_BASE
