# Desktop Release API Variable Validation Design

**Problem**

Desktop beta artifacts can currently build successfully even when `VITE_API_HTTP_BASE` and `VITE_API_WS_URL` are missing from GitHub Actions variables. In that case, the packaged app falls back to localhost defaults and shows a runtime configuration error on launch.

**Recommended Approach**

Add release-workflow validation that runs before any platform build and fails fast unless:

- `VITE_API_HTTP_BASE` is present and uses `https://`
- `VITE_API_WS_URL` is present and uses `wss://`
- both values target the same host and effective port

Keep the API origin configurable through GitHub Actions variables instead of hardcoding environment-specific URLs in the repo.

**Alternatives Considered**

1. Hardcode the Render URLs in the repo.
   Rejected because it couples releases to one deployment environment and makes future changes brittle.

2. Leave the workflow as-is and diagnose from runtime errors.
   Rejected because it keeps shipping silently broken beta artifacts.

3. Validate the variables in the workflow and continue reading them from GitHub Actions variables.
   Recommended because it preserves configurability and turns a silent bad build into an explicit CI failure.

**Testing**

- Add a workflow test that asserts the release workflow validates desktop API variables for packaged builds.
- Run the workflow test suite plus existing desktop prereq tests.
- Tag a new beta release so the workflow either fails with a clear variable error or produces a good artifact.
