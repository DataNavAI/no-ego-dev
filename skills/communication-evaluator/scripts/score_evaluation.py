#!/usr/bin/env python3
"""Deterministically total communication rubric scores and apply verdict gates."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence


WEIGHTS = {
    "product_outcome": 15,
    "non_engineer_comprehension": 25,
    "human_action": 15,
    "context_next_state": 10,
    "structure_status": 10,
    "cognitive_load": 10,
    "evidence_safety": 10,
    "accessible_tone": 5,
}


@dataclass(frozen=True)
class EvaluationResult:
    score: int
    verdict: str
    hard_fail_gates: tuple[str, ...]
    one_read_complete: bool


def evaluate(
    scores: Mapping[str, int],
    *,
    hard_fail_gates: Sequence[str] = (),
    one_read_complete: bool = True,
) -> EvaluationResult:
    """Validate rubric points, total them, and apply fail-closed verdict rules."""
    if set(scores) != set(WEIGHTS):
        missing = sorted(set(WEIGHTS) - set(scores))
        extra = sorted(set(scores) - set(WEIGHTS))
        raise ValueError(f"score dimensions mismatch; missing={missing}, extra={extra}")
    for dimension, maximum in WEIGHTS.items():
        value = scores[dimension]
        if isinstance(value, bool) or not isinstance(value, int):
            raise TypeError(f"{dimension} score must be an integer")
        if not 0 <= value <= maximum:
            raise ValueError(f"{dimension} score must be between 0 and {maximum}")
    if not isinstance(one_read_complete, bool):
        raise TypeError("one_read_complete must be boolean")
    gates = tuple(hard_fail_gates)
    if not all(isinstance(gate, str) and gate.strip() for gate in gates):
        raise ValueError("hard_fail_gates must contain non-empty strings")

    score = sum(scores.values())
    verdict = (
        "APPROVED"
        if score >= 85 and not gates and one_read_complete
        else "CHANGES_REQUIRED"
    )
    return EvaluationResult(score, verdict, gates, one_read_complete)
