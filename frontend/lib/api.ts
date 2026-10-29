export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/** API недоступен: сеть, прокси или упавший бэкенд. */
export function isNetworkError(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'network');
  }

  if (!res.ok) {
    let code = 'error';
    try {
      const data = await res.json();
      if (typeof data?.detail === 'string') code = data.detail;
      else if (data?.detail) code = 'validation_error';
    } catch {
      /* тело не JSON */
    }
    throw new ApiError(res.status, code);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export function body(obj: Record<string, unknown>) {
  return JSON.stringify(obj);
}

/* Человеческие формулировки вместо системных кодов. */
const ERROR_MESSAGES: Record<string, string> = {
  wrong_credentials: 'Неверный логин или пароль. Попробуйте еще раз',
  invalid_credentials: 'Неверный логин или пароль. Попробуйте еще раз',
  user_not_found: 'Неверный логин или пароль. Попробуйте еще раз',
  bad_credentials: 'Неверный логин или пароль. Попробуйте еще раз',
  invalid_code: 'Код не подошёл. Получите новый в боте и попробуйте снова.',
  wrong_code: 'Код не подошёл. Получите новый в боте и попробуйте снова.',
  code_expired: 'Код истёк. Получите новый в боте.',
  session_expired: 'Сессия истекла. Войдите заново.',
  session_not_found: 'Сессия входа не найдена. Начните заново.',
  unauthorized: 'Нужно войти в аккаунт.',
  blocked: 'Аккаунт заблокирован. Напишите в поддержку.',
  user_blocked: 'Аккаунт заблокирован. Напишите в поддержку.',
  rate_limited: 'Слишком много попыток. Попробуйте через несколько минут.',
  too_many_requests: 'Слишком много попыток. Попробуйте через несколько минут.',
  validation_error: 'Проверьте, что все поля заполнены правильно.',
  not_found: 'Такой страницы или данных больше нет.',
  network: 'Сервис временно недоступен. Попробуйте ещё раз.',
  error: 'Что-то пошло не так. Попробуйте ещё раз.',
};

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) {
      return 'Сервис временно недоступен. Попробуйте ещё раз.';
    }
    const known = ERROR_MESSAGES[error.code];
    if (known) return known;
    if (error.status === 401) return 'Неверный логин или пароль. Попробуйте еще раз';
    if (error.status === 403) return 'Недостаточно прав для этого действия.';
    if (error.status === 429) return 'Слишком много попыток. Попробуйте через несколько минут.';
    return 'Что-то пошло не так. Попробуйте ещё раз.';
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}
