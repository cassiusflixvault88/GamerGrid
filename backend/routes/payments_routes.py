"""
Payment Routes - Stripe Integration
Handles tips, subscriptions, and payment webhooks
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import logging
import os
from pydantic import BaseModel

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest
)

from auth import verify_token
from routes.analytics_routes import _real_ip, _geo_lookup

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/payments", tags=["payments"])

# Fixed payment packages (NEVER accept amounts from frontend)
TIP_PACKAGES = {
    "small": 1.00,
    "medium": 5.00,
    "large": 10.00,
    "huge": 20.00
}

PRO_SUBSCRIPTION_PRICE = 4.99  # $4.99/month

# Pydantic Models
class CheckoutRequest(BaseModel):
    package_id: str  # "small", "medium", "large", "huge"
    payment_type: str  # "tip" or "subscription"
    origin_url: str  # Frontend origin for success/cancel URLs

class CustomTipRequest(BaseModel):
    amount: float  # For custom tip amounts
    origin_url: str

# ============= TIP ENDPOINTS =============

@router.post("/tip/checkout")
async def create_tip_checkout(
    request: CheckoutRequest,
    http_request: Request,
    current_user: dict = Depends(verify_token)
):
    """Create Stripe checkout session for tipping"""
    try:
        # Validate package
        if request.package_id not in TIP_PACKAGES:
            raise HTTPException(400, "Invalid tip package")

        # Get amount from server-side definition (security)
        amount = TIP_PACKAGES[request.package_id]

        # Capture client IP for geolocation enrichment
        client_ip = _real_ip(http_request)

        # Build dynamic URLs from frontend origin
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/support"

        # Initialize Stripe
        stripe_key = os.getenv('STRIPE_API_KEY')

        # DEBUG: Verify we're using LIVE key
        if not stripe_key or not stripe_key.startswith('sk_live_'):
            logger.error("CRITICAL: Stripe key missing or not a live key")
            raise HTTPException(500, "Stripe configuration error - contact support")

        logger.info("Stripe LIVE key in use")

        webhook_url = f"{request.origin_url}/api/payments/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)

        # Create checkout session
        checkout_req = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user['user_id'],
                "payment_type": "tip",
                "package": request.package_id
            }
        )

        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)

        # Create pending transaction record
        transaction = {
            "session_id": session.session_id,
            "user_id": current_user['user_id'],
            "amount": amount,
            "currency": "usd",
            "payment_type": "tip",
            "package": request.package_id,
            "payment_status": "pending",
            "status": "initiated",
            "client_ip": client_ip,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.payment_transactions.insert_one(transaction)
        logger.info(f"Tip checkout created: {session.session_id} for ${amount}")

        return {"url": session.url, "session_id": session.session_id}

    except Exception as e:
        logger.error(f"Error creating tip checkout: {e}")
        raise HTTPException(500, f"Failed to create checkout: {str(e)}")


@router.post("/tip/custom")
async def create_custom_tip_checkout(
    request: CustomTipRequest,
    http_request: Request,
    current_user: dict = Depends(verify_token)
):
    """Create Stripe checkout session for custom tip amount"""
    try:
        # Validate amount
        if request.amount < 1.00 or request.amount > 1000.00:
            raise HTTPException(400, "Tip amount must be between $1 and $1000")

        # Capture client IP for geolocation enrichment
        client_ip = _real_ip(http_request)

        # Build dynamic URLs
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/support"

        # Initialize Stripe
        stripe_key = os.getenv('STRIPE_API_KEY')
        webhook_url = f"{request.origin_url}/api/payments/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)

        # Create checkout session
        checkout_req = CheckoutSessionRequest(
            amount=request.amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user['user_id'],
                "payment_type": "custom_tip"
            }
        )

        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)

        # Create pending transaction record
        transaction = {
            "session_id": session.session_id,
            "user_id": current_user['user_id'],
            "amount": request.amount,
            "currency": "usd",
            "payment_type": "custom_tip",
            "payment_status": "pending",
            "status": "initiated",
            "client_ip": client_ip,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.payment_transactions.insert_one(transaction)
        logger.info(f"Custom tip checkout created: {session.session_id} for ${request.amount}")

        return {"url": session.url, "session_id": session.session_id}

    except Exception as e:
        logger.error(f"Error creating custom tip checkout: {e}")
        raise HTTPException(500, f"Failed to create checkout: {str(e)}")


# ============= SUBSCRIPTION ENDPOINTS =============

@router.post("/subscription/checkout")
async def create_subscription_checkout(
    request: CheckoutRequest,
    http_request: Request,
    current_user: dict = Depends(verify_token)
):
    """Create Stripe checkout session for Pro subscription"""
    try:
        # Check if user already has Pro
        user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "is_pro": 1})
        if user and user.get('is_pro'):
            raise HTTPException(400, "You already have a Pro subscription")

        # Capture client IP for geolocation enrichment
        client_ip = _real_ip(http_request)

        # Build dynamic URLs
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/settings"

        # Initialize Stripe
        stripe_key = os.getenv('STRIPE_API_KEY')
        webhook_url = f"{request.origin_url}/api/payments/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)

        # Create checkout session
        checkout_req = CheckoutSessionRequest(
            amount=PRO_SUBSCRIPTION_PRICE,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user['user_id'],
                "payment_type": "pro_subscription"
            }
        )

        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)

        # Create pending transaction record
        transaction = {
            "session_id": session.session_id,
            "user_id": current_user['user_id'],
            "amount": PRO_SUBSCRIPTION_PRICE,
            "currency": "usd",
            "payment_type": "pro_subscription",
            "payment_status": "pending",
            "status": "initiated",
            "client_ip": client_ip,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.payment_transactions.insert_one(transaction)
        logger.info(f"Pro subscription checkout created: {session.session_id}")

        return {"url": session.url, "session_id": session.session_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription checkout: {e}")
        raise HTTPException(500, f"Failed to create checkout: {str(e)}")


# ============= PAYMENT STATUS =============

@router.get("/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    current_user: dict = Depends(verify_token)
):
    """Poll payment status for a checkout session"""
    try:
        # Initialize Stripe
        stripe_key = os.getenv('STRIPE_API_KEY')
        stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")

        # Get status from Stripe
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

        # Find transaction in database
        transaction = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )

        if not transaction:
            raise HTTPException(404, "Transaction not found")

        # Check if already processed
        if transaction.get('payment_status') == 'paid':
            return {
                "status": "success",
                "payment_status": "paid",
                "message": "Payment already processed",
                **checkout_status.model_dump()
            }

        # Update transaction status
        if checkout_status.payment_status == "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "completed",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "amount_total": checkout_status.amount_total / 100,  # Convert from cents
                }}
            )

            # Grant Pro access if subscription payment
            if transaction.get('payment_type') in ['pro_subscription']:
                await db.users.update_one(
                    {"id": transaction['user_id']},
                    {"$set": {
                        "is_pro": True,
                        "pro_since": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"User {transaction['user_id']} upgraded to Pro")
                # Award referral credit if this user was referred (best-effort)
                try:
                    from routes.referrals_routes import award_referral_pro_credit
                    await award_referral_pro_credit(transaction['user_id'])
                except Exception as e:
                    logger.warning(f"Referral credit award failed: {e}")

            logger.info(f"Payment completed: {session_id}")

        elif checkout_status.status == "expired":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "expired",
                    "status": "expired"
                }}
            )

        return {
            "status": "success" if checkout_status.payment_status == "paid" else checkout_status.status,
            **checkout_status.model_dump()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        raise HTTPException(500, f"Failed to check status: {str(e)}")


# ============= WEBHOOK =============

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for payment confirmations"""
    try:
        # Get raw body and signature
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")

        if not signature:
            raise HTTPException(400, "Missing Stripe signature")

        # Initialize Stripe
        stripe_key = os.getenv('STRIPE_API_KEY')
        stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")

        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)

        logger.info(f"Webhook received: {webhook_response.event_type}")

        # Process successful payment
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id

            # Update transaction
            transaction = await db.payment_transactions.find_one({"session_id": session_id})

            if transaction and transaction.get('payment_status') != 'paid':
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "completed",
                        "webhook_received_at": datetime.now(timezone.utc).isoformat()
                    }}
                )

                # Grant Pro access if needed
                if transaction.get('payment_type') == 'pro_subscription':
                    await db.users.update_one(
                        {"id": transaction['user_id']},
                        {"$set": {
                            "is_pro": True,
                            "pro_since": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    # Award referral credit if this user was referred
                    try:
                        from routes.referrals_routes import award_referral_pro_credit
                        await award_referral_pro_credit(transaction['user_id'])
                    except Exception as e:
                        logger.warning(f"Referral credit award failed (webhook): {e}")

                # 🔔 LOG PAYMENT NOTIFICATION
                payment_type = transaction.get('payment_type', 'unknown')
                amount = transaction.get('amount', 0)
                logger.warning(f"💰 PAYMENT RECEIVED: ${amount} ({payment_type}) - Session: {session_id}")
                print(f"\n{'='*60}")
                print("💰💰💰 NEW PAYMENT RECEIVED 💰💰💰")
                print(f"Amount: ${amount}")
                print(f"Type: {payment_type}")
                print(f"Session ID: {session_id}")
                print(f"{'='*60}\n")

                logger.info(f"Webhook processed payment: {session_id}")

        return {"status": "success"}

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(500, str(e))


# ============= ADMIN REVENUE DASHBOARD =============

@router.get("/admin/revenue")
async def get_revenue_stats(current_user: dict = Depends(verify_token)):
    """Admin: Get revenue statistics"""
    # Verify admin
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "is_admin": 1})
    if not user or not user.get('is_admin'):
        raise HTTPException(403, "Admin access required")

    # Get all completed transactions
    transactions = await db.payment_transactions.find(
        {"payment_status": "paid"},
        {"_id": 0}
    ).to_list(10000)

    # Calculate stats
    total_revenue = sum(t.get('amount', 0) for t in transactions)
    total_tips = sum(t.get('amount', 0) for t in transactions if 'tip' in t.get('payment_type', ''))
    total_subscriptions = sum(t.get('amount', 0) for t in transactions if t.get('payment_type') == 'pro_subscription')

    pro_users_count = await db.users.count_documents({"is_pro": True})

    return {
        "total_revenue": round(total_revenue, 2),
        "total_tips": round(total_tips, 2),
        "total_subscriptions": round(total_subscriptions, 2),
        "pro_users": pro_users_count,
        "total_transactions": len(transactions),
        "recent_transactions": sorted(
            transactions,
            key=lambda x: x.get('created_at', ''),
            reverse=True
        )[:10]
    }


@router.get("/check-recent")
async def check_recent_payments():
    """Quick check for recent payments (no auth required for testing)"""
    # Get last 5 transactions
    transactions = await db.payment_transactions.find(
        {},
        {"_id": 0, "amount": 1, "payment_status": 1, "payment_type": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)

    return {
        "total_found": len(transactions),
        "recent_payments": transactions
    }



# ============= TIPS FEED (Admin + Public) =============

async def _enrich_tip_with_geo(tx: dict) -> dict:
    """Resolve client_ip → city/country (uses ip_geo_cache; never raises)."""
    ip = tx.get("client_ip") or ""
    if not ip:
        return {**tx, "country": "", "country_code": "", "city": ""}
    try:
        geo = await _geo_lookup(ip)
        return {
            **tx,
            "country": geo.get("country") or "",
            "country_code": geo.get("country_code") or "",
            "city": geo.get("city") or "",
        }
    except Exception:
        return {**tx, "country": "", "country_code": "", "city": ""}


async def _reconcile_pending_payments() -> int:
    """Query Stripe for any pending transactions and update them if paid.
    Catches payments where the user closed the browser before PaymentSuccessPage
    finished polling, OR where Stripe webhooks aren't configured. Runs every
    time an admin opens the tips feed. Returns count of recovered payments."""
    stripe_key = os.getenv('STRIPE_API_KEY')
    if not stripe_key:
        return 0

    cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    pendings = await db.payment_transactions.find(
        {"payment_status": "pending", "created_at": {"$gte": cutoff}},
        {"_id": 0, "session_id": 1, "user_id": 1, "payment_type": 1, "amount": 1},
    ).limit(50).to_list(50)

    if not pendings:
        return 0

    recovered = 0
    try:
        sc = StripeCheckout(api_key=stripe_key, webhook_url="")
    except Exception as e:
        logger.warning(f"Reconcile: cannot init StripeCheckout: {e}")
        return 0

    for tx in pendings:
        sid = tx.get("session_id")
        if not sid:
            continue
        try:
            status = await sc.get_checkout_status(sid)
            if status.payment_status == "paid":
                await db.payment_transactions.update_one(
                    {"session_id": sid},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "completed",
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                        "amount_total": (status.amount_total or 0) / 100,
                        "reconciled": True,
                    }},
                )
                # Grant Pro if subscription payment
                if tx.get("payment_type") == "pro_subscription":
                    await db.users.update_one(
                        {"id": tx.get("user_id")},
                        {"$set": {
                            "is_pro": True,
                            "pro_since": datetime.now(timezone.utc).isoformat(),
                        }},
                    )
                    try:
                        from routes.referrals_routes import award_referral_pro_credit
                        await award_referral_pro_credit(tx.get("user_id"))
                    except Exception:
                        pass
                recovered += 1
                logger.info(f"💰 Reconciled payment: {sid} (${tx.get('amount')})")
            elif getattr(status, "status", "") == "expired":
                await db.payment_transactions.update_one(
                    {"session_id": sid},
                    {"$set": {"payment_status": "expired", "status": "expired"}},
                )
        except Exception as e:
            logger.debug(f"Reconcile skip for {sid}: {e}")

    return recovered


