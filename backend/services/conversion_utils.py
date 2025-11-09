def relative_weight(val: int, *args: int) -> float:
    return val / max(sum([val, *args]), 1)
