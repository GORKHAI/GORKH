interface DesktopSessionRepoRecord {
  device: {
    deviceId: string;
  };
  ownerUserId: string | null;
  deviceToken: string | null | undefined;
}

interface DesktopSessionRepo {
  findByDeviceToken(deviceToken: string): Promise<DesktopSessionRepoRecord | null>;
  revokeDeviceSession(deviceId: string, deviceToken: string): Promise<DesktopSessionRepoRecord | null>;
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

export async function revokeDesktopSession(input: {
  deviceToken: string;
  devicesRepo: DesktopSessionRepo;
}): Promise<RevokeDesktopSessionResult> {
  const { devicesRepo } = input;
  const match = await devicesRepo.findByDeviceToken(input.deviceToken);
  if (!match || !match.ownerUserId) {
    return {
      ok: false,
      error: 'UNAUTHORIZED',
    };
  }

  const session = {
    deviceId: match.device.deviceId,
    userId: match.ownerUserId,
  };

  const revoked = await devicesRepo.revokeDeviceSession(session.deviceId, input.deviceToken);
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
