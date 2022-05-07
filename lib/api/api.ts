import { SetTokens } from '../LoginContext';

const apiServer =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://polycode.juno.nponsard.net'
    : 'http://localhost:8080');

// Fetch the backend api
export async function fetchApi<T>(
  ressource: string,
  options?: RequestInit,
): Promise<{ json: T; status: number }> {
  const response = await fetch(apiServer + ressource, options);
  const json = await response.json();
  return {
    json,
    status: response.status,
  };
}

export async function fetchJSONApi<T>(
  ressource: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any,
): Promise<{ json: T; status: number }> {
  return fetchApi<T>(ressource, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
export interface Credentials {
  accessToken: string;
  refreshToken: string;
}

async function refreshTokens(
  credentials: Credentials,
  setTokens: SetTokens,
): Promise<void> {
  const {
    json: { accessToken, refreshToken },
  } = await fetchJSONApi<{
    accessToken: string;
    refreshToken: string;
  }>('/auth/refresh', 'POST', {
    refreshToken: credentials.refreshToken,
  });

  setTokens(accessToken, refreshToken);
}

// Fetch the backend api with automatic refresh
export async function fetchApiWithAuth<T>(
  ressource: string,
  credentials: Credentials,
  setTokens: SetTokens,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
): Promise<{ json: T; status: number }> {
  const response = await fetch(apiServer + ressource, {
    body: body ? JSON.stringify(body) : undefined,
    method,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    await refreshTokens(credentials, setTokens);

    return fetchApiWithAuth(ressource, credentials, setTokens, method, body);
  }

  const json = await response.json();

  return {
    json,
    status: response.status,
  };
}
