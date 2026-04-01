#!/usr/bin/env python3
"""
Enrich vehicles.csv with MSRP (CAD) and ground clearance (mm) data
using the Anthropic API (claude-opus-4-6).

Progress is saved after every batch so the script is safe to interrupt.
The API key is read from the ANTHROPIC_API_KEY environment variable.
"""

import csv
import json
import os
import sys
import time

import anthropic

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "vehicles.csv")
PROGRESS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "enrich_progress.json")
BATCH_SIZE = 10
MODEL = "claude-opus-4-6"


def load_progress() -> dict:
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH, "r") as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_PATH, "w") as f:
        json.dump(progress, f, indent=2)


def read_csv() -> list[dict]:
    with open(CSV_PATH, "r", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(rows: list[dict]):
    fieldnames = list(rows[0].keys())
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_prompt(batch: list[dict]) -> str:
    lines = []
    for i, v in enumerate(batch):
        trim = v.get("trim", "").strip()
        transmission = v.get("transmission", "").strip()
        drivetrain = v.get("drivetrain", "").strip()
        fuel_type = v.get("fuel_type", "").strip()
        body_style = v.get("body_style", "").strip()
        details = f"{v['year']} {v['make']} {v['model']}"
        if trim:
            details += f" ({trim})"
        extras = []
        if transmission:
            extras.append(f"transmission: {transmission}")
        if drivetrain:
            extras.append(f"drivetrain: {drivetrain}")
        if fuel_type:
            extras.append(f"fuel: {fuel_type}")
        if body_style:
            extras.append(f"body: {body_style}")
        if extras:
            details += " [" + ", ".join(extras) + "]"
        lines.append(f"{i+1}. {details}")

    vehicle_list = "\n".join(lines)

    return f"""You are a Canadian automotive data specialist. For each vehicle listed below, provide:
1. MSRP in Canadian dollars (CAD) as listed on the Canadian manufacturer's official website
2. Ground clearance in millimetres (mm)

These are 2026 model year vehicles for the Canadian market.

Rules:
- Use Canadian manufacturer website prices only (e.g., acura.ca, toyota.ca, ford.ca)
- If a specific trim/transmission/drivetrain variant affects the base price, use that variant's price
- If MSRP cannot be confirmed for Canada, use null
- Ground clearance should be the manufacturer-specified value in mm; use null if unknown
- Return ONLY a JSON array with exactly {len(batch)} objects in the same order as the input
- Each object must have exactly two keys: "msrp_cad" (integer or null) and "ground_clearance_mm" (integer or null)

Vehicles:
{vehicle_list}

Return only the JSON array, no other text."""


def parse_response(text: str, expected_count: int) -> list[dict] | None:
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        data = json.loads(text)
        if isinstance(data, list) and len(data) == expected_count:
            result = []
            for item in data:
                msrp = item.get("msrp_cad")
                gc = item.get("ground_clearance_mm")
                result.append({
                    "msrp_cad": int(msrp) if msrp is not None else None,
                    "ground_clearance_mm": int(gc) if gc is not None else None,
                })
            return result
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        print(f"  Parse error: {e}")
    return None


def enrich_batch(client: anthropic.Anthropic, batch: list[dict], batch_ids: list[str]) -> list[dict] | None:
    prompt = build_prompt(batch)
    for attempt in range(3):
        try:
            message = client.messages.create(
                model=MODEL,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            text = message.content[0].text
            result = parse_response(text, len(batch))
            if result is not None:
                return result
            print(f"  Unexpected response format (attempt {attempt+1}/3):")
            print(f"  {text[:300]}")
        except anthropic.RateLimitError:
            wait = 60 * (attempt + 1)
            print(f"  Rate limited, waiting {wait}s...")
            time.sleep(wait)
        except anthropic.APIError as e:
            print(f"  API error (attempt {attempt+1}/3): {e}")
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
    return None


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    rows = read_csv()
    progress = load_progress()

    # Count already done
    already_done = sum(1 for r in rows if r["id"] in progress)
    total = len(rows)
    print(f"Total vehicles: {total}")
    print(f"Already enriched: {already_done}")
    print(f"Remaining: {total - already_done}")

    # Apply already-saved progress to rows
    for row in rows:
        if row["id"] in progress:
            row["msrp_cad"] = progress[row["id"]]["msrp_cad"] if progress[row["id"]]["msrp_cad"] is not None else ""
            row["ground_clearance_mm"] = progress[row["id"]]["ground_clearance_mm"] if progress[row["id"]]["ground_clearance_mm"] is not None else ""

    # Build list of rows that still need enrichment
    pending = [r for r in rows if r["id"] not in progress]

    batch_num = 0
    total_batches = (len(pending) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(pending), BATCH_SIZE):
        batch = pending[i : i + BATCH_SIZE]
        batch_ids = [r["id"] for r in batch]
        batch_num += 1

        print(f"\nBatch {batch_num}/{total_batches} — IDs {batch_ids[0]}..{batch_ids[-1]}")

        results = enrich_batch(client, batch, batch_ids)
        if results is None:
            print(f"  FAILED after 3 attempts, skipping batch and saving progress.")
            # Mark as failed with nulls so we don't retry in this run
            for row in batch:
                progress[row["id"]] = {"msrp_cad": None, "ground_clearance_mm": None}
        else:
            for row, res in zip(batch, results):
                msrp = res["msrp_cad"]
                gc = res["ground_clearance_mm"]
                row["msrp_cad"] = msrp if msrp is not None else ""
                row["ground_clearance_mm"] = gc if gc is not None else ""
                progress[row["id"]] = {"msrp_cad": msrp, "ground_clearance_mm": gc}
                print(f"  ID {row['id']:>4}: {row['make']} {row['model']} — MSRP: {msrp} CAD, GC: {gc} mm")

        # Save progress and update CSV after every batch
        save_progress(progress)
        write_csv(rows)
        print(f"  Progress saved ({len(progress)}/{total} done)")

    print(f"\nEnrichment complete. {len(progress)}/{total} vehicles processed.")

    # Clean up progress file
    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)
        print("Progress file removed.")


if __name__ == "__main__":
    main()
