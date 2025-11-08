import redis
import json
import logging
from functools import wraps
from typing import Optional, Callable, Any
from config import settings
import hashlib

logger = logging.getLogger(__name__)

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
                    logger.info(f"✓ Cache hit: {cache_key}")
                    return json.loads(cached)

                # Cache miss - call function
                logger.info(f"✗ Cache miss: {cache_key}")
                result = await func(*args, **kwargs)

                # Store in cache
                redis_client.setex(
                    cache_key,
                    ttl_seconds,
                    json.dumps(result, default=str)  # default=str handles non-serializable types
                )

                return result

            except Exception as e:
                print(f"Cache error: {e}")
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
                    logger.info(f"✓ Cache hit: {cache_key}")
                    return json.loads(cached)

                # Cache miss - call function
                logger.info(f"✗ Cache miss: {cache_key}")
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
    Get Redis cache statistics.
    """
    if redis_client is None:
        return {"status": "disconnected"}

    try:
        info = redis_client.info()
        return {
            "status": "connected",
            "used_memory": info.get("used_memory_human"),
            "connected_clients": info.get("connected_clients"),
            "total_keys": redis_client.dbsize(),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
