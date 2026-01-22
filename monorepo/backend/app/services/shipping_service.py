"""
Servicio de integración con correos argentinos.
Soporta: Andreani, OCA, Correo Argentino

NOTA: Requiere credenciales y configuración específica de cada carrier.
Esta es una implementación base que debe ser completada con las APIs reales.
"""

import httpx
from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime
from app.core.config import settings


class ShippingCarrierAPI:
    """Clase base para integraciones con carriers"""

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def create_shipment(self, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un envío en el carrier"""
        raise NotImplementedError

    async def get_tracking(self, tracking_number: str) -> Dict[str, Any]:
        """Obtiene información de tracking"""
        raise NotImplementedError

    async def cancel_shipment(self, tracking_number: str) -> Dict[str, Any]:
        """Cancela un envío"""
        raise NotImplementedError

    async def get_label(self, tracking_number: str) -> bytes:
        """Obtiene la etiqueta de envío en PDF"""
        raise NotImplementedError


class AndreaniAPI(ShippingCarrierAPI):
    """Integración con Andreani"""

    def __init__(self):
        # Configurar con tus credenciales de Andreani
        super().__init__(
            api_key=getattr(settings, "ANDREANI_API_KEY", ""),
            base_url="https://api.andreani.com/v2"
        )

    async def create_shipment(self, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea un envío en Andreani.

        shipment_data debe contener:
        - origin: dict con dirección de origen
        - destination: dict con dirección de destino
        - package: dict con dimensiones y peso
        - value: valor declarado
        """
        endpoint = f"{self.base_url}/envios"

        payload = {
            "contrato": getattr(settings, "ANDREANI_CONTRACT", ""),
            "origen": {
                "postal": shipment_data["origin"]["postal_code"],
                "calle": shipment_data["origin"]["street"],
                "numero": shipment_data["origin"]["number"],
                "localidad": shipment_data["origin"]["city"],
                "provincia": shipment_data["origin"]["province"],
            },
            "destino": {
                "postal": shipment_data["destination"]["postal_code"],
                "calle": shipment_data["destination"]["street"],
                "numero": shipment_data["destination"]["number"],
                "localidad": shipment_data["destination"]["city"],
                "provincia": shipment_data["destination"]["province"],
                "nombreApellido": shipment_data["destination"]["name"],
                "email": shipment_data["destination"].get("email", ""),
                "celular": shipment_data["destination"].get("phone", ""),
            },
            "bultos": [
                {
                    "kilos": float(shipment_data["package"]["weight"]),
                    "alto": float(shipment_data["package"]["height"]),
                    "ancho": float(shipment_data["package"]["width"]),
                    "largo": float(shipment_data["package"]["length"]),
                    "valorDeclarado": float(shipment_data.get("value", 0)),
                }
            ],
        }

        try:
            response = await self.client.post(
                endpoint,
                json=payload,
                headers={
                    "x-authorization-token": self.api_key,
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()

            return {
                "success": True,
                "tracking_number": data.get("numeroDeEnvio"),
                "label_url": data.get("urlEtiqueta"),
                "cost": data.get("costo", 0),
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_tracking(self, tracking_number: str) -> Dict[str, Any]:
        """Obtiene el estado del envío"""
        endpoint = f"{self.base_url}/envios/{tracking_number}/trazas"

        try:
            response = await self.client.get(
                endpoint, headers={"x-authorization-token": self.api_key}
            )
            response.raise_for_status()
            data = response.json()

            # Mapear estados de Andreani a nuestros estados
            events = []
            for event in data.get("trazas", []):
                events.append(
                    {
                        "status": event.get("Estado"),
                        "description": event.get("Descripcion"),
                        "date": event.get("Fecha"),
                        "location": event.get("Sucursal"),
                    }
                )

            return {"success": True, "events": events, "current_status": events[-1] if events else None}

        except Exception as e:
            return {"success": False, "error": str(e)}


class OCAAPI(ShippingCarrierAPI):
    """Integración con OCA"""

    def __init__(self):
        super().__init__(
            api_key=getattr(settings, "OCA_API_KEY", ""),
            base_url="https://webservice.oca.com.ar"
        )

    async def create_shipment(self, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea un envío en OCA.

        NOTA: OCA usa SOAP, esta es una implementación simplificada.
        En producción deberías usar zeep o una librería SOAP.
        """
        # Implementación pendiente - OCA usa SOAP
        # Requiere configuración de zeep similar a AFIP
        return {
            "success": False,
            "error": "OCA implementation pending - requires SOAP client setup",
        }

    async def get_tracking(self, tracking_number: str) -> Dict[str, Any]:
        """Tracking de OCA"""
        # Implementación simplificada
        return {
            "success": False,
            "error": "OCA tracking implementation pending",
        }


class CorreoArgentinoAPI(ShippingCarrierAPI):
    """Integración con Correo Argentino - PAQ.AR API v2.0"""

    def __init__(self):
        from app.services.paqar_service import paqar_service
        super().__init__(
            api_key=getattr(settings, "PAQAR_API_KEY", ""),
            base_url="https://api.correoargentino.com.ar/paqar/v1"
        )
        self.paqar = paqar_service

    async def create_shipment(self, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea un envío en Correo Argentino usando PAQ.AR API v2.0

        shipment_data debe contener:
        - origin: dict con dirección de origen
        - destination: dict con dirección de destino
        - package: dict con dimensiones y peso
        - value: valor declarado
        """
        # Preparar datos para PAQ.AR
        paqar_data = {
            "recipient": {
                "name": shipment_data["destination"]["name"].split()[0] if shipment_data["destination"]["name"] else "",
                "surname": " ".join(shipment_data["destination"]["name"].split()[1:]) if len(shipment_data["destination"]["name"].split()) > 1 else "",
                "email": shipment_data["destination"].get("email", ""),
                "phone": shipment_data["destination"].get("phone", ""),
                "mobile": shipment_data["destination"].get("phone", ""),
            },
            "address": {
                "street": shipment_data["destination"]["street"],
                "number": shipment_data["destination"].get("number", "S/N"),
                "city": shipment_data["destination"]["city"],
                "province": shipment_data["destination"].get("province", ""),
                "postal_code": shipment_data["destination"]["postal_code"],
            },
            "package": shipment_data["package"],
            "value": shipment_data.get("value", 0),
            "product_type": "CP",  # Clásico Prioritario
            "modality": "P",  # Puerta a puerta
        }

        result = await self.paqar.create_order(paqar_data)

        if result["success"]:
            return {
                "success": True,
                "tracking_number": result["tracking_number"],
                "label_url": None,  # La etiqueta se obtiene con otro endpoint
                "cost": result.get("cost", 0),
                "order_id": result.get("order_id"),
                "estimated_delivery": result.get("estimated_delivery_date"),
            }
        else:
            return result

    async def get_tracking(self, tracking_number: str) -> Dict[str, Any]:
        """
        Obtiene tracking de Correo Argentino usando PAQ.AR API v2.0
        """
        result = await self.paqar.get_tracking(tracking_number=tracking_number)
        return result

    async def cancel_shipment(self, tracking_number: str) -> Dict[str, Any]:
        """
        Cancela un envío en Correo Argentino usando PAQ.AR API v2.0
        """
        result = await self.paqar.cancel_order(tracking_number)
        return result

    async def get_label(self, tracking_number: str) -> Dict[str, Any]:
        """
        Obtiene la etiqueta de envío en formato PDF usando PAQ.AR API v2.0
        """
        result = await self.paqar.get_label([tracking_number])
        return result


class ShippingService:
    """Servicio principal de envíos"""

    def __init__(self):
        self.carriers = {
            "andreani": AndreaniAPI(),
            "oca": OCAAPI(),
            "correo_argentino": CorreoArgentinoAPI(),
        }

    async def create_shipment(
        self, carrier: str, order_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea un envío con el carrier especificado.

        Args:
            carrier: "andreani", "oca", o "correo_argentino"
            order_data: Datos de la orden con dirección de envío
        """
        if carrier not in self.carriers:
            return {"success": False, "error": f"Carrier {carrier} no soportado"}

        carrier_api = self.carriers[carrier]

        # Preparar datos del envío
        shipment_data = {
            "origin": {
                "postal_code": "1000",  # Configurar con tu dirección
                "street": "Av. Corrientes",
                "number": "1234",
                "city": "CABA",
                "province": "Buenos Aires",
            },
            "destination": {
                "postal_code": order_data.get("shipping_postal_code", ""),
                "street": order_data.get("shipping_address", ""),
                "number": "",  # Extraer del shipping_address si es necesario
                "city": order_data.get("shipping_city", ""),
                "province": "",  # Agregar campo provincia en Order si es necesario
                "name": order_data.get("customer_name", ""),
                "email": order_data.get("customer_email", ""),
                "phone": order_data.get("customer_phone", ""),
            },
            "package": {
                "weight": order_data.get("weight", 1),  # kg
                "length": order_data.get("length", 30),  # cm
                "width": order_data.get("width", 20),
                "height": order_data.get("height", 10),
            },
            "value": float(order_data.get("total_amount", 0)),
        }

        result = await carrier_api.create_shipment(shipment_data)
        return result

    async def get_tracking(self, carrier: str, tracking_number: str) -> Dict[str, Any]:
        """Obtiene información de tracking"""
        if carrier not in self.carriers:
            return {"success": False, "error": f"Carrier {carrier} no soportado"}

        carrier_api = self.carriers[carrier]
        return await carrier_api.get_tracking(tracking_number)

    async def update_all_tracking(self, shipments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Actualiza el tracking de múltiples envíos.
        Útil para ejecutar como tarea programada.
        """
        results = []

        for shipment in shipments:
            carrier = shipment.get("carrier")
            tracking_number = shipment.get("tracking_number")

            if not carrier or not tracking_number:
                continue

            result = await self.get_tracking(carrier, tracking_number)
            results.append(
                {
                    "shipment_id": shipment.get("id"),
                    "tracking_number": tracking_number,
                    "result": result,
                }
            )

        return results


# Instancia singleton
shipping_service = ShippingService()
