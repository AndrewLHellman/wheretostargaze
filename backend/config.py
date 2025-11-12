from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

_project_root = Path(__file__).parent.parent
_default_data_path = _project_root / "data" / "light_pollution" / "viirs_2024.tif"
_tree_data_path = _project_root / "data" / "tree_density" / "TreeMap2022_CONUS_ALSTK.tif"

class Settings(BaseSettings):
    google_places_api_key: str = "dummy_key_for_testing"
    openroute_api_key: Optional[str] = None
    redis_url: str = "redis://localhost:6379"
    light_pollution_data_path: str = str(_default_data_path)
    openweather_api_key: Optional[str] = None
    astronomy_id: Optional[str] = None
    astronomy_secret: Optional[str] = None
    tree_density_data_path: str = str(_tree_data_path)
    log_level: str = "INFO"  # Can be: DEBUG, INFO, WARNING, ERROR, CRITICAL
    model_config = {
        "env_file": ".env"
    }

settings = Settings()
