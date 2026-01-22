"""
Servicio de integración con PAQ.AR - Correo Argentino API v2.0
Documentación: API PAQ.AR v2.0

Endpoint TEST: https://apitest.correoargentino.com.ar/paqar/v1/
Endpoint PROD: https://api.correoargentino.com.ar/paqar/v1/
"""

import httpx
from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime
import base64
from app.core.config import settings


class PaqArService:
    """Cliente para la API PAQ.AR de Correo Argentino"""

    def __init__(self):
        self.api_key = getattr(settings, "PAQAR_API_KEY", "")
        self.agreement = getattr(settings, "PAQAR_AGREEMENT_ID", "")
        self.production = getattr(settings, "PAQAR_PRODUCTION", False)

        # Seleccionar URL según ambiente
        if self.production:
            self.base_url = "https://api.correoargentino.com.ar/paqar/v1"
        else:
            self.base_url = "https://apitest.correoargentino.com.ar/paqar/v1"

        self.client = httpx.AsyncClient(timeout=30.0)

    def _get_headers(self) -> Dict[str, str]:
        """Genera los headers de autenticación para la API"""
        return {
            "Authorization": f"Apikey {self.api_key}",
            "agreement": self.agreement,
            "Content-Type": "application/json"
        }

    async def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea una orden de envío en PAQ.AR

        POST /v1/orders

        Args:
            order_data: Debe contener:
                - recipient: dict con datos del destinatario
                - address: dict con dirección completa
                - package: dict con dimensiones y peso
                - value: valor declarado

        Returns:
            Dict con tracking_number, cost, estimated_delivery, etc.
        """
        endpoint = f"{self.base_url}/orders"

        # Preparar payload según especificación PAQ.AR
        payload = {
            "destinatario": {
                "nombre": order_data["recipient"]["name"],
                "apellido": order_data["recipient"].get("surname", ""),
                "email": order_data["recipient"].get("email", ""),
                "telefono": order_data["recipient"].get("phone", ""),
                "celular": order_data["recipient"].get("mobile", order_data["recipient"].get("phone", "")),
                "tipodoc": order_data["recipient"].get("doc_type", "DNI"),
                "nrodoc": order_data["recipient"].get("doc_number", ""),
            },
            "domicilio": {
                "calle": order_data["address"]["street"],
                "numero": order_data["address"].get("number", "S/N"),
                "piso": order_data["address"].get("floor", ""),
                "depto": order_data["address"].get("apartment", ""),
                "localidad": order_data["address"]["city"],
                "provincia": order_data["address"]["province"],
                "codigopostal": order_data["address"]["postal_code"],
                "entrecalles": order_data["address"].get("between_streets", ""),
            },
            "paquete": {
                "peso": float(order_data["package"]["weight"]),  # kg
                "largo": float(order_data["package"]["length"]),  # cm
                "alto": float(order_data["package"]["height"]),  # cm
                "ancho": float(order_data["package"]["width"]),  # cm
                "volumen": float(
                    order_data["package"]["length"] *
                    order_data["package"]["width"] *
                    order_data["package"]["height"]
                ) / 1000000,  # m³
            },
            "valordeclarado": float(order_data.get("value", 0)),
            "sucursalorigen": order_data.get("origin_branch", ""),
            "sucursaldestino": order_data.get("destination_branch", ""),
            "admiteparcial": order_data.get("allow_partial", False),
            "producto": order_data.get("product_type", "CP"),  # CP = Clasico Prioritario
            "modalidad": order_data.get("modality", "P"),  # P = Puerta a puerta, S = Sucursal
        }

        try:
            response = await self.client.post(
                endpoint,
                json=payload,
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()

            return {
                "success": True,
                "tracking_number": data.get("numeroseguimiento"),
                "order_id": data.get("idorden"),
                "cost": data.get("costo", 0),
                "estimated_delivery_date": data.get("fechaentregaestimada"),
                "branch": data.get("sucursal"),
                "raw_response": data
            }

        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else str(e)
            return {
                "success": False,
                "error": f"Error HTTP {e.response.status_code}",
                "detail": error_detail
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def cancel_order(self, tracking_number: str) -> Dict[str, Any]:
        """
        Cancela una orden de envío

        PATCH /v1/orders/{trackingNumber}/cancel

        Args:
            tracking_number: Número de seguimiento de la orden

        Returns:
            Dict con resultado de la cancelación
        """
        endpoint = f"{self.base_url}/orders/{tracking_number}/cancel"

        try:
            response = await self.client.patch(
                endpoint,
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()

            return {
                "success": True,
                "message": "Orden cancelada exitosamente",
                "tracking_number": tracking_number,
                "raw_response": data
            }

        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else str(e)
            return {
                "success": False,
                "error": f"Error HTTP {e.response.status_code}",
                "detail": error_detail
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_label(self, tracking_numbers: List[str]) -> Dict[str, Any]:
        """
        Obtiene las etiquetas de envío en formato PDF

        POST /v1/labels

        Args:
            tracking_numbers: Lista de números de seguimiento

        Returns:
            Dict con PDF en base64
        """
        endpoint = f"{self.base_url}/labels"

        payload = {
            "numerosseguimiento": tracking_numbers
        }

        try:
            response = await self.client.post(
                endpoint,
                json=payload,
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()

            # El PDF viene en base64
            pdf_base64 = data.get("etiqueta", "")

            return {
                "success": True,
                "pdf_base64": pdf_base64,
                "tracking_numbers": tracking_numbers,
                "raw_response": data
            }

        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else str(e)
            return {
                "success": False,
                "error": f"Error HTTP {e.response.status_code}",
                "detail": error_detail
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def save_label_to_file(self, tracking_numbers: List[str], file_path: str) -> Dict[str, Any]:
        """
        Descarga y guarda la etiqueta en un archivo PDF

        Args:
            tracking_numbers: Lista de números de seguimiento
            file_path: Ruta donde guardar el PDF

        Returns:
            Dict con resultado de la operación
        """
        result = await self.get_label(tracking_numbers)

        if not result["success"]:
            return result

        try:
            # Decodificar base64 y guardar
            pdf_bytes = base64.b64decode(result["pdf_base64"])

            with open(file_path, "wb") as f:
                f.write(pdf_bytes)

            return {
                "success": True,
                "file_path": file_path,
                "tracking_numbers": tracking_numbers
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error al guardar PDF: {str(e)}"
            }

    async def get_tracking(
        self,
        tracking_number: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtiene información de tracking de envíos

        GET /v1/tracking

        Args:
            tracking_number: Número de seguimiento específico (opcional)
            start_date: Fecha inicio en formato YYYY-MM-DD (opcional)
            end_date: Fecha fin en formato YYYY-MM-DD (opcional)
            status: Estado del envío (opcional)

        Returns:
            Dict con eventos de tracking
        """
        endpoint = f"{self.base_url}/tracking"

        # Construir query parameters
        params = {}
        if tracking_number:
            params["numeroseguimiento"] = tracking_number
        if start_date:
            params["fechadesde"] = start_date
        if end_date:
            params["fechahasta"] = end_date
        if status:
            params["estado"] = status

        try:
            response = await self.client.get(
                endpoint,
                params=params,
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()

            # Procesar eventos de tracking
            events = []
            tracking_data = data.get("seguimientos", [])

            for item in tracking_data:
                eventos = item.get("eventos", [])
                for evento in eventos:
                    events.append({
                        "status": evento.get("estado"),
                        "description": evento.get("descripcion"),
                        "date": evento.get("fecha"),
                        "location": evento.get("sucursal", ""),
                        "observation": evento.get("observacion", "")
                    })

            # Obtener el estado más reciente
            current_status = events[-1] if events else None

            return {
                "success": True,
                "tracking_number": tracking_number,
                "events": events,
                "current_status": current_status,
                "raw_response": data
            }

        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else str(e)
            return {
                "success": False,
                "error": f"Error HTTP {e.response.status_code}",
                "detail": error_detail
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_agencies(
        self,
        postal_code: Optional[str] = None,
        province: Optional[str] = None,
        city: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtiene lista de sucursales/agencias disponibles

        GET /v1/agencies

        Args:
            postal_code: Código postal (opcional)
            province: Provincia (opcional)
            city: Localidad (opcional)

        Returns:
            Dict con lista de agencias
        """
        endpoint = f"{self.base_url}/agencies"

        params = {}
        if postal_code:
            params["codigopostal"] = postal_code
        if province:
            params["provincia"] = province
        if city:
            params["localidad"] = city

        try:
            response = await self.client.get(
                endpoint,
                params=params,
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()

            # Procesar lista de agencias
            agencies = []
            for agency in data.get("sucursales", []):
                agencies.append({
                    "code": agency.get("codigo"),
                    "name": agency.get("nombre"),
                    "address": agency.get("domicilio"),
                    "city": agency.get("localidad"),
                    "province": agency.get("provincia"),
                    "postal_code": agency.get("codigopostal"),
                    "phone": agency.get("telefono"),
                    "schedule": agency.get("horario"),
                    "latitude": agency.get("latitud"),
                    "longitude": agency.get("longitud")
                })

            return {
                "success": True,
                "agencies": agencies,
                "total": len(agencies),
                "raw_response": data
            }

        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else str(e)
            return {
                "success": False,
                "error": f"Error HTTP {e.response.status_code}",
                "detail": error_detail
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def close(self):
        """Cierra el cliente HTTP"""
        await self.client.aclose()


# Instancia singleton
paqar_service = PaqArService()
