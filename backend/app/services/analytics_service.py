"""
Analytics Service - Business Intelligence & KPI analysis
"""
import json
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np


class AnalyticsService:

    def _get_ext(self, source_type: Any) -> str:
        if hasattr(source_type, 'value'):
            return str(source_type.value).lower()
        return str(source_type).split('.')[-1].lower()

    async def extract_kpis(self, file_path: str, source_type: str) -> List[Dict]:
        """Auto-extract KPIs from a dataset"""
        df = self._load_df(file_path, self._get_ext(source_type))
        if df is None:
            return []

        kpis = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        for col in numeric_cols[:10]:
            val = df[col].sum() if "revenue" in col.lower() or "sales" in col.lower() or "amount" in col.lower() else df[col].mean()
            prev = val * 0.95  # Simulate previous period
            change = round((val - prev) / prev * 100, 2) if prev != 0 else 0
            kpis.append({
                "name": col.replace("_", " ").title(),
                "value": round(float(val), 2),
                "unit": self._infer_unit(col),
                "category": self._infer_category(col),
                "change_percent": change,
                "trend": "up" if change > 0 else "down" if change < 0 else "stable",
            })

        return kpis

    async def trend_analysis(
        self, file_path: str, source_type: str,
        date_col: str, value_cols: List[str], granularity: str = "monthly"
    ) -> Dict:
        """Analyze trends over time"""
        df = self._load_df(file_path, self._get_ext(source_type))
        if df is None:
            return {"error": "Cannot load data"}
        if date_col not in df.columns:
            return {"error": f"Date column '{date_col}' not found"}

        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        df = df.dropna(subset=[date_col])

        freq_map = {"daily": "D", "weekly": "W", "monthly": "ME", "quarterly": "QE", "yearly": "YE"}
        freq = freq_map.get(granularity, "ME")

        available_cols = [c for c in value_cols if c in df.columns]
        if not available_cols:
            return {"error": "No valid value columns found"}

        df = df.set_index(date_col)
        grouped = df[available_cols].resample(freq).agg(["sum", "mean", "count"])

        result = {
            "granularity": granularity,
            "date_range": {"start": str(df.index.min())[:10], "end": str(df.index.max())[:10]},
            "series": {},
        }

        for col in available_cols:
            if col in grouped:
                series_data = []
                for dt, row in grouped[col].iterrows():
                    series_data.append({
                        "date": str(dt)[:10],
                        "sum": self._safe_float(row.get("sum")),
                        "mean": self._safe_float(row.get("mean")),
                        "count": int(row.get("count", 0)),
                    })
                result["series"][col] = series_data

        # Compute growth rates
        result["insights"] = self._compute_growth_insights(grouped, available_cols)
        return result

    async def comparative_analysis(
        self, file_path: str, source_type: str,
        group_col: str, value_cols: List[str]
    ) -> Dict:
        """Compare metrics across groups/segments"""
        df = self._load_df(file_path, self._get_ext(source_type))
        if df is None or group_col not in df.columns:
            return {"error": "Invalid data or column"}

        available = [c for c in value_cols if c in df.columns]
        grouped = df.groupby(group_col)[available].agg(["sum", "mean", "count"])

        result = {"group_column": group_col, "groups": [], "summary": {}}

        for group_name, row in grouped.iterrows():
            group_data = {"group": str(group_name)}
            for col in available:
                group_data[col] = {
                    "sum": self._safe_float(row[col]["sum"]),
                    "mean": self._safe_float(row[col]["mean"]),
                    "count": int(row[col]["count"]),
                }
            result["groups"].append(group_data)

        # Summary stats
        for col in available:
            col_totals = [g[col]["sum"] for g in result["groups"] if col in g and g[col]["sum"] is not None]
            if col_totals:
                result["summary"][col] = {
                    "total": round(sum(col_totals), 2),
                    "max_group": max(result["groups"], key=lambda x: x.get(col, {}).get("sum", 0) or 0)["group"],
                    "min_group": min(result["groups"], key=lambda x: x.get(col, {}).get("sum", 0) or 0)["group"],
                }

        return result

    async def what_if_simulation(
        self, file_path: str, source_type: str,
        base_scenario: Dict, variables: List[Dict], target_metric: str
    ) -> Dict:
        """Simulate different scenarios"""
        df = self._load_df(file_path, self._get_ext(source_type))
        if df is None:
            return {"error": "Cannot load data"}

        if target_metric not in df.columns:
            return {"error": f"Target metric '{target_metric}' not found"}

        base_value = float(df[target_metric].mean())
        scenarios = []

        for var in variables:
            var_name = var.get("name")
            values = var.get("values", [])

            if var_name not in df.columns:
                continue

            for v in values:
                sim_df = df.copy()
                multiplier = float(v) / float(df[var_name].mean()) if df[var_name].mean() != 0 else 1.0
                sim_df[target_metric] = df[target_metric] * multiplier * 0.8  # rough simulation
                sim_value = float(sim_df[target_metric].mean())
                change = round((sim_value - base_value) / base_value * 100, 2) if base_value != 0 else 0

                scenarios.append({
                    "variable": var_name,
                    "variable_value": v,
                    "predicted_metric": round(sim_value, 2),
                    "change_from_base": change,
                    "impact": "positive" if change > 0 else "negative",
                })

        return {
            "base_value": round(base_value, 2),
            "target_metric": target_metric,
            "scenarios": scenarios,
            "best_scenario": max(scenarios, key=lambda x: x["change_from_base"]) if scenarios else None,
        }

    async def quick_stats(self, file_path: str, source_type: str) -> Dict:
        """Quick statistics for report context"""
        df = self._load_df(file_path, self._get_ext(source_type))
        if df is None:
            return {}

        stats = {"rows": len(df), "columns": len(df.columns)}
        numeric = df.select_dtypes(include=[np.number])
        if not numeric.empty:
            stats["total_sum"] = round(float(numeric.sum().sum()), 2)
            stats["numeric_columns"] = len(numeric.columns)
            for col in numeric.columns[:3]:
                stats[f"{col}_mean"] = round(float(numeric[col].mean()), 2)
        return stats

    def _load_df(self, file_path: str, source_type: str) -> Optional[pd.DataFrame]:
        try:
            if source_type in ["csv"]:
                return pd.read_csv(file_path)
            elif source_type in ["excel"]:
                return pd.read_excel(file_path)
            elif source_type in ["json"]:
                return pd.read_json(file_path)
        except Exception as e:
            print(f"Load error: {e}")
        return None

    def _safe_float(self, val) -> Optional[float]:
        try:
            v = float(val)
            return round(v, 4) if not (np.isnan(v) or np.isinf(v)) else None
        except Exception:
            return None

    def _infer_unit(self, col_name: str) -> str:
        col = col_name.lower()
        if any(x in col for x in ["revenue", "sales", "profit", "cost", "price", "amount"]):
            return "$"
        if any(x in col for x in ["rate", "percent", "ratio", "score"]):
            return "%"
        if any(x in col for x in ["count", "number", "qty", "quantity"]):
            return "units"
        return ""

    def _infer_category(self, col_name: str) -> str:
        col = col_name.lower()
        if any(x in col for x in ["revenue", "sales", "profit"]):
            return "sales"
        if any(x in col for x in ["cost", "expense", "budget"]):
            return "finance"
        if any(x in col for x in ["customer", "user", "churn"]):
            return "marketing"
        return "operations"

    def _compute_growth_insights(self, grouped, cols: List[str]) -> List[str]:
        insights = []
        for col in cols[:3]:
            try:
                if col not in grouped:
                    continue
                sums = grouped[col]["sum"].dropna()
                if len(sums) >= 2:
                    first = float(sums.iloc[0])
                    last = float(sums.iloc[-1])
                    if first != 0:
                        growth = round((last - first) / abs(first) * 100, 1)
                        direction = "increased" if growth > 0 else "decreased"
                        insights.append(f"{col} {direction} by {abs(growth)}% over the period")
            except Exception:
                pass
        return insights