@router.get("/admin/tips-feed")
async def admin_tips_feed(
    limit: int = 50,
    current_user: dict = Depends(verify_token),
):
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "is_admin": 1})
    if not user or not user.get('is_admin'):
        raise HTTPException(403, "Admin access required")

    # First: reconcile any pending payments that actually succeeded on Stripe.
    # This catches payments where the user's browser closed before the success
    # page could poll, OR where Stripe webhooks aren't configured in the dashboard.
    recovered = await _reconcile_pending_payments()

    limit = max(1, min(int(limit or 50), 200))

    txs = await db.payment_transactions.find(
        {
            "$or": [
                {"payment_status": "paid"},
                {"status": "completed"},
            ],
            "payment_type": {"$in": ["tip", "custom_tip", "pro_subscription"]},
        },
        {"_id": 0, "session_id": 1, "user_id": 1, "amount": 1, "payment_type": 1,
         "package": 1, "client_ip": 1, "created_at": 1, "paid_at": 1, "amount_total": 1,
         "payment_status": 1, "status": 1},
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Bulk-fetch users for display name lookup
    user_ids = list({t["user_id"] for t in txs if t.get("user_id")})
    users_by_id = {}
    if user_ids:
        async for u in db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "username": 1, "display_name": 1, "profile_picture_url": 1},
        ):
            users_by_id[u["id"]] = u

    feed = []
    totals = {"tips": 0.0, "subs": 0.0, "count": 0}
    for t in txs:
        amt = float(t.get("amount") or t.get("amount_total") or 0)
        ptype = t.get("payment_type", "tip")
        u = users_by_id.get(t.get("user_id"), {})
        enriched = await _enrich_tip_with_geo(t)
        feed.append({
            "session_id": t.get("session_id"),
            "amount": round(amt, 2),
            "payment_type": ptype,
            "package": t.get("package"),
            "user_id": t.get("user_id"),
            "username": u.get("username") or "Anonymous",
            "display_name": u.get("display_name") or u.get("username") or "Anonymous",
            "avatar": u.get("profile_picture_url"),
            "country": enriched.get("country", ""),
            "country_code": enriched.get("country_code", ""),
            "city": enriched.get("city", ""),
            "created_at": t.get("paid_at") or t.get("created_at"),
        })
        totals["count"] += 1
        if "tip" in ptype:
            totals["tips"] += amt
        elif ptype == "pro_subscription":
            totals["subs"] += amt

    return {
        "tips": feed,
        "totals": {
            "tips": round(totals["tips"], 2),
            "subs": round(totals["subs"], 2),
            "all": round(totals["tips"] + totals["subs"], 2),
            "count": totals["count"],
        },
        "recovered": recovered,
    }


