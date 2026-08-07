from __future__ import annotations

import argparse
import sys
import time
import uuid
from pathlib import Path

from .core import EvalResult, discover_eval_files, render_reports, run_eval


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run NoEgoDev EVAL.yaml files")
    parser.add_argument("paths", nargs="+", help="Files or folders to search for EVAL.yaml")
    parser.add_argument("--output-root", default=".eval-runs", help="Directory for per-eval result folders")
    parser.add_argument("--report", default=None, help="Report output prefix (default: .eval-runs/report-<timestamp>)")
    parser.add_argument("--markdown", action="store_true", help="Also generate a Markdown report")
    parser.add_argument(
        "--hermes-command",
        default="hermes -t skills",
        help="Hermes executable/command to invoke (default restricts evals to the skills toolset)",
    )
    parser.add_argument(
        "--judge-command",
        default=None,
        help="Optional separate Hermes-compatible judge command (default: --hermes-command)",
    )
    args = parser.parse_args(argv)

    try:
        evals = discover_eval_files(args.paths)
    except Exception as exc:
        print(f"Eval discovery failed ({type(exc).__name__})", file=sys.stderr)
        return 3
    if not evals:
        print("No EVAL.yaml files found", file=sys.stderr)
        return 1
    results: list[EvalResult] = []
    for path in evals:
        try:
            results.append(
                run_eval(
                    path,
                    output_root=args.output_root,
                    hermes_command=args.hermes_command,
                    judge_command=args.judge_command,
                )
            )
        except Exception as exc:
            print(f"Eval execution failed ({type(exc).__name__})", file=sys.stderr)
            results.append(
                EvalResult(
                    eval_path=str(path),
                    prompt="",
                    expectations=[],
                    passed=False,
                    failure_reasons=[f"unexpected eval execution failure ({type(exc).__name__})"],
                    elapsed_seconds=0.0,
                    token_counts={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                    output="",
                    result_path="",
                    run_dir="",
                    infrastructure_failure=True,
                )
            )

    prefix = (
        Path(args.report)
        if args.report
        else Path(args.output_root) / f"report-{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex}"
    )
    try:
        html, md = render_reports(results, prefix, markdown=args.markdown)
    except Exception as exc:
        print(f"Eval report generation failed ({type(exc).__name__})", file=sys.stderr)
        return 3
    print(f"HTML report: {html}")
    if md:
        print(f"Markdown report: {md}")
    if any(r.infrastructure_failure for r in results):
        return 3
    return 0 if all(r.passed for r in results) else 2


if __name__ == "__main__":
    raise SystemExit(main())
