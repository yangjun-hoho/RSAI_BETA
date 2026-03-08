import { TemplateConfig } from './types';
import { civilComplaintConfig } from './templates/civil-complaint/config';
import { emailReplyConfig } from './templates/email-reply/config';
import { nationalComplaintBetaConfig } from './templates/official-doc/config';

export const TEMPLATES: TemplateConfig[] = [
  civilComplaintConfig,
  nationalComplaintBetaConfig,
  emailReplyConfig,
];

export const TEMPLATE_CATEGORIES = ['전체', '민원', '문서', '기타'];
