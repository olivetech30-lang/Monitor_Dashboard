import json
from typing import Dict, Any
from http import HTTPStatus

# In-memory state (⚠️ resets on cold start – use Redis/DB in real app)
_state = {"delay": 1000}  # Default: 1000 ms

MIN_DELAY = 500
MAX_DELAY = 5000

def clamp_delay(value: int) -> int:
    return max(MIN_DELAY, min(MAX_DELAY, value))

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    method = event.get("httpMethod", "")
    
    if method == "GET":
        return {
            "statusCode": HTTPStatus.OK,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"delay": _state["delay"]})
        }
    
    elif method == "POST":
        try:
            body = json.loads(event.get("body", "{}"))
            new_delay = int(body.get("delay", _state["delay"]))
            _state["delay"] = clamp_delay(new_delay)
            
            return {
                "statusCode": HTTPStatus.OK,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"delay": _state["delay"]})
            }
        except (ValueError, TypeError, KeyError):
            return {
                "statusCode": HTTPStatus.BAD_REQUEST,
                "body": json.dumps({"error": "Invalid delay value"})
            }
    
    else:
        return {
            "statusCode": HTTPStatus.METHOD_NOT_ALLOWED,
            "body": json.dumps({"error": "Method not allowed"})
        }