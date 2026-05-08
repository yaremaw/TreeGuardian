"""
Локальний генератор сателітних знімків для TreeGuardian.

Робить те саме, що ноутбук, але без Colab. Використовує OAuth credentials
з Sentinel Hub Process API.

Запуск:
    pip install requests numpy pillow tifffile
    python scripts/generate_data.py
"""
from __future__ import annotations
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import requests
import tifffile
from PIL import Image

CLIENT_ID = "sh-a510f8c8-264b-47fc-ab3f-ce88a2a2316c"
CLIENT_SECRET = "quXCwknu0o5Ri2igvhBHG1LZrPIJfDM2"
TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DATA = ROOT / "public" / "data"
EVENTS_DIR = PUBLIC_DATA / "events"


# AOI вибрані емпірично через scripts/scan_candidates.py:
# скрипт прогнав 12 кандидатних точок з місць, де Global Forest Watch
# показує концентрацію втрат лісу 2023-2024, і за результатами NDVI-аналізу
# ці 5 — з найбільшою площею втрат у Карпатах за літо 2024.
AOIS = [
    {
        "id": "solotvyn",
        "name": "Богородчанський р-н (схід Солотвина)",
        "region": "Івано-Франківська",
        "bbox": [24.43, 48.72, 24.47, 48.76],
        "date_before": ("2024-05-01", "2024-07-15"),
        "date_after": ("2024-07-15", "2024-09-30"),
    },
    {
        "id": "yablunyi",
        "name": "Яблуниця",
        "region": "Івано-Франківська",
        "bbox": [24.60, 48.38, 24.64, 48.42],
        "date_before": ("2024-05-01", "2024-07-15"),
        "date_after": ("2024-07-15", "2024-09-30"),
    },
    {
        "id": "verkhovyna",
        "name": "Верховина (північ)",
        "region": "Івано-Франківська",
        "bbox": [24.79, 48.16, 24.83, 48.20],
        "date_before": ("2024-05-01", "2024-07-15"),
        "date_after": ("2024-07-15", "2024-09-30"),
    },
    {
        "id": "skole",
        "name": "Сколе (схід)",
        "region": "Львівська",
        "bbox": [23.53, 49.02, 23.57, 49.06],
        "date_before": ("2024-05-01", "2024-07-15"),
        "date_after": ("2024-07-15", "2024-09-30"),
    },
    {
        "id": "krasnyk",
        "name": "Красник (Косівщина)",
        "region": "Івано-Франківська",
        "bbox": [24.98, 48.28, 25.02, 48.32],
        "date_before": ("2024-05-01", "2024-07-15"),
        "date_after": ("2024-07-15", "2024-09-30"),
    },
]


EVALSCRIPT_RGB = """//VERSION=3
function setup(){return {input:[{bands:['B02','B03','B04','SCL']}], output:{bands:3, sampleType:'AUTO'}};}
function evaluatePixel(s){return [2.5*s.B04, 2.5*s.B03, 2.5*s.B02];}
"""

EVALSCRIPT_NDVI = """//VERSION=3
function setup(){return {input:[{bands:['B04','B08','SCL']}], output:{bands:1, sampleType:'FLOAT32'}};}
function evaluatePixel(s){
  if ([3,8,9,10,11].indexOf(s.SCL)>=0) return [NaN];
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + 1e-9);
  return [ndvi];
}
"""


