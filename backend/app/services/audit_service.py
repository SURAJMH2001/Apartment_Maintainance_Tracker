from sqlalchemy.orm import Session
from app.repositories.audit_repository import audit_repo
from typing import Optional, Dict, Any
from datetime import date, datetime
from starlette.requests import Request

def _make_json_safe(obj: Any) -> Any:
    """Recursively converts dates, datetimes and non-primitives to JSON-serializable primitives."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {str(k): _make_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_make_json_safe(x) for x in obj]
    return obj

def _generate_clear_explanation(
    action: str, 
    entity_type: str, 
    entity_id: Optional[str], 
    old_values: Optional[Dict[str, Any]], 
    new_values: Optional[Dict[str, Any]],
    user_name: Optional[str]
) -> str:
    actor = user_name or "User"
    action_upper = (action or "").upper()
    
    # Specific action explanations
    if action_upper == "LOGIN":
        method = new_values.get("auth_method", "portal") if new_values else "portal"
        unit = new_values.get("unit_number") if new_values else None
        role = new_values.get("role", "") if new_values else ""
        flat_str = f" (Flat {unit})" if unit else ""
        role_str = f" [{role.upper()}]" if role else ""
        return f"{actor}{flat_str} signed in to society portal via {method}{role_str}".strip()

    if action_upper == "LOGOUT":
        unit = new_values.get("unit_number") if new_values else None
        flat_str = f" (Flat {unit})" if unit else ""
        return f"{actor}{flat_str} signed out of society portal".strip()

    if "ACCESS_CODE" in action_upper:
        code = new_values.get("access_code", "") if new_values else ""
        return f"{actor} updated resident joining access code to '{code}'"
    
    if action_upper == "CLEANUP_FINANCIAL_DATA":
        del_cnt = new_values.get("deleted_transactions", 0) if new_values else 0
        reset_cnt = new_values.get("reset_payments", 0) if new_values else 0
        return f"{actor} wiped financial data: cleared {del_cnt} transactions & reset {reset_cnt} payment records"

    if action_upper == "DELETE":
        details = []
        if old_values:
            if "title" in old_values: details.append(f"Title: '{old_values['title']}'")
            if "description" in old_values: details.append(f"Desc: '{old_values['description']}'")
            if "amount" in old_values: details.append(f"Amount: ₹{old_values['amount']}")
            if "category" in old_values: details.append(f"Category: {old_values['category']}")
            if "unit_number" in old_values: details.append(f"Flat: {old_values['unit_number']}")
            if "owner_name" in old_values: details.append(f"Name: {old_values['owner_name']}")
            if "registration_number" in old_values: details.append(f"Plate: {old_values['registration_number']}")
            if "vehicle_number" in old_values: details.append(f"Plate: {old_values['vehicle_number']}")
        detail_str = f" ({', '.join(details)})" if details else ""
        return f"{actor} deleted {entity_type} #{entity_id or ''}{detail_str}".strip()

    if action_upper == "CREATE":
        details = []
        if new_values:
            if "title" in new_values: details.append(f"Title: '{new_values['title']}'")
            if "amount" in new_values: details.append(f"Amount: ₹{new_values['amount']}")
            if "category" in new_values: details.append(f"Category: {new_values['category']}")
            if "type" in new_values: details.append(f"Type: {new_values['type']}")
            if "unit_number" in new_values: details.append(f"Flat: {new_values['unit_number']}")
            if "owner_name" in new_values: details.append(f"Name: {new_values['owner_name']}")
            if "registration_number" in new_values: details.append(f"Plate: {new_values['registration_number']}")
            if "status" in new_values: details.append(f"Status: {new_values['status']}")
        detail_str = f" with {', '.join(details)}" if details else ""
        return f"{actor} added new {entity_type} #{entity_id or ''}{detail_str}".strip()

    if action_upper == "UPDATE":
        changes = []
        if old_values and new_values:
            for k, new_v in new_values.items():
                old_v = old_values.get(k)
                if old_v != new_v:
                    if k == "is_active":
                        changes.append(f"status changed from {'Active' if old_v else 'Inactive'} to {'Active' if new_v else 'Inactive'}")
                    elif k in ["due_amount", "amount", "total_amount"]:
                        changes.append(f"bill/amount changed from ₹{old_v} to ₹{new_v}")
                    elif k == "status":
                        changes.append(f"status changed from '{old_v}' to '{new_v}'")
                    elif k == "role":
                        changes.append(f"role changed from '{old_v}' to '{new_v}'")
                    else:
                        changes.append(f"{k} changed to '{new_v}'")
        elif new_values:
            for k, new_v in new_values.items():
                if k == "is_active":
                    changes.append(f"marked as {'Active' if new_v else 'Inactive'}")
                elif k in ["due_amount", "amount"]:
                    changes.append(f"bill amount set to ₹{new_v}")
                elif k == "status":
                    changes.append(f"status set to '{new_v}'")
                else:
                    changes.append(f"{k}: '{new_v}'")

        change_str = f" ({', '.join(changes)})" if changes else ""
        return f"{actor} modified {entity_type} #{entity_id or ''}{change_str}".strip()

    return f"{actor} performed {action} on {entity_type} #{entity_id or ''}".strip()

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        user_id: Optional[int],
        username: Optional[str],
        action: str,
        entity_type: str,
        entity_id: Optional[str],
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request: Optional[Request] = None,
        description: Optional[str] = None
    ):
        # Extract real client IP if request object passed
        if request:
            if not ip_address:
                cf_ip = request.headers.get("cf-connecting-ip")
                x_real = request.headers.get("x-real-ip")
                x_forwarded = request.headers.get("x-forwarded-for")
                if cf_ip:
                    ip_address = cf_ip.strip()
                elif x_real:
                    ip_address = x_real.strip()
                elif x_forwarded:
                    ip_address = x_forwarded.split(",")[0].strip()
                elif request.client and request.client.host:
                    ip_address = request.client.host
            if not user_agent:
                user_agent = request.headers.get("user-agent")

        # Fallback to local host string if empty
        if not ip_address:
            ip_address = "127.0.0.1"

        # Generate human-readable explanation if not provided
        if not description:
            description = _generate_clear_explanation(
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id else "",
                old_values=old_values,
                new_values=new_values,
                user_name=username
            )

        log_data = {
            "user_id": user_id,
            "username": username,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "description": description,
            "old_values": _make_json_safe(old_values) if old_values else None,
            "new_values": _make_json_safe(new_values) if new_values else None,
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        try:
            audit_repo.create(db, log_data)
        except Exception as e:
            # Audit logging failure should never crash the main transaction
            pass
