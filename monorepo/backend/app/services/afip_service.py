"""
Servicio de Facturación Electrónica AFIP (ARCA)
Implementación directa usando zeep para webservices SOAP
Soporta Factura C para Monotributistas
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os
import base64
import hashlib

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography.hazmat.backends import default_backend
from lxml import etree
from zeep import Client
from zeep.transports import Transport
import requests

from app.core.config import settings


class AFIPService:
    """
    Servicio para emitir facturas electrónicas a través de AFIP.
    Implementación directa con zeep (sin pyafipws).
    Soporta Factura C (Monotributo).
    """

    def __init__(self):
        self.cuit = settings.AFIP_CUIT
        self.cert_path = settings.AFIP_CERT_PATH
        self.key_path = settings.AFIP_KEY_PATH
        self.production = settings.AFIP_PRODUCTION
        self.punto_venta = settings.AFIP_PUNTO_VENTA

        self._wsfe_client = None
        self._token = None
        self._sign = None
        self._token_expiration = None

    def _get_wsdl_urls(self) -> Dict[str, str]:
        """Retorna las URLs de los webservices según el ambiente"""
        if self.production:
            return {
                "wsaa": "https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL",
                "wsfe": "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"
            }
        else:
            return {
                "wsaa": "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL",
                "wsfe": "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
            }

    def _create_tra(self, service: str = "wsfe") -> str:
        """Crea el Ticket de Requerimiento de Acceso (TRA)"""
        now = datetime.utcnow()
        expiration = now + timedelta(hours=12)

        tra = f'''<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
    <header>
        <uniqueId>{int(now.timestamp())}</uniqueId>
        <generationTime>{now.strftime("%Y-%m-%dT%H:%M:%S")}</generationTime>
        <expirationTime>{expiration.strftime("%Y-%m-%dT%H:%M:%S")}</expirationTime>
    </header>
    <service>{service}</service>
</loginTicketRequest>'''
        return tra

    def _sign_tra(self, tra: str) -> str:
        """Firma el TRA con el certificado y clave privada"""
        # Leer certificado
        with open(self.cert_path, "rb") as f:
            cert_pem = f.read()
        cert = x509.load_pem_x509_certificate(cert_pem, default_backend())

        # Leer clave privada
        with open(self.key_path, "rb") as f:
            key_pem = f.read()
        private_key = serialization.load_pem_private_key(key_pem, password=None, backend=default_backend())

        # Firmar con PKCS7
        tra_bytes = tra.encode('utf-8')
        signed = pkcs7.PKCS7SignatureBuilder().set_data(
            tra_bytes
        ).add_signer(
            cert, private_key, hashes.SHA256()
        ).sign(
            serialization.Encoding.DER, [pkcs7.PKCS7Options.Binary]
        )

        return base64.b64encode(signed).decode('utf-8')

    def _authenticate(self):
        """Autentica con AFIP usando WSAA"""
        # Verificar si ya tenemos un token válido
        if self._token and self._token_expiration:
            if datetime.utcnow() < self._token_expiration:
                return

        if not self.cuit or not self.cert_path or not self.key_path:
            raise ValueError(
                "Configuración de AFIP incompleta. "
                "Configura AFIP_CUIT, AFIP_CERT_PATH y AFIP_KEY_PATH en el .env"
            )

        if not os.path.exists(self.cert_path):
            raise FileNotFoundError(f"Certificado no encontrado: {self.cert_path}")

        if not os.path.exists(self.key_path):
            raise FileNotFoundError(f"Clave privada no encontrada: {self.key_path}")

        urls = self._get_wsdl_urls()

        # Crear y firmar TRA
        tra = self._create_tra("wsfe")
        cms = self._sign_tra(tra)

        # Conectar al WSAA
        session = requests.Session()
        session.verify = True
        transport = Transport(session=session)
        wsaa_client = Client(urls["wsaa"], transport=transport)

        # Solicitar ticket de acceso
        response = wsaa_client.service.loginCms(cms)

        # Parsear respuesta
        root = etree.fromstring(response.encode('utf-8'))
        self._token = root.find('.//token').text
        self._sign = root.find('.//sign').text
        expiration_str = root.find('.//expirationTime').text
        self._token_expiration = datetime.fromisoformat(expiration_str.replace('Z', '+00:00'))

        # Conectar al WSFE
        self._wsfe_client = Client(urls["wsfe"], transport=transport)

    def _get_auth(self) -> Dict[str, Any]:
        """Retorna el diccionario de autenticación para WSFE"""
        self._authenticate()
        return {
            'Token': self._token,
            'Sign': self._sign,
            'Cuit': int(self.cuit)
        }

    def get_last_invoice_number(self, tipo_cbte: int = 11) -> int:
        """
        Obtiene el último número de comprobante autorizado.

        Args:
            tipo_cbte: Tipo de comprobante (11 = Factura C)

        Returns:
            Último número de comprobante
        """
        auth = self._get_auth()

        response = self._wsfe_client.service.FECompUltimoAutorizado(
            Auth=auth,
            PtoVta=self.punto_venta,
            CbteTipo=tipo_cbte
        )

        if response.Errors:
            error_msg = "; ".join([e.Msg for e in response.Errors.Err])
            raise Exception(f"Error AFIP: {error_msg}")

        return response.CbteNro or 0

    def create_invoice(
        self,
        tipo_cbte: int = 11,  # 11 = Factura C
        concepto: int = 1,    # 1 = Productos, 2 = Servicios, 3 = Ambos
        tipo_doc: int = 99,   # 99 = Consumidor Final, 80 = CUIT
        nro_doc: str = "0",   # DNI/CUIT del cliente
        total: float = 0,
        neto: float = 0,
        iva: float = 0,
        fecha_servicio_desde: Optional[datetime] = None,
        fecha_servicio_hasta: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Crea una factura electrónica en AFIP.

        Args:
            tipo_cbte: Tipo de comprobante
                - 1: Factura A
                - 6: Factura B
                - 11: Factura C (Monotributo)
            concepto: Tipo de concepto
                - 1: Productos
                - 2: Servicios
                - 3: Productos y Servicios
            tipo_doc: Tipo de documento del receptor
                - 80: CUIT
                - 86: CUIL
                - 96: DNI
                - 99: Consumidor Final (sin identificar)
            nro_doc: Número de documento del receptor
            total: Importe total
            neto: Importe neto gravado
            iva: Importe de IVA
            fecha_servicio_desde: Para servicios, fecha desde
            fecha_servicio_hasta: Para servicios, fecha hasta

        Returns:
            Dict con datos de la factura emitida (CAE, número, etc.)
        """
        auth = self._get_auth()

        # Obtener próximo número de comprobante
        ultimo_cbte = self.get_last_invoice_number(tipo_cbte)
        cbte_nro = ultimo_cbte + 1

        # Fecha de emisión
        fecha_cbte = datetime.now().strftime("%Y%m%d")

        # Para Factura C (Monotributo), el total es igual al neto
        if tipo_cbte == 11:
            neto = total
            iva = 0

        # Preparar detalle del comprobante
        detalle = {
            'Concepto': concepto,
            'DocTipo': tipo_doc,
            'DocNro': int(nro_doc) if nro_doc != "0" else 0,
            'CbteDesde': cbte_nro,
            'CbteHasta': cbte_nro,
            'CbteFch': fecha_cbte,
            'ImpTotal': round(total, 2),
            'ImpTotConc': 0,  # Importe no gravado
            'ImpNeto': round(neto, 2),
            'ImpOpEx': 0,     # Importe exento
            'ImpIVA': round(iva, 2),
            'ImpTrib': 0,     # Importe tributos
            'MonId': 'PES',
            'MonCotiz': 1,
        }

        # Fechas de servicio (requerido para concepto 2 o 3)
        if concepto in [2, 3]:
            detalle['FchServDesde'] = (fecha_servicio_desde or datetime.now()).strftime("%Y%m%d")
            detalle['FchServHasta'] = (fecha_servicio_hasta or datetime.now()).strftime("%Y%m%d")
            detalle['FchVtoPago'] = (datetime.now() + timedelta(days=15)).strftime("%Y%m%d")

        # Solicitar CAE
        request_data = {
            'FeCabReq': {
                'CantReg': 1,
                'PtoVta': self.punto_venta,
                'CbteTipo': tipo_cbte,
            },
            'FeDetReq': {
                'FECAEDetRequest': [detalle]
            }
        }

        response = self._wsfe_client.service.FECAESolicitar(
            Auth=auth,
            FeCAEReq=request_data
        )

        # Verificar errores
        if response.Errors:
            error_msg = "; ".join([e.Msg for e in response.Errors.Err])
            raise Exception(f"Error AFIP: {error_msg}")

        # Obtener resultado del comprobante
        det_response = response.FeDetResp.FECAEDetResponse[0]

        if det_response.Resultado != "A":
            obs_msg = ""
            if det_response.Observaciones:
                obs_msg = "; ".join([o.Msg for o in det_response.Observaciones.Obs])
            raise Exception(f"Factura rechazada: {obs_msg}")

        # Retornar datos de la factura
        return {
            "success": True,
            "cae": det_response.CAE,
            "cae_vencimiento": det_response.CAEFchVto,
            "numero_comprobante": cbte_nro,
            "punto_venta": self.punto_venta,
            "tipo_comprobante": tipo_cbte,
            "numero_completo": f"{self.punto_venta:04d}-{cbte_nro:08d}",
            "fecha_emision": fecha_cbte,
            "total": total,
            "cuit_emisor": self.cuit,
        }

    def create_factura_c(
        self,
        total: float,
        tipo_doc: int = 99,
        nro_doc: str = "0",
        concepto: int = 1,
    ) -> Dict[str, Any]:
        """
        Método simplificado para crear Factura C (Monotributo).

        Args:
            total: Importe total de la factura
            tipo_doc: Tipo de documento (99=Cons.Final, 96=DNI)
            nro_doc: Número de documento
            concepto: 1=Productos, 2=Servicios, 3=Ambos

        Returns:
            Dict con datos de la factura emitida
        """
        return self.create_invoice(
            tipo_cbte=11,  # Factura C
            concepto=concepto,
            tipo_doc=tipo_doc,
            nro_doc=nro_doc,
            total=total,
            neto=total,  # En Factura C, total = neto
            iva=0,
        )

    def get_invoice_info(self, tipo_cbte: int, nro_cbte: int) -> Dict[str, Any]:
        """
        Obtiene información de un comprobante ya emitido.

        Args:
            tipo_cbte: Tipo de comprobante
            nro_cbte: Número de comprobante

        Returns:
            Dict con información del comprobante
        """
        auth = self._get_auth()

        response = self._wsfe_client.service.FECompConsultar(
            Auth=auth,
            FeCompConsReq={
                'CbteTipo': tipo_cbte,
                'CbteNro': nro_cbte,
                'PtoVta': self.punto_venta,
            }
        )

        if response.Errors:
            error_msg = "; ".join([e.Msg for e in response.Errors.Err])
            raise Exception(f"Error AFIP: {error_msg}")

        result = response.ResultGet
        return {
            "cae": result.CodAutorizacion,
            "cae_vencimiento": result.FchVto,
            "fecha_emision": result.CbteFch,
            "total": result.ImpTotal,
            "resultado": result.Resultado,
        }

    def check_server_status(self) -> Dict[str, Any]:
        """Verifica el estado de los servidores de AFIP"""
        self._authenticate()

        response = self._wsfe_client.service.FEDummy()

        return {
            "app_server": response.AppServer,
            "db_server": response.DbServer,
            "auth_server": response.AuthServer,
        }


# Instancia singleton del servicio
afip_service = AFIPService()
