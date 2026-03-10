# Dashboard Manual Pairing Design

## Problem

The dashboard already has per-device pairing UI, but it only renders for devices returned by `GET /devices`. That API currently returns devices already owned by the authenticated user, so a newly connected desktop does not appear and cannot be paired through the UI.

## Constraints

- Do not broaden device listing to expose unowned devices.
- Reuse the existing pairing API: `POST /devices/:deviceId/pair`.
- Keep the fix web-only unless backend changes become strictly necessary.

## Options Considered

### Option 1: Return unpaired devices from `/devices`

Pros:
- Reuses the existing per-device pair UI.

Cons:
- Expands device visibility in a way that is easy to get wrong.
- Mixes discovery and ownership concerns in one endpoint.

### Option 2: Add a separate API for discoverable unpaired devices

Pros:
- Cleaner than overloading `/devices`.

Cons:
- Still broadens backend surface area.
- More code and more review risk than needed.

### Option 3: Add a manual dashboard pairing form

Pros:
- Smallest safe fix.
- Uses the existing pairing API unchanged.
- Avoids exposing any extra device metadata.

Cons:
- User must copy the `Device ID` from the desktop app once.

## Chosen Design

Implement Option 3.

Add a top-level manual pairing form to the dashboard that accepts:

- `Device ID`
- `Pairing code`

When submitted, the dashboard will call the existing `POST /devices/:deviceId/pair` endpoint, clear the fields on success, and refresh the owned device list. The current per-device pairing UI can remain for future cases where a device is already visible.

## Testing

Add a source-level regression test that verifies the dashboard page contains:

- a manual pairing section
- a device ID input
- a call to `POST /devices/${deviceId}/pair`

