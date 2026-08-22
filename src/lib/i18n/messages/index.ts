import type { Locale } from '../locale';
import type { Messages } from '../types';

import { en } from './en';
import { ja } from './ja';

export const MESSAGES: Record<Locale, Messages> = { ja, en };

export { en, ja };
