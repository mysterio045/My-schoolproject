"""
Schema Verification Script
==========================
Verifies that all Phase 3 Pydantic schemas:
  1. Import without errors.
  2. Validate sample payloads correctly.
  3. Reject invalid payloads (validation rules work).
  4. Serialize ORM-style objects (from_attributes) into responses.

Run:
    python verify_schemas.py
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.schemas import *  # noqa: F401,F403
from app.models.enums import (
    OrderStatus,
    DeliveryStatus,
    CustomerStatus,
    RiderStatus,
    NotificationRecipientType,
    NotificationType,
)

FAIL = []


def check(label: str, cond: bool, detail: str = ""):
    status = "OK" if cond else "FAIL"
    print(f"  [{status}] {label}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        FAIL.append((label, detail))


def sample_uuid(n: int = 1) -> uuid.UUID:
    return uuid.UUID(int=n)


def main():
    print("=" * 60)
    print("SCHEMA VERIFICATION")
    print("=" * 60)

    print("\n[1] Imports")
    check("all schema names present", all(
        n in globals() for n in [
            "BaseSchema", "ORMModel", "Page", "PageParams",
            "AdminCreate", "AdminLogin", "AdminRead", "TokenResponse",
            "CustomerCreate", "CustomerRead", "CustomerUpdate",
            "RiderCreate", "RiderRead", "RiderUpdate", "RiderLocationUpdate",
            "MenuCategoryCreate", "MenuItemCreate", "MenuItemRead",
            "OrderCreate", "OrderItemCreate", "OrderRead", "OrderTimelineRead",
            "OrderUpdate",
            "AssignRiderRequest", "DeliveryCreate", "DeliveryRead",
            "DeliveryStatusUpdate", "DeliveryWithOrderRead",
            "NotificationCreate", "NotificationRead",
        ]
    ))

    print("\n[2] Validation (valid payloads)")
    cid = sample_uuid(101)
    mid = sample_uuid(202)

    customer = CustomerCreate(name="Aisha Bello", phone="+2348061234567",
                              email="aisha@example.com")
    check("CustomerCreate", customer.name == "Aisha Bello")

    menu_item = MenuItemCreate(category_id=sample_uuid(1), name="Jollof Rice",
                               price=Decimal("3500.00"))
    check("MenuItemCreate money", menu_item.price == Decimal("3500.00"))

    order = OrderCreate(
        customer_id=cid,
        items=[{"menu_item_id": mid, "quantity": 2}],
        delivery_address="12 Wurno Road, Dutse",
        notes="No onions",
    )
    check("OrderCreate nested items", order.items[0].quantity == 2)

    delivery = DeliveryCreate(order_id=sample_uuid(5))
    check("DeliveryCreate", delivery.order_id == sample_uuid(5))

    note = NotificationCreate(
        recipient_type=NotificationRecipientType.RIDER,
        recipient_id=sample_uuid(9),
        type=NotificationType.ORDER,
        title="New order",
        message="You have a new delivery",
    )
    check("NotificationCreate polymorphic", note.recipient_type.value == "rider")

    print("\n[3] Validation (invalid payloads rejected)")
    try:
        OrderCreate(customer_id=cid, items=[], delivery_address="x")
        check("OrderCreate empty items rejected", False)
    except Exception:
        check("OrderCreate empty items rejected", True)

    try:
        MenuItemCreate(category_id=sample_uuid(1), name="x", price=Decimal("-5"))
        check("MenuItemCreate negative price rejected", False)
    except Exception:
        check("MenuItemCreate negative price rejected", True)

    try:
        AdminCreate(email="not-an-email", name="X", password="validpass123")
        check("AdminCreate bad email rejected", False)
    except Exception:
        check("AdminCreate bad email rejected", True)

    try:
        AdminCreate(email="a@b.com", name="X", password="short")
        check("AdminCreate short password rejected", False)
    except Exception:
        check("AdminCreate short password rejected", True)

    try:
        PageParams(page=0)
        check("PageParams page<1 rejected", False)
    except Exception:
        check("PageParams page<1 rejected", True)

    print("\n[4] from_attributes (ORM-style responses)")
    class FakeOrder:
        id = sample_uuid(42)
        order_number = "ORD-9999"
        customer_id = cid
        customer_name = "Aisha Bello"
        customer_phone = "+2348061234567"
        delivery_address = "12 Wurno Road, Dutse"
        subtotal = Decimal("7000.00")
        delivery_fee = Decimal("1500.00")
        total = Decimal("8500.00")
        status = OrderStatus.PENDING
        estimated_delivery = None
        notes = None
        created_at = datetime(2026, 8, 28, 12, 0, tzinfo=timezone.utc)
        updated_at = datetime(2026, 8, 28, 12, 0, tzinfo=timezone.utc)
        items = []
        timeline = []

    orm_order = OrderRead.model_validate(FakeOrder())
    check("OrderRead.model_validate", orm_order.total == Decimal("8500.00"))
    print(f"         -> order_number={orm_order.order_number}, item count={len(orm_order.items)}")

    page = Page[OrderRead](items=[orm_order], total=1, page=1, page_size=20, pages=1)
    check("Page generic envelope", page.total == 1 and page.pages == 1)

    print("\n[5] Schema JSON serialization")
    try:
        js = orm_order.model_dump_json()
        check("OrderRead.model_dump_json", '"total":8500.0' in js or '"total":8500' in js)
    except Exception as e:
        check("OrderRead.model_dump_json", False, str(e))

    print("\n" + "=" * 60)
    if FAIL:
        print(f"FAILURES: {len(FAIL)}")
        for label, detail in FAIL:
            print(f"  - {label}: {detail}")
    else:
        print("ALL SCHEMA CHECKS PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()
