/**
 * Sentry に送るイベントから URL・タイトル・メモを落とす。
 *
 * `@sentry/react-native` を import しない純粋モジュール（R-UI5）。
 * Sentry の型を使わず、必要な形だけを構造的に定義する（R-DEP1）。
 */

/** 落とすべき値が入りうるキー */
const SENSITIVE_KEYS = ['url', 'originalUrl', 'title', 'memo', 'description', 'query'];

export const REDACTED = '[redacted]';

export type ScrubbableBreadcrumb = {
  message?: string;
  category?: string;
  data?: Record<string, unknown>;
};

export type ScrubbableEvent = {
  message?: string;
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: ScrubbableBreadcrumb[];
  request?: unknown;
};

/** http(s) の URL らしき文字列を伏せる */
export function redactUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s"']+/g, REDACTED);
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  for (const exception of event.exception?.values ?? []) {
    if (exception.value !== undefined) exception.value = redactUrls(exception.value);
  }

  if (event.message !== undefined) event.message = redactUrls(event.message);

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message !== undefined) breadcrumb.message = redactUrls(breadcrumb.message);
    for (const key of SENSITIVE_KEYS) {
      if (breadcrumb.data?.[key] !== undefined) breadcrumb.data[key] = REDACTED;
    }
  }

  // URL がクエリに載ることがあるので request 情報ごと落とす
  delete event.request;

  return event;
}

/** ネットワークの breadcrumb は URL そのものを持つので捨てる */
export function shouldDropBreadcrumb(breadcrumb: ScrubbableBreadcrumb): boolean {
  return breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch';
}
