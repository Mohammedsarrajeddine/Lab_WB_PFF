# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS deps

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy only dependency metadata here. Do not copy the real README or any source
# tree before the heavy install step, otherwise normal code/doc edits will bust
# the cached ML dependency layer.
COPY pyproject.toml ./
RUN mkdir app \
    && touch app/__init__.py \
    && printf '# build placeholder\n' > README.md

# Install all dependencies once, keyed only off the packaging metadata above.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip \
    && pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install .

FROM deps AS dev

# Now copy the real application files. These layers should be the only ones
# touched during routine source edits.
COPY alembic.ini ./
COPY README.md ./
COPY alembic/ ./alembic/
COPY app/ ./app/
COPY scripts/ ./scripts/
COPY data/ ./data/
COPY entrypoint.sh ./
COPY entrypoint.dev.sh ./

# Reinstall the actual package without dependencies so source changes only
# refresh the lightweight app layer instead of the full dependency stack.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-deps .

RUN chmod +x entrypoint.sh entrypoint.dev.sh \
    && useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["./entrypoint.dev.sh"]

FROM dev AS runtime

CMD ["./entrypoint.sh"]
