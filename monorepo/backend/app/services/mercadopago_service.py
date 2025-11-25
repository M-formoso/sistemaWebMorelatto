import mercadopago
from typing import Optional, List, Dict, Any
from app.core.config import settings


class MercadoPagoService:
    """Servicio para integración con MercadoPago"""

    def __init__(self):
        self.sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

    def create_preference(
        self,
        items: List[Dict[str, Any]],
        payer: Optional[Dict[str, Any]] = None,
        external_reference: Optional[str] = None,
        notification_url: Optional[str] = None,
        back_urls: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Crea una preferencia de pago en MercadoPago.

        Args:
            items: Lista de items a pagar. Cada item debe tener:
                   - title: str
                   - quantity: int
                   - unit_price: float
                   - currency_id: str (default: ARS)
            payer: Datos del pagador (opcional)
            external_reference: Referencia externa (ej: order_id)
            notification_url: URL para webhooks
            back_urls: URLs de retorno (success, failure, pending)

        Returns:
            Respuesta de MercadoPago con init_point para checkout
        """
        preference_data = {
            "items": [
                {
                    "title": item.get("title", "Producto"),
                    "quantity": item.get("quantity", 1),
                    "unit_price": float(item.get("unit_price", 0)),
                    "currency_id": item.get("currency_id", "ARS"),
                }
                for item in items
            ],
            "auto_return": "approved",
        }

        if payer:
            preference_data["payer"] = {
                "name": payer.get("name", ""),
                "surname": payer.get("surname", ""),
                "email": payer.get("email", ""),
                "phone": {
                    "area_code": payer.get("phone_area_code", ""),
                    "number": payer.get("phone_number", "")
                } if payer.get("phone_number") else {},
                "address": {
                    "street_name": payer.get("street_name", ""),
                    "street_number": payer.get("street_number", ""),
                    "zip_code": payer.get("zip_code", "")
                } if payer.get("street_name") else {}
            }

        if external_reference:
            preference_data["external_reference"] = external_reference

        if notification_url:
            preference_data["notification_url"] = notification_url
        elif settings.MERCADOPAGO_WEBHOOK_URL:
            preference_data["notification_url"] = settings.MERCADOPAGO_WEBHOOK_URL

        if back_urls:
            preference_data["back_urls"] = back_urls
        elif settings.MERCADOPAGO_SUCCESS_URL:
            preference_data["back_urls"] = {
                "success": settings.MERCADOPAGO_SUCCESS_URL,
                "failure": settings.MERCADOPAGO_FAILURE_URL,
                "pending": settings.MERCADOPAGO_PENDING_URL,
            }

        # Configuraciones adicionales
        preference_data["statement_descriptor"] = "MORELATTO LANAS"
        preference_data["binary_mode"] = False  # Permite pagos pendientes

        preference_response = self.sdk.preference().create(preference_data)

        if preference_response["status"] != 201:
            raise Exception(f"Error al crear preferencia: {preference_response}")

        return preference_response["response"]

    def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """Obtiene información de un pago por su ID"""
        payment_response = self.sdk.payment().get(payment_id)

        if payment_response["status"] != 200:
            raise Exception(f"Error al obtener pago: {payment_response}")

        return payment_response["response"]

    def get_merchant_order(self, merchant_order_id: str) -> Dict[str, Any]:
        """Obtiene información de una orden de comercio"""
        order_response = self.sdk.merchant_order().get(merchant_order_id)

        if order_response["status"] != 200:
            raise Exception(f"Error al obtener orden: {order_response}")

        return order_response["response"]

    def process_webhook(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Procesa una notificación webhook de MercadoPago.

        Args:
            data: Datos del webhook

        Returns:
            Información procesada del pago
        """
        topic = data.get("topic") or data.get("type")
        resource_id = data.get("data", {}).get("id") or data.get("id")

        if topic == "payment":
            return self.get_payment(resource_id)
        elif topic == "merchant_order":
            return self.get_merchant_order(resource_id)

        return {"topic": topic, "id": resource_id}

    def refund_payment(self, payment_id: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """
        Realiza un reembolso de un pago.

        Args:
            payment_id: ID del pago a reembolsar
            amount: Monto a reembolsar (None = total)

        Returns:
            Respuesta del reembolso
        """
        refund_data = {}
        if amount:
            refund_data["amount"] = amount

        refund_response = self.sdk.refund().create(payment_id, refund_data)

        if refund_response["status"] not in [200, 201]:
            raise Exception(f"Error al crear reembolso: {refund_response}")

        return refund_response["response"]


# Instancia singleton del servicio
mercadopago_service = MercadoPagoService()