def get_token() -> str:
    r = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def fetch_image(
    token: str,
    bbox,
    date_from: str,
    date_to: str,
    evalscript: str,
    fmt: str = "image/png",
    width: int = 512,
    height: int = 512,
) -> bytes:
    body = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {
                            "from": f"{date_from}T00:00:00Z",
                            "to": f"{date_to}T23:59:59Z",
                        },
                        "maxCloudCoverage": 30,
                        "mosaickingOrder": "leastCC",
                    },
                }
            ],
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [{"identifier": "default", "format": {"type": fmt}}],
        },
        "evalscript": evalscript,
    }
    r = requests.post(
        PROCESS_URL,
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    r.raise_for_status()
    return r.content


def parse_float_tiff(b: bytes) -> np.ndarray:
    return tifffile.imread(io.BytesIO(b)).astype(np.float32)


def bbox_area_ha(bbox) -> float:
    w, s, e, n = bbox
    lat_m = (n - s) * 111_000
    lon_m = (e - w) * 111_000 * np.cos(np.radians((n + s) / 2))
    return (lat_m * lon_m) / 10_000


def make_diff_mask(nb: np.ndarray, na: np.ndarray, threshold: float = 0.2):
    valid = ~(np.isnan(nb) | np.isnan(na))
    drop = np.where(valid, nb - na, 0)
    loss = (drop > threshold) & valid
    rgba = np.zeros((*loss.shape, 4), dtype=np.uint8)
    rgba[loss] = [255, 40, 40, 180]
    buf = io.BytesIO()
    Image.fromarray(rgba, mode="RGBA").save(buf, format="PNG")
    return buf.getvalue(), {
        "pixels_total": int(valid.sum()),
        "pixels_loss": int(loss.sum()),
        "loss_fraction": float(loss.sum() / max(valid.sum(), 1)),
        "ndvi_mean_before": float(np.nanmean(nb)),
        "ndvi_mean_after": float(np.nanmean(na)),
        "ndvi_drop_mean": float(np.nanmean(drop[loss])) if loss.sum() > 0 else 0.0,
    }


def main() -> None:
    EVENTS_DIR.mkdir(parents=True, exist_ok=True)
    token = get_token()
    print(f"OAuth OK (token len {len(token)})")

    events = []
    for aoi in AOIS:
        eid = aoi["id"]
        ed = EVENTS_DIR / eid
        ed.mkdir(exist_ok=True)
        print(f"\n→ {eid}: {aoi['name']}")
        try:
            rb = fetch_image(token, aoi["bbox"], *aoi["date_before"], EVALSCRIPT_RGB)
            (ed / "before.png").write_bytes(rb)
            print(f"  RGB before {len(rb)} bytes")

            ra = fetch_image(token, aoi["bbox"], *aoi["date_after"], EVALSCRIPT_RGB)
            (ed / "after.png").write_bytes(ra)
            print(f"  RGB after {len(ra)} bytes")

            nbt = fetch_image(
                token,
                aoi["bbox"],
                *aoi["date_before"],
                EVALSCRIPT_NDVI,
                fmt="image/tiff",
            )
            nat = fetch_image(
                token,
                aoi["bbox"],
                *aoi["date_after"],
                EVALSCRIPT_NDVI,
                fmt="image/tiff",
            )
            nb = parse_float_tiff(nbt)
            na = parse_float_tiff(nat)
            mask, stats = make_diff_mask(nb, na, threshold=0.2)
            (ed / "ndvi_diff.png").write_bytes(mask)
            print(
                f"  NDVI before={stats['ndvi_mean_before']:.3f}"
                f" after={stats['ndvi_mean_after']:.3f}"
            )

            total_ha = bbox_area_ha(aoi["bbox"])
            loss_ha = total_ha * stats["loss_fraction"]
            confidence = min(1.0, stats["loss_fraction"] * 5 + stats["ndvi_drop_mean"])

            ev = {
                "id": eid,
                "name": aoi["name"],
                "region": aoi["region"],
                "bbox": aoi["bbox"],
                "center": [
                    (aoi["bbox"][0] + aoi["bbox"][2]) / 2,
                    (aoi["bbox"][1] + aoi["bbox"][3]) / 2,
                ],
                "date_before": aoi["date_before"][1],
                "date_after": aoi["date_after"][1],
                "area_total_ha": round(total_ha, 1),
                "area_loss_ha": round(loss_ha, 2),
                "ndvi_drop_mean": round(stats["ndvi_drop_mean"], 3),
                "ndvi_before_mean": round(stats["ndvi_mean_before"], 3),
                "ndvi_after_mean": round(stats["ndvi_mean_after"], 3),
                "confidence": round(confidence, 2),
                "assets": {
                    "before": f"/data/events/{eid}/before.png",
                    "after": f"/data/events/{eid}/after.png",
                    "mask": f"/data/events/{eid}/ndvi_diff.png",
                },
            }
            (ed / "event.json").write_text(
                json.dumps(ev, ensure_ascii=False, indent=2)
            )
            events.append(ev)
            print(f"  ✓ loss {loss_ha:.2f} ha, confidence {confidence:.2f}")
        except Exception as exc:
            print(f"  ✗ ERR: {exc}")

    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(events),
        "events": events,
    }
    (PUBLIC_DATA / "events.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2)
    )
    print(f"\n=== Done: {len(events)} events written to {PUBLIC_DATA} ===")


if __name__ == "__main__":
    main()
