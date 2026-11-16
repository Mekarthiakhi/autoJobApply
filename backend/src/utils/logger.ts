export interface LogContext {
  agent?: string;
  userId?: string;
  jobId?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'token', 'jwt_secret', 'secret',
  'api_key', 'apikey', 'authorization', 'cookie', 'verification_token', 'reset_token'
]);

function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase()) || k.toLowerCase().includes('password') || k.toLowerCase().includes('secret')) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object') {
      sanitized[k] = sanitizeData(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

function formatLog(level: string, message: string, context?: LogContext | any): string {
  const entry: Record<string, unknown> = {
    level,
    timestamp: new Date().toISOString(),
    message,
  };

  if (context && typeof context === 'object' && !(context instanceof Error)) {
    Object.assign(entry, sanitizeData(context));
  } else if (context instanceof Error) {
    entry.error = context.message;
    entry.stack = context.stack;
  } else if (context !== undefined && context !== '') {
    entry.data = sanitizeData(context);
  }

  return JSON.stringify(entry);
}

export const logger = {
  info: (message: string, context?: LogContext | any) => {
    console.log(formatLog('INFO', message, context));
  },
  error: (message: string, context?: LogContext | any) => {
    console.error(formatLog('ERROR', message, context));
  },
  warn: (message: string, context?: LogContext | any) => {
    console.warn(formatLog('WARN', message, context));
  },
  debug: (message: string, context?: LogContext | any) => {
    if (process.env.DEBUG) {
      console.debug(formatLog('DEBUG', message, context));
    }
  },
};
