import redis
import json
import logging
from functools import wraps
from typing import Optional, Callable, Any
from config import settings
import hashlib
from datetime import datetime
import threading

logger = logging.getLogger(__name__)

# Cache statistics tracking
class CacheStats:
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.errors = 0
        self.start_time = datetime.now()
        self.by_function = {}
        self._lock = threading.Lock()

    def record_hit(self, func_name: str):
        with self._lock:
            self.hits += 1
            # Initialize function stats if not present (prevents unbounded growth)
            if func_name not in self.by_function:
                self.by_function[func_name] = {"hits": 0, "misses": 0}
            self.by_function[func_name]["hits"] += 1

    def record_miss(self, func_name: str):
        with self._lock:
            self.misses += 1
            # Initialize function stats if not present (prevents unbounded growth)
            if func_name not in self.by_function:
                self.by_function[func_name] = {"hits": 0, "misses": 0}
            self.by_function[func_name]["misses"] += 1

    def record_error(self):
        with self._lock:
            self.errors += 1

    def get_stats(self) -> dict:
        with self._lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
            uptime = (datetime.now() - self.start_time).total_seconds()

            return {
                "total_requests": total_requests,
                "hits": self.hits,
                "misses": self.misses,
                "errors": self.errors,
                "hit_rate_percent": round(hit_rate, 2),
                "uptime_seconds": round(uptime, 2),
                "by_function": dict(self.by_function)
            }

    def reset(self):
        with self._lock:
            self.hits = 0
            self.misses = 0
            self.errors = 0
            self.start_time = datetime.now()
            self.by_function.clear()

cache_stats = CacheStats()

# Initialize Redis client
try:
    redis_client = redis.Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=5
    )
    # Test connection
    redis_client.ping()
    print("✓ Redis connected successfully")
    logger.info("Redis connected successfully")
except (redis.ConnectionError, redis.TimeoutError) as e:
    print(f"⚠ Redis connection failed: {e}")  # Keep print for startup visibility
    print("  Running without cache")
    logger.warning(f"⚠ Redis connection failed: {e}")
    logger.warning("  Running without cache")
    redis_client = None


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate a unique cache key from function arguments.
    """
    # Create a string representation of all arguments
    key_data = f"{prefix}:{str(args)}:{str(sorted(kwargs.items()))}"
    # Hash it to keep keys short
    key_hash = hashlib.md5(key_data.encode()).hexdigest()
    return f"{prefix}:{key_hash}"


def cache_response(ttl_seconds: int = 3600, prefix: str = "cache"):
    """
    Decorator to cache function responses in Redis.

    Args:
        ttl_seconds: Time to live in seconds (default 1 hour)
        prefix: Cache key prefix for organization
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # If Redis is not available, just call the function
            if redis_client is None:
                return await func(*args, **kwargs)

            # Generate cache key
            cache_key = generate_cache_key(f"{prefix}:{func.__name__}", *args, **kwargs)

            try:
                # Try to get from cache
                cached = redis_client.get(cache_key)
                if cached:
                    logger.debug(f"✓ Cache hit: {cache_key}")
                    cache_stats.record_hit(func.__name__)
                    return json.loads(cached)

                # Cache miss - call function
                logger.debug(f"✗ Cache miss: {cache_key}")
                cache_stats.record_miss(func.__name__)
                result = await func(*args, **kwargs)

                # Store in cache
                redis_client.setex(
                    cache_key,
                    ttl_seconds,
                    json.dumps(result, default=str)  # default=str handles non-serializable types
                )

                return result

            except Exception as e:
                logger.error(f"Cache error: {e}")
                cache_stats.record_error()
                # If cache fails, still return the result
                return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # If Redis is not available, just call the function
            if redis_client is None:
                return func(*args, **kwargs)

            # Generate cache key
            cache_key = generate_cache_key(f"{prefix}:{func.__name__}", *args, **kwargs)

            try:
                # Try to get from cache
                cached = redis_client.get(cache_key)
                if cached:
                    logger.debug(f"✓ Cache hit: {cache_key}")
                    cache_stats.record_hit(func.__name__)
                    return json.loads(cached)

                # Cache miss - call function
                logger.debug(f"✗ Cache miss: {cache_key}")
                cache_stats.record_miss(func.__name__)
                result = func(*args, **kwargs)

                # Store in cache
                redis_client.setex(
                    cache_key,
                    ttl_seconds,
                    json.dumps(result, default=str)
                )

                return result

            except Exception as e:
                logger.error(f"Cache error: {e}")
                cache_stats.record_error()
                return func(*args, **kwargs)

        # Return appropriate wrapper based on whether function is async
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def invalidate_cache(pattern: str) -> int:
    """
    Invalidate all cache keys matching a pattern.

    Args:
        pattern: Redis key pattern (e.g., "light_pollution:*")

    Returns:
        Number of keys deleted
    """
    if redis_client is None:
        return 0

    try:
        keys = redis_client.keys(pattern)
        if keys:
            deleted = redis_client.delete(*keys)
            logger.info(f"Invalidated {deleted} cache keys matching '{pattern}'")
            return deleted
        return 0
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}")
        return 0


def get_cache_stats() -> dict:
    """
    Get Redis cache statistics and aggregate hit/miss metrics.
    """
    stats = {
        "cache_performance": cache_stats.get_stats()
    }

    if redis_client is None:
        stats["redis"] = {"status": "disconnected"}
        return stats

    try:
        info = redis_client.info()
        stats["redis"] = {
            "status": "connected",
            "used_memory": info.get("used_memory_human"),
            "connected_clients": info.get("connected_clients"),
            "total_keys": redis_client.dbsize(),
        }
    except Exception as e:
        stats["redis"] = {"status": "error", "message": str(e)}

    return stats
