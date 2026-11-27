# Signing the PandaClient installer

Windows shows "Windows protected your PC" for installers that aren't code-signed. SignPath Foundation
signs open-source projects for free. Once it's set up, every release is signed automatically.

1. Apply at https://signpath.org/apply with the GitHub repository link. They check that the project is open source and that releases are built by GitHub Actions (they are).
2. When accepted, in the SignPath dashboard create a project with the slug `pandaclient` and a signing policy with the slug `release-signing`, linked to this repository's GitHub Actions.
3. In GitHub: Settings → Secrets and variables → Actions, add:
   - `SIGNPATH_API_TOKEN`: an API token from SignPath (a CI user with submitter rights)
   - `SIGNPATH_ORGANIZATION_ID`: your organization ID from SignPath
4. Push a new version. The build uploads the installer to SignPath, waits for the signed copy and publishes that one.

Until the secrets exist, releases are built unsigned exactly as before.
