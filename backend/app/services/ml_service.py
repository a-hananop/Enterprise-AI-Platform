"""
ML Service - Training, prediction, forecasting, anomaly detection
Uses: scikit-learn, XGBoost, Prophet (all FREE open source)
"""
import os
import json
import pickle
import time
import uuid
from typing import List, Dict, Optional, Any
import numpy as np
import pandas as pd
from datetime import datetime


class MLService:

    async def train(
        self,
        file_path: str,
        model_type: str,
        target_column: str,
        feature_columns: Optional[List[str]] = None,
        algorithm: str = "auto",
        hyperparameters: Dict = {},
        test_size: float = 0.2,
        model_id: str = None,
    ) -> Dict:
        """Train an ML model and save to disk"""
        start = time.time()

        # Load data
        df = self._load_dataframe(file_path)
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found")

        # Feature selection
        if feature_columns:
            X = df[feature_columns].copy()
        else:
            X = df.drop(columns=[target_column]).copy()
            feature_columns = list(X.columns)

        y = df[target_column].copy()

        # Preprocessing
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler, LabelEncoder
        from sklearn.model_selection import train_test_split
        from sklearn.compose import ColumnTransformer
        from sklearn.preprocessing import OneHotEncoder
        from sklearn.impute import SimpleImputer

        # Handle categorical features
        X = self._preprocess_features(X)
        feature_columns = list(X.columns)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        # Select model
        model = self._get_model(model_type, algorithm, hyperparameters, y)

        # Train
        model.fit(X_train, y_train)

        # Evaluate
        metrics = self._evaluate(model, X_test, y_test, model_type)

        # Feature importance
        feature_importance = self._get_feature_importance(model, feature_columns)

        # Save model
        model_path = self._save_model(model, model_id or str(uuid.uuid4()), {"features": feature_columns, "model_type": model_type})

        return {
            "metrics": metrics,
            "feature_importance": feature_importance,
            "model_path": model_path,
            "features_used": feature_columns,
            "duration": round(time.time() - start, 2),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        }

    async def predict(self, model_path: str, model_type: str, data: List[Dict]) -> Dict:
        """Make predictions"""
        model_package = self._load_model(model_path)
        model = model_package["model"]
        features = model_package["metadata"].get("features", [])

        df = pd.DataFrame(data)
        if features:
            df = df.reindex(columns=features, fill_value=0)
        df = self._preprocess_features(df)

        predictions = model.predict(df).tolist()
        confidence = None

        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(df).tolist()
            confidence = [max(p) for p in proba]

        # Feature importance for explanation
        fi = self._get_feature_importance(model, list(df.columns))

        return {
            "predictions": predictions,
            "confidence": confidence,
            "explanation": {
                "top_features": sorted(fi.items(), key=lambda x: x[1], reverse=True)[:5] if fi else []
            }
        }

    async def forecast(
        self,
        file_path: str,
        source_type: str,
        date_col: str,
        value_col: str,
        periods: int = 30,
        frequency: str = "D",
    ) -> Dict:
        """Time series forecasting using Prophet or statsmodels"""
        df = self._load_dataframe(file_path)

        if date_col not in df.columns or value_col not in df.columns:
            raise ValueError(f"Columns not found: {date_col}, {value_col}")

        df_ts = df[[date_col, value_col]].copy()
        df_ts.columns = ["ds", "y"]
        df_ts["ds"] = pd.to_datetime(df_ts["ds"], errors="coerce")
        df_ts = df_ts.dropna().sort_values("ds")

        try:
            from prophet import Prophet
            m = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
            m.fit(df_ts)
            future = m.make_future_dataframe(periods=periods, freq=frequency)
            forecast = m.predict(future)
            forecast_data = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(periods)
            historical = df_ts.tail(60).to_dict("records")

            return {
                "method": "prophet",
                "historical": [{"date": str(r["ds"])[:10], "value": r["y"]} for r in historical],
                "forecast": [
                    {
                        "date": str(row["ds"])[:10],
                        "predicted": round(row["yhat"], 2),
                        "lower": round(row["yhat_lower"], 2),
                        "upper": round(row["yhat_upper"], 2),
                    }
                    for _, row in forecast_data.iterrows()
                ],
                "periods": periods,
            }
        except ImportError:
            # Fallback to simple linear regression
            return self._simple_forecast(df_ts, periods)

    async def detect_anomalies(
        self,
        file_path: str,
        source_type: str,
        columns: Optional[List[str]] = None,
        contamination: float = 0.05,
    ) -> Dict:
        """Anomaly/fraud detection using Isolation Forest"""
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler

        df = self._load_dataframe(file_path)
        numeric_cols = columns or list(df.select_dtypes(include=[np.number]).columns)
        if not numeric_cols:
            raise ValueError("No numeric columns found for anomaly detection")

        X = df[numeric_cols].fillna(df[numeric_cols].median())
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = IsolationForest(contamination=contamination, random_state=42)
        scores = model.fit_predict(X_scaled)
        anomaly_score = model.score_samples(X_scaled)

        df["is_anomaly"] = (scores == -1).astype(int)
        df["anomaly_score"] = anomaly_score

        anomalies = df[df["is_anomaly"] == 1]
        return {
            "total_records": len(df),
            "anomalies_found": len(anomalies),
            "anomaly_rate": round(len(anomalies) / len(df) * 100, 2),
            "anomaly_indices": anomalies.index.tolist()[:100],
            "columns_analyzed": numeric_cols,
            "threshold": contamination,
        }

    async def cluster(self, file_path: str, source_type: str, columns: List[str], n_clusters: int = 5) -> Dict:
        """K-Means clustering for segmentation"""
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler

        df = self._load_dataframe(file_path)
        available = [c for c in columns if c in df.columns]
        if not available:
            raise ValueError("None of the specified columns found")

        X = df[available].fillna(df[available].median())
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        km = KMeans(n_clusters=min(n_clusters, len(X)), random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)

        df["cluster"] = labels
        cluster_summary = []
        for i in range(km.n_clusters):
            mask = labels == i
            cluster_df = df[mask][available]
            cluster_summary.append({
                "cluster_id": i,
                "size": int(mask.sum()),
                "percentage": round(mask.sum() / len(df) * 100, 1),
                "centroid": {col: round(float(cluster_df[col].mean()), 2) for col in available},
            })

        return {
            "n_clusters": km.n_clusters,
            "inertia": round(float(km.inertia_), 2),
            "clusters": cluster_summary,
            "columns_used": available,
        }

    # ── Internal Helpers ────────────────────────────────────────
    def _load_dataframe(self, file_path: str) -> pd.DataFrame:
        ext = file_path.split(".")[-1].lower()
        if ext == "csv":
            return pd.read_csv(file_path)
        elif ext in ["xlsx", "xls"]:
            return pd.read_excel(file_path)
        elif ext == "json":
            return pd.read_json(file_path)
        raise ValueError(f"Unsupported file type: {ext}")

    def _preprocess_features(self, X: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values and encode categoricals"""
        # Drop high-cardinality string columns
        for col in X.select_dtypes(include=["object"]).columns:
            if X[col].nunique() > 50:
                X = X.drop(columns=[col])
            else:
                X[col] = pd.Categorical(X[col]).codes

        # Fill numeric nulls
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        X[numeric_cols] = X[numeric_cols].fillna(X[numeric_cols].median())

        return X

    def _get_model(self, model_type: str, algorithm: str, hyperparams: Dict, y):
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
        from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
        from sklearn.svm import SVC, SVR

        is_regression = model_type in ["regression", "forecasting"]
        is_classification = model_type in ["classification"]

        algo = algorithm.lower() if algorithm else "auto"

        if algo in ["auto", "random_forest", "rf"]:
            return RandomForestRegressor(n_estimators=100, random_state=42) if is_regression else RandomForestClassifier(n_estimators=100, random_state=42)
        elif algo in ["xgboost", "xgb"]:
            try:
                import xgboost as xgb
                return xgb.XGBRegressor(random_state=42) if is_regression else xgb.XGBClassifier(random_state=42, eval_metric="logloss")
            except ImportError:
                return RandomForestRegressor(n_estimators=100, random_state=42) if is_regression else RandomForestClassifier(n_estimators=100, random_state=42)
        elif algo in ["gradient_boosting", "gb"]:
            return GradientBoostingRegressor(random_state=42) if is_regression else GradientBoostingClassifier(random_state=42)
        elif algo in ["linear", "logistic"]:
            return LinearRegression() if is_regression else LogisticRegression(max_iter=1000)
        else:
            return RandomForestRegressor(n_estimators=100, random_state=42) if is_regression else RandomForestClassifier(n_estimators=100, random_state=42)

    def _evaluate(self, model, X_test, y_test, model_type: str) -> Dict:
        from sklearn.metrics import (
            accuracy_score, f1_score, precision_score, recall_score,
            r2_score, mean_absolute_error, mean_squared_error
        )
        y_pred = model.predict(X_test)

        if model_type in ["regression", "forecasting"]:
            return {
                "r2_score": round(float(r2_score(y_test, y_pred)), 4),
                "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
                "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            }
        else:
            return {
                "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
                "f1_score": round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
                "precision": round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
                "recall": round(float(recall_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
            }

    def _get_feature_importance(self, model, features: List[str]) -> Dict:
        if hasattr(model, "feature_importances_"):
            fi = model.feature_importances_
            return {f: round(float(v), 4) for f, v in zip(features, fi)}
        elif hasattr(model, "coef_"):
            coef = model.coef_ if model.coef_.ndim == 1 else model.coef_[0]
            return {f: round(float(abs(v)), 4) for f, v in zip(features, coef)}
        return {}

    def _save_model(self, model, model_id: str, metadata: Dict) -> str:
        path = f"./data/models/model_{model_id}.pkl"
        with open(path, "wb") as f:
            pickle.dump({"model": model, "metadata": metadata}, f)
        return path

    def _load_model(self, model_path: str) -> Dict:
        with open(model_path, "rb") as f:
            return pickle.load(f)

    def _simple_forecast(self, df_ts: pd.DataFrame, periods: int) -> Dict:
        """Simple linear trend forecast fallback"""
        from sklearn.linear_model import LinearRegression
        df_ts = df_ts.copy()
        df_ts["t"] = range(len(df_ts))
        X = df_ts[["t"]]
        y = df_ts["y"]
        model = LinearRegression()
        model.fit(X, y)

        future_t = [[len(df_ts) + i] for i in range(periods)]
        predictions = model.predict(future_t)
        last_date = pd.to_datetime(df_ts["ds"].max())

        return {
            "method": "linear_trend",
            "historical": [{"date": str(r["ds"])[:10], "value": float(r["y"])} for _, r in df_ts.tail(60).iterrows()],
            "forecast": [
                {"date": str(last_date + pd.Timedelta(days=i+1))[:10], "predicted": round(float(v), 2)}
                for i, v in enumerate(predictions)
            ],
            "periods": periods,
        }
