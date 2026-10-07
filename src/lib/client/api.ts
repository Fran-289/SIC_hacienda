/**
 * Wrapper sobre fetch para llamadas cliente hacia la API de SIC Hacienda.
 * Si recibe 401 (sesión expirada o token inválido), redirige automáticamente a /login.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const current = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${current}&expired=1`;
    }
  }

  return response;
}
