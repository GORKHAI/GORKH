import { createHash } from 'node:crypto';
import { config } from '../config.js';

export const DESKTOP_DEVICE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface DesktopSessionRepoRecord {
  device: {
    deviceId: string;
  };
  ownerUserId: string | null;
  deviceToken: string | null | undefined;
  deviceTokenHash?: string | null | undefined;
  deviceTokenIssuedAt?: Date | null | undefined;
  deviceTokenExpiresAt?: Date | null | undefined;
  deviceTokenLastUsedAt?: Date | null | undefined;
  deviceTokenRevokedAt?: Date | null | undefined;
}

interface DesktopSessionRepo {
  findByDeviceToken(deviceToken: string): Promise<DesktopSessionRepoRecord | null>;
  touchDeviceSession(deviceId: string, at: Date): Promise<void>;
  revokeDeviceSession(deviceId: string, deviceToken: string, at?: Date): Promise<DesktopSessionRepoRecord | null>;
}

export type RevokeDesktopSessionResult =
  | {
      ok: true;
      deviceId: string;
      userId: string;
    }
  | {
      ok: false;
      error: 'UNAUTHORIZED';
    };

export function hashDesktopDeviceToken(deviceToken: string): string {
  return createHash('sha256')
    .update(config.JWT_SECRET)
    .update(':desktop-device-token:')
    .update(deviceToken)
    .digest('hex');
}

export function getDesktopDeviceSessionExpiryDate(issuedAt: Date = new Date()): Date {
  return new Date(issuedAt.getTime() + DESKTOP_DEVICE_SESSION_TTL_MS);
}

function isDesktopDeviceSessionActive(record: DesktopSessionRepoRecord, now: Date): boolean {
  if (!record.ownerUserId) {
    return false;
  }

  if (!record.deviceTokenHash && !record.deviceToken) {
    return false;
  }

  if (record.deviceTokenRevokedAt && record.deviceTokenRevokedAt.getTime() <= now.getTime()) {
    return false;
  }

  if (record.deviceTokenExpiresAt && record.deviceTokenExpiresAt.getTime() <= now.getTime()) {
    return false;
  }

  return true;
}

export async function authenticateDesktopDeviceSession(input: {
  deviceToken: string;
  devicesRepo: DesktopSessionRepo;
  now?: () => Date;
}): Promise<
  | {
      ok: true;
      deviceId: string;
      userId: string;
      deviceToken: string;
    }
  | {
      ok: false;
      error: 'UNAUTHORIZED';
    }
> {
  const now = input.now ?? (() => new Date());
  const at = now();
  const session = await input.devicesRepo.findByDeviceToken(input.deviceToken);
  if (!session || !isDesktopDeviceSessionActive(session, at) || !session.ownerUserId) {
    return {
      ok: false,
      error: 'UNAUTHORIZED',
    };
  }

  await input.devicesRepo.touchDeviceSession(session.device.deviceId, at);

  return {
    ok: true,
    deviceId: session.device.deviceId,
    userId: session.ownerUserId,
    deviceToken: input.deviceToken,
  };
}

export async function revokeDesktopSession(input: {
  deviceToken: string;
  devicesRepo: DesktopSessionRepo;
  now?: () => Date;
}): Promise<RevokeDesktopSessionResult> {
  const at = (input.now ?? (() => new Date()))();
  const match = await authenticateDesktopDeviceSession({
    deviceToken: input.deviceToken,
    devicesRepo: input.devicesRepo,
    now: () => at,
  });
  if (!match.ok) {
    return {
      ok: false,
      error: 'UNAUTHORIZED',
    };
  }

  const session = {
    deviceId: match.deviceId,
    userId: match.userId,
  };

  const revoked = await input.devicesRepo.revokeDeviceSession(session.deviceId, input.deviceToken, at);
  if (!revoked || !revoked.ownerUserId) {
    return {
      ok: false,
      error: 'UNAUTHORIZED',
    };
  }

  return {
    ok: true,
    deviceId: session.deviceId,
    userId: session.userId,
  };
}
