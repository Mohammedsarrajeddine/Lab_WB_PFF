# CI/CD baseline

This workspace is best treated as one deployable system:

- `fastapi_app` is the backend service.
- `frontend-pff-lab` is the operator-facing frontend.
- `docker-compose.yml` is the local developer stack.
- `docker-compose.prod.yml` is the production deployment contract.

## Recommended platform

Use GitHub Actions as the default CI/CD platform for this project.

Why:

- The system is small enough that GitHub-hosted runners are sufficient.
- The deployment topology is a single backend, a single frontend, and a database.
- Environment approvals and secrets in GitHub Environments cover staging and production without extra tooling.
- Jenkins would add maintenance overhead without solving a current platform problem.

## CI flow

`ci.yml` runs:

- dependency review on pull requests
- backend lint, unit tests, package build, and Python security checks
- frontend format, lint, typecheck, tests, build, and dependency audit
- backend integration tests against PostgreSQL
- Docker build verification for both services

## CD flow

`cd.yml` supports:

- automatic staging deployments on `main`
- automatic production deployments on semantic version tags like `v1.2.3`
- manual redeploy or rollback by re-running the workflow with an existing `image_tag`

The workflow:

1. builds and publishes backend and frontend images to GHCR
2. uploads `docker-compose.prod.yml` and the deploy script to the target server
3. runs a remote `docker compose pull && docker compose up -d`

## Required GitHub environment secrets

Create `staging` and `production` environments and add these secrets:

- `FRONTEND_PUBLIC_API_URL`
- `DEPLOY_SSH_HOST`
- `DEPLOY_SSH_PORT`
- `DEPLOY_SSH_USER`
- `DEPLOY_SSH_PRIVATE_KEY`
- `DEPLOY_APP_DIR`
- `GHCR_USERNAME`
- `GHCR_READ_TOKEN`

## Required server preparation

On the target host:

1. Install Docker Engine and Docker Compose v2.
2. Create the deployment directory referenced by `DEPLOY_APP_DIR`.
3. Place a production `.env` file there using `.env.production.example` as the template.
4. Ensure the server can pull from GHCR with the provided read token.

## Rollback strategy

Rollback is intentionally simple:

- trigger `cd.yml` manually
- choose the target environment
- set `image_tag` to a previously deployed image tag

Because deployments are image-based, rollback does not require rebuilding the code.
