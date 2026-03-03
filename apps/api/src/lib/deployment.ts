export type DeploymentMode = 'single_instance' | 'multi_instance';

export interface DeploymentStatus {
  mode: DeploymentMode;
  stickySessionsRequired: boolean;
  multiInstanceSupported: boolean;
  status: 'supported' | 'unsupported';
  warning?: string;
}

const MULTI_INSTANCE_UNSUPPORTED_MESSAGE =
  'Multi-instance deployment is not supported yet because rate limits, WebSocket presence, and orchestration state are process-local. Run exactly one API instance until shared coordination exists.';

export function getDeploymentStatus(mode: DeploymentMode): DeploymentStatus {
  if (mode === 'multi_instance') {
    return {
      mode,
      stickySessionsRequired: true,
      multiInstanceSupported: false,
      status: 'unsupported',
      warning: MULTI_INSTANCE_UNSUPPORTED_MESSAGE,
    };
  }

  return {
    mode,
    stickySessionsRequired: true,
    multiInstanceSupported: false,
    status: 'supported',
  };
}

export function assertSupportedDeploymentMode(mode: DeploymentMode): DeploymentStatus {
  const status = getDeploymentStatus(mode);
  if (status.status === 'unsupported') {
    throw new Error(MULTI_INSTANCE_UNSUPPORTED_MESSAGE);
  }
  return status;
}
