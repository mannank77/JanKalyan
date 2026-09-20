import os
import json
import logging
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["SCHEMES_TABLE"])
ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

ACRE_TO_HECTARE = 0.404686


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o) if o % 1 else int(o)
        return super().default(o)


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ORIGIN,
            "Cache-Control": "max-age=60",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def _score(item: dict, state: str | None, category: str | None,
           land_acres: str | None, income: str | None, age: str | None):
    """Weighted relevance score 0.0 - 1.0. Returns (score, reasons) or (0.0, [reason])."""
    score, reasons = 0.0, []

    states = item.get("states", [])
    if state and (state in states or "All India" in states):
        score += 0.40
        reasons.append(f"Available in {state}")

    if category and category in item.get("categories", []):
        score += 0.35
        reasons.append(f"Targets {category}")

    elig = item.get("eligibility") or {}

    if land_acres is not None:
        max_ha = elig.get("land_size_max_ha")
        if max_ha is not None:
            user_ha = float(land_acres) * ACRE_TO_HECTARE
            if user_ha <= float(max_ha):
                score += 0.15
                reasons.append("Land size within limit")
            else:
                return 0.0, ["Land holding exceeds scheme limit"]

    if income is not None:
        max_inc = elig.get("income_limit_inr")
        if max_inc is not None:
            if float(income) <= float(max_inc):
                score += 0.10
                reasons.append("Income within limit")
            else:
                return 0.0, ["Income exceeds scheme limit"]

    if age is not None:
        min_age = elig.get("age_min")
        max_age = elig.get("age_max")
        if min_age and float(age) < float(min_age):
            return 0.0, ["Below minimum age"]
        if max_age and float(age) > float(max_age):
            return 0.0, ["Above maximum age"]

    return min(score, 1.0), reasons


def lambda_handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}

        # ----- GET /schemes/{scheme_id} -----
        if path_params.get("scheme_id"):
            res = table.get_item(Key={"scheme_id": path_params["scheme_id"]})
            if "Item" not in res:
                return _response(404, {"error": "Scheme not found"})
            return _response(200, {"scheme": res["Item"]})

        # ----- GET /schemes -----
        q = event.get("queryStringParameters") or {}
        state = q.get("state")
        category = q.get("category")
        land_acres = q.get("land_size")
        income = q.get("income")
        age = q.get("age")

        filter_expr = None
        if state:
            filter_expr = Attr("states").contains(state) | Attr("states").contains("All India")
        if category:
            cat_expr = Attr("categories").contains(category)
            filter_expr = (filter_expr & cat_expr) if filter_expr else cat_expr

        scan_kwargs = {"FilterExpression": filter_expr} if filter_expr else {}
        items, resp = [], table.scan(**scan_kwargs)
        items.extend(resp.get("Items", []))
        while "LastEvaluatedKey" in resp:
            scan_kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
            resp = table.scan(**scan_kwargs)
            items.extend(resp.get("Items", []))

        results = []
        has_criteria = bool(state or category or land_acres or income or age)
        for item in items:
            score, reasons = _score(item, state, category, land_acres, income, age)
            if not has_criteria or score >= 0.4:
                results.append({
                    "id": item["scheme_id"],
                    "name": item.get("name"),
                    "summary": (item.get("summary") or item.get("description") or "")[:220],
                    "match_score": round(score if has_criteria else 1.0, 2),
                    "match_reasons": reasons if has_criteria else ["Featured Scheme"],
                    "benefits": item.get("benefits", {}),
                    "documents": item.get("documents", []),
                    "deadline": item.get("deadline"),
                    "application_url": item.get("application_url"),
                    "source_pdf": item.get("source_pdf"),
                })

        results.sort(key=lambda x: x["match_score"], reverse=True)

        return _response(200, {
            "count": len(results),
            "filters_applied": {k: v for k, v in q.items() if v},
            "schemes": results,
        })

    except Exception as e:
        logger.exception("filter_schemes failed")
        return _response(500, {"error": "Internal error", "detail": str(e)})