import {
  createDefaultGorkhAgentProfile,
  type GorkhAgentProfile,
} from '@gorkh/shared';

export function createDefaultGorkhAgent(now: number = Date.now()): GorkhAgentProfile {
  return createDefaultGorkhAgentProfile(now);
}
