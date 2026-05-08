"""
AOI-сканер: бере перелік кандидатних координат у Карпатах (з місць,
де Global Forest Watch показує концентрацію втрат лісу 2023-2024),
проганяє через Sentinel-2 / NDVI пайплайн і ранжує за площею втрат.

Запуск:
    /tmp/tg-venv/bin/python scripts/scan_candidates.py
"""
from __future__ import annotations
import io
import json
import sys
from pathlib import Path

import numpy as np
import requests
import tifffile

CLIENT_ID = "sh-a510f8c8-264b-47fc-ab3f-ce88a2a2316c"
CLIENT_SECRET = "quXCwknu0o5Ri2igvhBHG1LZrPIJfDM2"
TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"

EVALSCRIPT_NDVI = """//VERSION=3
function setup(){return {input:[{bands:['B04','B08','SCL']}], output:{bands:1, sampleType:'FLOAT32'}};}
function evaluatePixel(s){
  if ([3,8,9,10,11].indexOf(s.SCL)>=0) return [NaN];
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + 1e-9);
  return [ndvi];
}
"""

# Кандидати: довгота-широта центру, з огляду на щільні скупчення pink-точок
# на Global Forest Watch (Tree cover loss 2001-2024) у Карпатах.
# Розмір вікна — 0.04° × 0.04° (~3×3 км) — більше, ніж раніше, щоб потрапити
# у самі рубки навіть якщо я промахнувся на пів кілометра.
CANDIDATES = [
    ("yaremche_west",     "Захід Яремчого",         24.51, 48.44),
    ("vorokhta_north",    "Північ Ворохти",         24.55, 48.32),
    ("yablunyi",          "Яблуниця",               24.62, 48.40),
    ("nadvirna_south",    "Південь Надвірни",       24.55, 48.55),
    ("solotvyn_east",     "Схід Солотвина",         24.45, 48.74),
    ("delyatyn_west",     "Захід Делятина",         24.55, 48.50),
    ("hvizdets",          "Гвіздець",               25.11, 48.42),
    ("verkhovyna_north",  "Північ Верховини",       24.81, 48.18),
    ("krasnyk",           "Красник (Косівщина)",    25.00, 48.30),
    ("perehinske_south",  "Південь Перегінського",  23.95, 48.78),
    ("skole_east",        "Схід Сколя",             23.55, 49.04),
    ("rakhiv_north",      "Північ Рахова",          24.30, 48.10),
]
HALF_SIDE = 0.02  # → bbox 0.04° × 0.04°  (~3.0 × 3.0 км на 48° широти)

DATE_BEFORE = ("2024-05-01", "2024-07-15")
DATE_AFTER  = ("2024-07-15", "2024-09-30")


def get_token() -> str:
    r = requests.post(TOKEN_URL, data={
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def fetch_ndvi(token: str, bbox, date_from: str, date_to: str) -> np.ndarray:
    body = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {
                        "from": f"{date_from}T00:00:00Z",
                        "to":   f"{date_to}T23:59:59Z",
                    },
                    "maxCloudCoverage": 30,
                    "mosaickingOrder": "leastCC",
                },
            }],
        },
        "output": {
            "width": 256, "height": 256,
            "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}],
        },
        "evalscript": EVALSCRIPT_NDVI,
    }
    r = requests.post(PROCESS_URL, json=body,
                      headers={"Authorization": f"Bearer {token}"}, timeout=60)
    r.raise_for_status()
    return tifffile.imread(io.BytesIO(r.content)).astype(np.float32)


def bbox_area_ha(bbox) -> float:
    w, s, e, n = bbox
    lat_m = (n - s) * 111_000
    lon_m = (e - w) * 111_000 * np.cos(np.radians((n + s) / 2))
    return (lat_m * lon_m) / 10_000


def main():
    token = get_token()
    print(f"OAuth OK (token len {len(token)})\n")

    results = []
    for cid, name, lon, lat in CANDIDATES:
        bbox = [lon - HALF_SIDE, lat - HALF_SIDE, lon + HALF_SIDE, lat + HALF_SIDE]
        try:
            nb = fetch_ndvi(token, bbox, *DATE_BEFORE)
            na = fetch_ndvi(token, bbox, *DATE_AFTER)
            valid = ~(np.isnan(nb) | np.isnan(na))
            drop = np.where(valid, nb - na, 0)
            loss_mask = (drop > 0.2) & valid
            loss_frac = float(loss_mask.sum() / max(valid.sum(), 1))
            total_ha = bbox_area_ha(bbox)
            loss_ha = total_ha * loss_frac
            mean_b = float(np.nanmean(nb))
            mean_a = float(np.nanmean(na))
            print(f"{cid:22s} {name:30s} loss={loss_ha:6.2f} ha  "
                  f"frac={loss_frac*100:5.1f}%  NDVI {mean_b:.2f}->{mean_a:.2f}")
            results.append({
                "id": cid, "name": name, "bbox": bbox,
                "loss_ha": round(loss_ha, 2),
                "loss_frac_pct": round(loss_frac * 100, 2),
                "ndvi_before": round(mean_b, 3),
                "ndvi_after":  round(mean_a, 3),
                "valid_pixels": int(valid.sum()),
            })
        except Exception as exc:
            print(f"{cid:22s} ERROR: {exc}")

    print("\n=== Top 5 by loss_ha ===")
    results.sort(key=lambda r: r["loss_ha"], reverse=True)
    for r in results[:5]:
        print(f"  {r['id']:22s} {r['loss_ha']:6.2f} ha  ({r['loss_frac_pct']:.1f}%)")

    out = Path(__file__).parent / "scan_results.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f"\nSaved: {out}")


if __name__ == "__main__":
    main()
