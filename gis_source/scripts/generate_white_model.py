# -*- coding: utf-8 -*-
"""基于建筑面 SHP 生成统一五层高度的 OBJ 白模。"""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

import geopandas as gpd
from shapely.geometry import MultiPolygon, Polygon
from shapely import constrained_delaunay_triangles


def iter_polygons(geometry):
    """将 Polygon/MultiPolygon 统一展开为 Polygon。"""
    if geometry is None or geometry.is_empty:
        return
    if isinstance(geometry, Polygon):
        yield geometry
    elif isinstance(geometry, MultiPolygon):
        yield from geometry.geoms


def safe_object_name(value: object, fallback: str) -> str:
    text = str(value).strip() if value is not None else fallback
    text = re.sub(r"[^0-9A-Za-z_\-]+", "_", text)
    return text.strip("_") or fallback


def add_vertex(vertices: list[tuple[float, float, float]], x: float, y: float, z: float) -> int:
    vertices.append((float(x), float(y), float(z)))
    return len(vertices)  # OBJ 顶点索引从 1 开始


def build_polygon_mesh(poly: Polygon, height: float, origin_x: float, origin_y: float):
    """生成单个多边形的封闭拉伸网格。"""
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []

    # 顶面与底面：使用约束 Delaunay 三角剖分，确保凹多边形及内洞被完整覆盖。
    triangulated = constrained_delaunay_triangles(poly)
    roof_triangles = list(triangulated.geoms)
    for tri in roof_triangles:
        coords = list(tri.exterior.coords)[:3]
        top = [add_vertex(vertices, x - origin_x, y - origin_y, height) for x, y in coords]
        bottom = [add_vertex(vertices, x - origin_x, y - origin_y, 0.0) for x, y in coords]
        faces.append(tuple(top))
        faces.append(tuple(reversed(bottom)))

    # 外环及内洞侧墙。
    rings = [poly.exterior, *poly.interiors]
    for ring in rings:
        coords = list(ring.coords)
        for (x1, y1), (x2, y2) in zip(coords[:-1], coords[1:]):
            if math.isclose(x1, x2) and math.isclose(y1, y2):
                continue
            b1 = add_vertex(vertices, x1 - origin_x, y1 - origin_y, 0.0)
            b2 = add_vertex(vertices, x2 - origin_x, y2 - origin_y, 0.0)
            t2 = add_vertex(vertices, x2 - origin_x, y2 - origin_y, height)
            t1 = add_vertex(vertices, x1 - origin_x, y1 - origin_y, height)
            faces.append((b1, b2, t2, t1))

    return vertices, faces, len(roof_triangles)


def main():
    parser = argparse.ArgumentParser(description="将建筑面 SHP 拉伸为统一层数的 OBJ 白模")
    parser.add_argument("input_shp", type=Path, help="建筑面 SHP 文件")
    parser.add_argument("output_dir", type=Path, help="输出文件夹")
    parser.add_argument("--floors", type=int, default=5, help="统一层数，默认 5 层")
    parser.add_argument("--floor-height", type=float, default=3.0, help="每层高度（米），默认 3 米")
    parser.add_argument("--target-crs", default="EPSG:32649", help="米制投影坐标系，默认 UTM 49N")
    args = parser.parse_args()

    if args.floors <= 0 or args.floor_height <= 0:
        raise ValueError("层数和层高必须大于 0")

    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    height = args.floors * args.floor_height

    gdf = gpd.read_file(args.input_shp)
    if gdf.crs is None:
        raise ValueError("输入 SHP 缺少坐标系信息")
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty].copy()
    gdf = gdf[gdf.geom_type.isin(["Polygon", "MultiPolygon"])].copy()
    if gdf.empty:
        raise ValueError("输入文件中没有可拉伸的面要素")

    projected = gdf.to_crs(args.target_crs)
    minx, miny, maxx, maxy = projected.total_bounds
    origin_x = (minx + maxx) / 2.0
    origin_y = (miny + maxy) / 2.0

    obj_path = output_dir / "二里半建筑白模_5层.obj"
    mtl_path = output_dir / "二里半建筑白模_5层.mtl"
    metadata_path = output_dir / "二里半建筑白模_5层_说明.json"
    geojson_path = output_dir / "二里半建筑白模_5层_建筑面.geojson"

    mtl_path.write_text(
        "# 二里半建筑白模统一白色材质\n"
        "newmtl WhiteModel\n"
        "Ka 0.850000 0.850000 0.850000\n"
        "Kd 0.950000 0.950000 0.950000\n"
        "Ks 0.100000 0.100000 0.100000\n"
        "Ns 20.000000\n"
        "d 1.000000\n"
        "illum 2\n",
        encoding="utf-8",
    )

    obj_lines = [
        "# 二里半建筑白模：统一 5 层，每层 3 米，总高 15 米",
        f"mtllib {mtl_path.name}",
        "usemtl WhiteModel",
        "s off",
    ]
    vertex_offset = 0
    total_vertices = 0
    total_faces = 0
    total_roof_triangles = 0
    polygon_parts = 0

    for feature_no, (_, row) in enumerate(projected.iterrows(), start=1):
        identifier = row.get("id", feature_no)
        name = safe_object_name(identifier, f"building_{feature_no}")
        for part_no, poly in enumerate(iter_polygons(row.geometry), start=1):
            if not poly.is_valid:
                poly = poly.buffer(0)
            for fixed_poly in iter_polygons(poly):
                vertices, faces, roof_count = build_polygon_mesh(
                    fixed_poly, height, origin_x, origin_y
                )
                if not vertices or not faces:
                    continue
                polygon_parts += 1
                obj_lines.append(f"o building_{feature_no}_{name}_part_{part_no}")
                obj_lines.extend(f"v {x:.4f} {y:.4f} {z:.4f}" for x, y, z in vertices)
                for face in faces:
                    obj_lines.append("f " + " ".join(str(index + vertex_offset) for index in face))
                vertex_offset += len(vertices)
                total_vertices += len(vertices)
                total_faces += len(faces)
                total_roof_triangles += roof_count

    obj_path.write_text("\n".join(obj_lines) + "\n", encoding="utf-8")

    # 同时输出带层数/高度属性的 GeoJSON，便于 GIS 或 Web 三维软件继续使用。
    geo_out = gdf.to_crs("EPSG:4326").copy()
    geo_out["floors"] = args.floors
    geo_out["floor_h_m"] = args.floor_height
    geo_out["height_m"] = height
    geo_out.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")

    metadata = {
        "source_shp": str(args.input_shp.resolve()),
        "source_feature_count": int(len(gdf)),
        "polygon_part_count": polygon_parts,
        "floors": args.floors,
        "floor_height_m": args.floor_height,
        "total_height_m": height,
        "model_crs": args.target_crs,
        "local_origin_projected": {"x": origin_x, "y": origin_y, "z": 0.0},
        "local_bounds_m": {
            "min_x": minx - origin_x,
            "min_y": miny - origin_y,
            "min_z": 0.0,
            "max_x": maxx - origin_x,
            "max_y": maxy - origin_y,
            "max_z": height,
        },
        "mesh_statistics": {
            "vertices": total_vertices,
            "faces": total_faces,
            "roof_triangles": total_roof_triangles,
        },
        "outputs": {
            "obj": obj_path.name,
            "mtl": mtl_path.name,
            "geojson": geojson_path.name,
        },
        "notes": [
            "OBJ 使用局部米制坐标，Z 轴向上。",
            "所有建筑统一设置为 5 层，按每层 3 米计算，总高 15 米。",
            "材质为不透明白色 WhiteModel。",
        ],
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()


