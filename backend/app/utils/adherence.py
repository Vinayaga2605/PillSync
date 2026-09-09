def calculate_adherence(scheduled, taken):
    """
    Compute adherence stats from raw counts (the single source of truth).

    Adherence Percentage = round((Taken / Scheduled) * 100)

    Rules:
      - Scheduled <= 0  -> returns None for adherence_percentage (cannot be computed).
      - Taken > Scheduled -> clamped to Scheduled (Missed = 0, Adherence = 100%).
      - Missed is never stored; it is always Scheduled - Taken.

    Returns a dict with keys: scheduled, taken, missed, adherence_percentage.
    """
    scheduled = max(scheduled or 0, 0)
    taken = max(taken or 0, 0)

    if scheduled <= 0:
        return {
            "scheduled": scheduled,
            "taken": taken,
            "missed": 0,
            "adherence_percentage": None,
        }

    # Clamp taken so it never exceeds scheduled.
    taken = min(taken, scheduled)
    missed = max(scheduled - taken, 0)
    adherence = round((taken / scheduled) * 100)

    return {
        "scheduled": scheduled,
        "taken": taken,
        "missed": missed,
        "adherence_percentage": adherence,
    }


def adherence_label(adherence):
    """Human string for an adherence percentage (None -> 'N/A')."""
    if adherence is None:
        return "N/A"
    return f"{adherence}%"