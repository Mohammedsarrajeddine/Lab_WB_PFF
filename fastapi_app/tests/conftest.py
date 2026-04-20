"""Shared test fixtures and configuration.

Sets environment variables BEFORE any app import so that the Settings
singleton initialises with valid test values.
"""

import os

# Must happen before any import of app.core.config
os.environ["AUTH_SECRET_KEY"] = "test-secret-key-that-is-at-least-32-characters-long!!"
os.environ["ENVIRONMENT"] = "local"
