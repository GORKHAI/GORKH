# Desktop Glass Shell Design

**Goal**

Make the macOS desktop app feel like a polished consumer product by introducing a true translucent window, reducing main-screen clutter, and shipping a real branded app icon for packaged builds.

**Context**

The current desktop app is functionally rich but visually reads like an internal operations console. The main window exposes too many secondary diagnostics and device-management panels, while the packaged macOS app lacks a proper Finder/Dock icon because the bundle only ships generic `png`/`ico` assets.

## Product Direction

The desktop should open into a calm assistant-first shell:

- native-feeling glass window on macOS
- one primary chat surface
- one compact readiness/setup summary
- active run and pending approvals still visible
- technical controls and device/account panels moved into Settings

This keeps the core workflow obvious for retail users while preserving the existing power-user controls.

## Window And Visual System

On macOS, the main Tauri window should become transparent and opt into macOS private APIs so native vibrancy/material effects can show the desktop background through the app. The app shell should then layer translucent panels and soft borders over that native material instead of painting a flat white page.

On non-macOS platforms, the app should keep the existing opaque behavior. The redesign should degrade cleanly without introducing platform regressions.

## Main Screen Layout

The home screen should keep only the primary surfaces:

- top bar with branding, connection status, and Settings
- compact sign-in/session summary
- assistant card with setup blocker call-to-action when needed
- active run panel
- pending approvals

These sections should remain immediately visible because they directly affect task launch and execution.

The following should leave the home screen and live inside Settings instead:

- desktop readiness detail breakdown
- signed-in desktops/account management
- recent activity browser
- screen preview controls
- remote control controls
- advanced assistant/engine controls
- diagnostics and update checks

## Settings Structure

Settings should become a larger, easier-to-scan control center with clear sections:

- Overview
- Assistant
- Permissions
- Workspace
- Screen Preview
- Remote Control
- Connected Desktops
- Diagnostics and Updates

The modal should feel visually consistent with the glass shell: larger, roomier, translucent, and less like a narrow utility dialog.

## Icon Packaging

The branded logo from the provided mockup should become the source for packaged desktop icons. The deliverable is not just an in-app image. The bundle needs actual icon assets that macOS uses for Finder and Dock display.

The icon should preserve the black rounded badge and white `GORKH` wordmark while adapting it to a square app icon canvas. The packaged app should stop falling back to a generic/random icon.

## Error Handling

The current API/bootstrap fix work already improves desktop fetch failures. The redesign should preserve those clearer error messages and make sure the simplified main screen still exposes readiness blockers without requiring users to open advanced panels.

## Testing And Verification

Verification should cover:

- desktop TypeScript build
- API build and the existing desktop CORS regression test
- Tauri config validity for macOS transparency
- generated icon assets present in the bundle config
- a new packaged desktop release after successful verification

## Tradeoffs

True transparent macOS windows require the Tauri macOS private API path. That is acceptable for direct-download distribution but would not be appropriate for an App Store target. This project already distributes signed releases directly, so that tradeoff is aligned with the current release model.
