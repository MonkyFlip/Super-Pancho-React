# export.py
"""
Exportadores headless que consumen el dict retornado por run_full_analysis.
Funciones:
 - export_summary_csv(analysis_result, dest_path=None) -> str
 - export_sections_json(analysis_result, dest_path=None) -> str
 - export_raw_text(analysis_result, dest_path=None) -> str
Devuelven la ruta absoluta del archivo generado.
"""
from typing import Dict, Any, Optional
import os
import csv
import json
import tempfile

class ExportError(ValueError):
    pass

def export_summary_csv(analysis_result: Dict[str, Any], dest_path: Optional[str] = None, delimiter: str = ",") -> str:
    if not analysis_result or "summary_text" not in analysis_result:
        raise ExportError("Sin resultados para exportar")
    if dest_path is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
        tmp.close()
        dest_path = tmp.name
    try:
        lines = [l for l in analysis_result["summary_text"].splitlines() if l.strip()]
        with open(dest_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, delimiter=delimiter)
            for line in lines:
                if ":" in line:
                    left, right = line.split(":", 1)
                    writer.writerow([left.strip(), right.strip()])
                else:
                    writer.writerow([line.strip()])
    except Exception as e:
        raise ExportError(f"Error escribiendo CSV: {e}")
    return os.path.abspath(dest_path)

def export_sections_json(analysis_result: Dict[str, Any], dest_path: Optional[str] = None) -> str:
    if not analysis_result or "sections" not in analysis_result:
        raise ExportError("Sin secciones para exportar")
    if dest_path is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        tmp.close()
        dest_path = tmp.name
    try:
        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(analysis_result["sections"], f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise ExportError(f"Error escribiendo JSON: {e}")
    return os.path.abspath(dest_path)

def export_raw_text(analysis_result: Dict[str, Any], dest_path: Optional[str] = None) -> str:
    if not analysis_result or "summary_text" not in analysis_result:
        raise ExportError("Sin texto para exportar")
    if dest_path is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
        tmp.close()
        dest_path = tmp.name
    try:
        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(analysis_result["summary_text"])
    except Exception as e:
        raise ExportError(f"Error escribiendo TXT: {e}")
    return os.path.abspath(dest_path)