@router.get("/recent-public")
async def recent_public_tips(limit: int = 5):
    """Public anonymized recent tips for the homepage social-proof ticker.
    Returns first letter of username + city + amount + relative time."""
    limit = max(1, min(int(limit or 5), 15))
    txs = await db.payment_transactions.find(
        {"$or": [
            {"payment_status": "paid"},
            {"status": "completed"},
        ], "payment_type": {"$in": ["tip", "custom_tip", "pro_subscription"]}},
        {"_id": 0, "user_id": 1, "amount": 1, "payment_type": 1, "client_ip": 1, "created_at": 1, "paid_at": 1},
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Bulk-fetch users for display name initial
    user_ids = list({t["user_id"] for t in txs if t.get("user_id")})
    users_by_id = {}
    if user_ids:
        async for u in db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "username": 1, "display_name": 1},
        ):
            users_by_id[u["id"]] = u

    items = []
    for t in txs:
        u = users_by_id.get(t.get("user_id"), {})
        name = u.get("display_name") or u.get("username") or "A gamer"
        # Anonymize: first name token only
        first_token = name.split()[0] if name else "A gamer"
        enriched = await _enrich_tip_with_geo(t)
        location = ""
        if enriched.get("city") and enriched.get("country_code"):
            location = f"{enriched['city']}, {enriched['country_code']}"
        elif enriched.get("country"):
            location = enriched["country"]
        items.append({
            "name": first_token,
            "amount": round(float(t.get("amount") or 0), 2),
            "payment_type": t.get("payment_type", "tip"),
            "location": location,
            "created_at": t.get("paid_at") or t.get("created_at"),
        })
    return {"items": items}



# Admin diagnostic: see EVERY transaction regardless of status.
# Useful for debugging cases like "Stripe says paid but dashboard says nothing".
@router.get("/admin/all-transactions")
async def admin_all_transactions(
    limit: int = 50,
    current_user: dict = Depends(verify_token),
):
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "is_admin": 1})
    if not user or not user.get('is_admin'):
        raise HTTPException(403, "Admin access required")
    limit = max(1, min(int(limit or 50), 200))
    txs = await db.payment_transactions.find(
        {},
        {"_id": 0, "session_id": 1, "user_id": 1, "amount": 1, "payment_type": 1,
         "payment_status": 1, "status": 1, "client_ip": 1, "created_at": 1, "paid_at": 1,
         "reconciled": 1},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"count": len(txs), "transactions": txs}
