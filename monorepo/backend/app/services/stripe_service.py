import stripe
from typing import Optional, List, Dict, Any
from decimal import Decimal
from app.core.config import settings


class StripeService:
    """Servicio para integración con Stripe"""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "ars",
        customer_email: Optional[str] = None,
        customer_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        payment_method_types: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Crea un PaymentIntent en Stripe.

        Args:
            amount: Monto en la moneda especificada
            currency: Código de moneda (default: ars)
            customer_email: Email del cliente
            customer_name: Nombre del cliente
            metadata: Metadata adicional (ej: order_id)
            payment_method_types: Tipos de pago permitidos

        Returns:
            PaymentIntent creado con client_secret
        """
        # Stripe maneja montos en centavos
        amount_cents = int(amount * 100)

        payment_intent_data = {
            "amount": amount_cents,
            "currency": currency.lower(),
            "automatic_payment_methods": {"enabled": True} if not payment_method_types else None,
            "payment_method_types": payment_method_types or ["card"],
        }

        if metadata:
            payment_intent_data["metadata"] = metadata

        if customer_email:
            payment_intent_data["receipt_email"] = customer_email

        # Crear o buscar customer si tenemos email
        if customer_email or customer_name:
            customer = self._get_or_create_customer(customer_email, customer_name)
            payment_intent_data["customer"] = customer.id

        payment_intent = stripe.PaymentIntent.create(**payment_intent_data)

        return {
            "id": payment_intent.id,
            "client_secret": payment_intent.client_secret,
            "amount": amount,
            "currency": currency,
            "status": payment_intent.status,
            "customer_id": payment_intent.get("customer"),
        }

    def _get_or_create_customer(
        self, email: Optional[str] = None, name: Optional[str] = None
    ) -> stripe.Customer:
        """Obtiene o crea un customer en Stripe"""
        if email:
            # Buscar customer existente por email
            customers = stripe.Customer.list(email=email, limit=1)
            if customers.data:
                return customers.data[0]

        # Crear nuevo customer
        customer_data = {}
        if email:
            customer_data["email"] = email
        if name:
            customer_data["name"] = name

        return stripe.Customer.create(**customer_data)

    def get_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Obtiene información de un PaymentIntent por su ID"""
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        return {
            "id": payment_intent.id,
            "amount": payment_intent.amount / 100,  # Convertir de centavos
            "currency": payment_intent.currency,
            "status": payment_intent.status,
            "payment_method": payment_intent.payment_method,
            "customer": payment_intent.customer,
            "metadata": payment_intent.metadata,
            "charges": payment_intent.charges.data if payment_intent.charges else [],
        }

    def confirm_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Confirma un PaymentIntent"""
        payment_intent = stripe.PaymentIntent.confirm(payment_intent_id)

        return {
            "id": payment_intent.id,
            "status": payment_intent.status,
            "amount": payment_intent.amount / 100,
        }

    def cancel_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Cancela un PaymentIntent"""
        payment_intent = stripe.PaymentIntent.cancel(payment_intent_id)

        return {
            "id": payment_intent.id,
            "status": payment_intent.status,
        }

    def create_refund(
        self, payment_intent_id: str, amount: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Crea un reembolso para un PaymentIntent.

        Args:
            payment_intent_id: ID del PaymentIntent
            amount: Monto a reembolsar (None = total)

        Returns:
            Información del reembolso
        """
        refund_data = {"payment_intent": payment_intent_id}

        if amount:
            refund_data["amount"] = int(amount * 100)  # Convertir a centavos

        refund = stripe.Refund.create(**refund_data)

        return {
            "id": refund.id,
            "amount": refund.amount / 100,
            "status": refund.status,
            "payment_intent": refund.payment_intent,
        }

    def process_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """
        Procesa un webhook de Stripe.

        Args:
            payload: Payload del webhook en bytes
            signature: Firma del webhook (header Stripe-Signature)

        Returns:
            Evento procesado
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )

            return {
                "type": event.type,
                "data": event.data.object,
                "id": event.id,
            }
        except ValueError:
            raise Exception("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise Exception("Invalid signature")

    def create_checkout_session(
        self,
        line_items: List[Dict[str, Any]],
        success_url: str,
        cancel_url: str,
        customer_email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Crea una sesión de Checkout (alternativa más simple a PaymentIntent).

        Args:
            line_items: Items del checkout
            success_url: URL de éxito
            cancel_url: URL de cancelación
            customer_email: Email del cliente
            metadata: Metadata adicional

        Returns:
            Sesión de checkout con URL
        """
        session_data = {
            "payment_method_types": ["card"],
            "line_items": line_items,
            "mode": "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
        }

        if customer_email:
            session_data["customer_email"] = customer_email

        if metadata:
            session_data["metadata"] = metadata

        session = stripe.checkout.Session.create(**session_data)

        return {
            "id": session.id,
            "url": session.url,
            "payment_intent": session.payment_intent,
        }


# Instancia singleton del servicio
stripe_service = StripeService()
