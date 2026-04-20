# Docker Dev Workflow

This project keeps the full OCR/RAG/ML backend in the default development
image. That makes the backend image large, but it should not force repeated
downloads during normal coding.

## Expected Day-to-Day Flow

First build or after Dockerfile/dependency changes:

```powershell
docker compose up -d --build
```

Routine local restart:

```powershell
docker compose up -d
```

Backend dependency change (`fastapi_app/pyproject.toml`) or backend Dockerfile change:

```powershell
docker compose build backend
docker compose up -d
```

## What Does Not Need a Rebuild

Do not rebuild for normal Python source edits under `fastapi_app/app/`.

The backend container bind-mounts `./fastapi_app:/app` and starts `uvicorn`
with `--reload`, so backend code changes should be picked up without running
`docker compose up -d --build`.

The frontend also bind-mounts its source tree in development. Its
`node_modules` directory lives in the named volume
`projetgemini_frontend_node_modules` so container recreations do not create a
new anonymous volume each time.

## Why the Backend Image Is Still Large

The backend intentionally includes heavy ML/OCR dependencies such as:

- `torch`
- `torchvision`
- `sentence-transformers`
- `easyocr`
- `opencv-python-headless`

That is why the backend image is large. The goal of this setup is to cache
those installs and avoid repeating them unless dependencies actually change.

## Why the Cache Should Hold

The backend Dockerfile installs Python dependencies before copying the real
application source tree.

That means the heavy dependency layer should stay cached unless one of these
changes:

- `fastapi_app/pyproject.toml`
- `fastapi_app/Dockerfile`
- the upstream base image or package indexes used during rebuild

Edits to Python source files, Alembic files, scripts, or the real README should
only refresh the lightweight application layer.

## When to Rebuild

Rebuild the backend when you change:

- `fastapi_app/pyproject.toml`
- `fastapi_app/Dockerfile`
- build-time system packages
- the Python base image you want Docker to refresh

Do not rebuild just because you edited:

- `fastapi_app/app/...`
- `fastapi_app/scripts/...`
- `fastapi_app/alembic/...`
- routine `.env` values used at runtime

## Low-Risk Inspection

List current Docker disk usage:

```powershell
docker system df -v
```

Inspect a suspicious volume before deleting it:

```powershell
docker volume inspect <volume-name>
```

Inspect current containers:

```powershell
docker compose ps
```

## Cleanup Commands

These remove unused Docker resources. They are usually safe when you have
already stopped the stack, but they are still destructive to unused artifacts.

Remove only unused builder cache:

```powershell
docker builder prune
```

Remove only unused volumes:

```powershell
docker volume prune
```

Remove only unused images:

```powershell
docker image prune
```

Remove one known orphan volume after confirming nothing uses it:

```powershell
docker volume rm <volume-name>
```

## Destructive Cleanup

These are the broad cleanup commands that can force re-pulls or re-builds on
the next startup.

Remove stopped containers, unused networks, dangling images, and build cache:

```powershell
docker system prune
```

Remove everything unused, including volumes:

```powershell
docker system prune -a --volumes
```

Use the second command only when you intentionally want a near-clean Docker
state. It can remove cached layers, pulled images, and orphaned volumes, so the
next `docker compose up -d --build` will be much heavier.

## Existing Anonymous Volumes

If you already have old anonymous volumes from earlier container recreations,
they may still appear in Docker Desktop even after this workflow is corrected.

That is expected. The fix prevents new churn going forward, but old orphaned
volumes still need manual cleanup with `docker volume inspect` and
`docker volume rm` or `docker volume prune`.

## Future Option

A future optimization would be to split development into a slim backend profile
and a full ML profile.

That would reduce image size, but it is intentionally out of scope for this
round. This implementation focuses only on keeping the current full-feature
image cached and avoiding unnecessary rebuilds.
