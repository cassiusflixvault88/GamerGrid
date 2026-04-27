"""
Payment Routes - Stripe Integration
Handles tips, subscriptions, and payment webhooks
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
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

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# FORCE LIVE STRIPE KEY (override Emergent's test key)
os.environ['STRIPE_API_KEY'] = '***REMOVED***'

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
    current_user: dict = Depends(verify_token)
):
    """Create Stripe checkout session for tipping"""
    try:
        # Validate package
        if request.package_id not in TIP_PACKAGES:
            raise HTTPException(400, "Invalid tip package")

        # Get amount from server-side definition (security)
        amount = TIP_PACKAGES[request.package_id]

        # Build dynamic URLs from frontend origin
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/support"

        # Initialize Stripe
        stripe_key = os.getenv('STRIPE_API_KEY')

        # DEBUG: Verify we're using LIVE key
        if not stripe_key or not stripe_key.startswith('sk_live_'):
            logger.error(f"❌ CRITICAL: Using TEST key! Key prefix: {stripe_key[:15] if stripe_key else 'NONE'}")
            raise HTTPException(500, "Stripe configuration error - contact support")

        logger.warning(f"✅ Using LIVE Stripe key: {stripe_key[:20]}...")

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
    current_user: dict = Depends(verify_token)
):
    """Create Stripe checkout session for custom tip amount"""
    try:
        # Validate amount
        if request.amount < 1.00 or request.amount > 1000.00:
            raise HTTPException(400, "Tip amount must be between $1 and $1000")

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
    current_user: dict = Depends(verify_token)
):
    """Create Stripe checkout session for Pro subscription"""
    try:
        # Check if user already has Pro
        user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "is_pro": 1})
        if user and user.get('is_pro'):
            raise HTTPException(400, "You already have a Pro subscription")

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
