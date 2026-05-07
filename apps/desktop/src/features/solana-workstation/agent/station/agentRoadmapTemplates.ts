import {
  GORKH_AGENT_TEMPLATES,
  GorkhAgentTemplateStatus,
  type GorkhAgentTemplate,
} from '@gorkh/shared';

export const ACTIVE_TEMPLATES: GorkhAgentTemplate[] = GORKH_AGENT_TEMPLATES.filter(
  (t) => t.status === GorkhAgentTemplateStatus.ACTIVE
);

export const COMING_SOON_TEMPLATES: GorkhAgentTemplate[] = GORKH_AGENT_TEMPLATES.filter(
  (t) => t.status === GorkhAgentTemplateStatus.COMING_SOON
);

export const BLOCKED_TEMPLATES: GorkhAgentTemplate[] = GORKH_AGENT_TEMPLATES.filter(
  (t) => t.status === GorkhAgentTemplateStatus.BLOCKED
);
