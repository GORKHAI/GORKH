import {
  createDefaultGorkhAgentPolicy,
  type GorkhAgentPolicy,
} from '@gorkh/shared';

export function createDefaultAgentPolicy(now: number = Date.now()): GorkhAgentPolicy {
  return createDefaultGorkhAgentPolicy(now);
}
