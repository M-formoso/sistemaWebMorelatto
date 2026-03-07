// Get API URL from environment or use default
// Next.js inlines NEXT_PUBLIC_* variables at build time
const API_URL = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error de conexión' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content - no body to parse
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Session ID for guest cart
  getSessionId(): string {
    if (typeof window === 'undefined') return '';
    let sessionId = localStorage.getItem('cart_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('cart_session_id', sessionId);
    }
    return sessionId;
  }

  getToken(): string | null {
    return this.token;
  }

  // ============ AUTH ============

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Credenciales incorrectas' }));
      throw new Error(error.detail);
    }

    const data = await response.json();
    this.token = data.access_token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', data.access_token);
      
    }
    return data;
  }

  async register(data: { email: string; password: string; full_name: string; role?: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: data.role || 'user' }),
    });
  }

  async createAdmin(data: { email: string; password: string; full_name?: string }) {
    return this.request('/auth/create-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // ============ PRODUCTS ============

  async getProducts(params?: { search?: string; category_id?: string; low_stock?: boolean; is_active?: boolean; show_in_decoration?: boolean; page?: number; page_size?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category_id) searchParams.append('category_id', params.category_id);
    if (params?.low_stock) searchParams.append('low_stock', 'true');
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.show_in_decoration !== undefined) searchParams.append('show_in_decoration', params.show_in_decoration.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());

    const query = searchParams.toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  }

  async getPublicProducts(params?: { category_id?: string; search?: string; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.category_id) searchParams.append('category_id', params.category_id);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/products/public${query ? `?${query}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async getProductByCode(code: string) {
    return this.request(`/products/code/${code}`);
  }

  async getPublicProduct(id: string) {
    return this.request(`/products/public/${id}`);
  }

  async createProduct(data: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async publishProductToWeb(id: string, data: { category_id: string; weight?: number }) {
    return this.request(`/products/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async unpublishProduct(id: string) {
    return this.request(`/products/${id}/unpublish`, {
      method: 'POST',
    });
  }

  async toggleProductActive(id: string) {
    return this.request(`/products/${id}/toggle-active`, {
      method: 'PATCH',
    });
  }

  // ============ PRODUCT VARIANTS ============

  async getProductVariants(productId?: string) {
    const query = productId ? `?product_id=${productId}` : '';
    return this.request(`/products/variants${query}`);
  }

  async createProductVariant(productId: string, data: any) {
    return this.request(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProductVariant(variantId: string, data: any) {
    return this.request(`/products/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProductVariant(variantId: string) {
    return this.request(`/products/variants/${variantId}`, {
      method: 'DELETE',
    });
  }

  // ============ IMAGES ============

  async uploadImage(formData: FormData) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}/images/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al subir imagen' }));
      throw new Error(error.detail);
    }

    return response.json();
  }

  async uploadMultipleImages(formData: FormData) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}/images/upload/multiple`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al subir imágenes' }));
      throw new Error(error.detail);
    }

    return response.json();
  }

  async addProductImage(productId: string, imageData: any) {
    return this.request(`/images/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify(imageData),
    });
  }

  async getProductImages(productId: string) {
    return this.request(`/images/products/${productId}/images`);
  }

  async updateProductImage(imageId: string, imageData: any) {
    return this.request(`/images/products/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify(imageData),
    });
  }

  async deleteProductImage(imageId: string) {
    return this.request(`/images/products/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  async setPrimaryImage(productId: string, imageId: string) {
    return this.request(`/images/products/${productId}/images/set-primary/${imageId}`, {
      method: 'POST',
    });
  }

  async reorderImages(productId: string, imageOrders: any[]) {
    return this.request(`/images/products/${productId}/images/reorder`, {
      method: 'PATCH',
      body: JSON.stringify(imageOrders),
    });
  }

  // ============ WORKSHOP IMAGES ============

  async addWorkshopImage(workshopId: string, imageData: any) {
    return this.request(`/images/workshops/${workshopId}/images`, {
      method: 'POST',
      body: JSON.stringify(imageData),
    });
  }

  async getWorkshopImages(workshopId: string) {
    return this.request(`/images/workshops/${workshopId}/images`);
  }

  async updateWorkshopImage(imageId: string, imageData: any) {
    return this.request(`/images/workshops/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify(imageData),
    });
  }

  async deleteWorkshopImage(imageId: string) {
    return this.request(`/images/workshops/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  // ============ NEWS IMAGES ============

  async addNewsImage(newsId: string, imageData: any) {
    return this.request(`/images/news/${newsId}/images`, {
      method: 'POST',
      body: JSON.stringify(imageData),
    });
  }

  async getNewsImages(newsId: string) {
    return this.request(`/images/news/${newsId}/images`);
  }

  async updateNewsImage(imageId: string, imageData: any) {
    return this.request(`/images/news/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify(imageData),
    });
  }

  async deleteNewsImage(imageId: string) {
    return this.request(`/images/news/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  // ============ CATEGORIES ============

  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data: any) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: any) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ SALES (Sistema) ============

  async getSales(params?: { date_from?: string; date_to?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);

    const query = searchParams.toString();
    return this.request(`/sales${query ? `?${query}` : ''}`);
  }

  async getSale(id: string) {
    return this.request(`/sales/${id}`);
  }

  async createSale(data: any) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSalesSummary(params?: { date_from?: string; date_to?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);

    const query = searchParams.toString();
    return this.request(`/sales/summary${query ? `?${query}` : ''}`);
  }

  // ============ CLIENTS (Sistema) ============

  async getClients(params?: { search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return this.request(`/clients${query ? `?${query}` : ''}`);
  }

  async getClient(id: string) {
    return this.request(`/clients/${id}`);
  }

  async createClient(data: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============ CART (Ecommerce) ============

  async getCart() {
    const sessionId = this.getSessionId();
    return this.request('/orders/cart', {
      headers: {
        'X-Session-ID': sessionId,
      },
    });
  }

  async addToCart(productId: string, quantity: number = 1, variantId?: string) {
    const sessionId = this.getSessionId();
    return this.request('/orders/cart', {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify({
        product_id: productId,
        quantity,
        variant_id: variantId
      }),
    });
  }

  async updateCartItem(cartItemId: string, quantity: number) {
    return this.request(`/orders/cart/${cartItemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(cartItemId: string) {
    return this.request(`/orders/cart/${cartItemId}`, {
      method: 'DELETE',
    });
  }

  async clearCart() {
    const sessionId = this.getSessionId();
    return this.request(`/orders/cart/clear?session_id=${sessionId}`, {
      method: 'DELETE',
    });
  }

  // ============ ORDERS (Ecommerce) ============

  async getOrders(params?: { status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    return this.request(`/orders${query ? `?${query}` : ''}`);
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async getMyOrders() {
    const sessionId = this.getSessionId();
    return this.request('/orders/my-orders', {
      headers: {
        'X-Session-ID': sessionId,
      },
    });
  }

  async createOrder(data: any) {
    const sessionId = this.getSessionId();
    return this.request('/orders', {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify(data),
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request(`/orders/${id}/status?new_status=${status}`, {
      method: 'PATCH',
    });
  }

  async updatePaymentStatus(id: string, payment_status: string) {
    return this.request(`/orders/${id}/payment?new_payment_status=${payment_status}`, {
      method: 'PATCH',
    });
  }

  async updateShipment(shipmentId: string, data: {
    tracking_number?: string;
    carrier?: string;
    status?: string;
    estimated_delivery_date?: string;
  }) {
    return this.request(`/shipping/shipments/${shipmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============ WORKSHOPS ============

  async getWorkshops(params?: { is_active?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

    const query = searchParams.toString();
    return this.request(`/workshops${query ? `?${query}` : ''}`);
  }

  async getWorkshop(id: string) {
    return this.request(`/workshops/${id}`);
  }

  async getPublicWorkshops() {
    return this.request('/workshops/public');
  }

  async getPublicWorkshop(id: string) {
    return this.request(`/workshops/public/${id}`);
  }

  async createWorkshop(data: any) {
    return this.request('/workshops', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkshop(id: string, data: any) {
    return this.request(`/workshops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getWorkshopEnrollments(workshopId: string) {
    return this.request(`/workshops/${workshopId}/enrollments`);
  }

  async createEnrollment(data: any) {
    return this.request('/workshops/enroll', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async enrollInWorkshop(data: any) {
    return this.request('/workshops/public/enroll', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ SHIPPING ============

  async getShippingZones() {
    return this.request('/shipping/zones');
  }

  async getShippingRates(zoneId?: string) {
    const query = zoneId ? `?zone_id=${zoneId}` : '';
    return this.request(`/shipping/rates${query}`);
  }

  async calculateShipping(data: { city: string; province: string; total_weight: number; order_total: number }) {
    return this.request('/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createShippingZone(data: any) {
    return this.request('/shipping/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShippingZone(id: string, data: any) {
    return this.request(`/shipping/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createShippingRate(data: any) {
    return this.request('/shipping/rates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShippingRate(id: string, data: any) {
    return this.request(`/shipping/rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============ PAYMENT METHODS ============

  async getPaymentMethods() {
    return this.request('/shipping/payment-methods');
  }

  async createPaymentMethod(data: any) {
    return this.request('/shipping/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePaymentMethod(id: string, data: any) {
    return this.request(`/shipping/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePaymentMethod(id: string) {
    return this.request(`/shipping/payment-methods/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ NEWS ============

  async getNews() {
    return this.request('/news');
  }

  async getNewsItem(id: string) {
    return this.request(`/news/${id}`);
  }

  async createNews(data: any) {
    return this.request('/news', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNews(id: string, data: any) {
    return this.request(`/news/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNews(id: string) {
    return this.request(`/news/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ DASHBOARD ============

  async getDashboardSummary() {
    return this.request('/dashboard/summary');
  }

  async getSalesByPeriod(days: number = 30) {
    return this.request(`/dashboard/sales-by-period?days=${days}`);
  }

  async getTopProducts(limit: number = 10, days: number = 30) {
    return this.request(`/dashboard/top-products?limit=${limit}&days=${days}`);
  }

  async getLowStockProducts() {
    return this.request('/dashboard/low-stock');
  }

  // ============ PAYMENTS (MercadoPago) ============

  async getMercadoPagoConfig() {
    return this.request('/payments/config');
  }

  async createPaymentPreference(data: {
    order_id: string;
    items: Array<{ title: string; quantity: number; unit_price: number; currency_id?: string }>;
    payer?: {
      name: string;
      surname?: string;
      email: string;
      phone_area_code?: string;
      phone_number?: string;
      street_name?: string;
      street_number?: string;
      zip_code?: string;
    };
  }) {
    return this.request('/payments/preference', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.request(`/payments/status/${paymentId}`);
  }

  async getOrderPaymentStatus(orderId: string) {
    return this.request(`/payments/order/${orderId}/payment-status`);
  }

  // ============ INVOICES (AFIP) ============

  async getAFIPConfig() {
    return this.request('/invoices/config');
  }

  async getAFIPStatus() {
    return this.request('/invoices/status');
  }

  async getLastInvoiceNumber(tipoCbte: number = 11) {
    return this.request(`/invoices/last-number?tipo_cbte=${tipoCbte}`);
  }

  async createInvoice(data: { total: number; tipo_doc?: number; nro_doc?: string; concepto?: number }) {
    return this.request('/invoices/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async invoiceOrder(orderId: string, data?: { tipo_doc?: number; nro_doc?: string }) {
    return this.request(`/invoices/order/${orderId}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async invoiceSale(saleId: string, data?: { tipo_doc?: number; nro_doc?: string }) {
    return this.request(`/invoices/sale/${saleId}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async getOrderInvoiceInfo(orderId: string) {
    return this.request(`/invoices/order/${orderId}/info`);
  }

  // ============ USERS ============

  async getUsers(params?: { role?: string; is_active?: boolean; search?: string; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  async getUserStats() {
    return this.request('/users/stats');
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async createUser(data: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
    document?: string;
    role?: string;
    is_active?: boolean;
  }) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: {
    email?: string;
    full_name?: string;
    phone?: string;
    document?: string;
    role?: string;
    is_active?: boolean;
  }) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changeUserPassword(id: string, newPassword: string) {
    return this.request(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ new_password: newPassword }),
    });
  }

  async toggleUserActive(id: string) {
    return this.request(`/users/${id}/toggle-active`, {
      method: 'PATCH',
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserRoles() {
    return this.request('/users/roles/list');
  }

  // ============ SUPPLIERS ============

  async getSuppliers(params?: { is_active?: boolean; search?: string; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/suppliers${query ? `?${query}` : ''}`);
  }

  async getSupplier(id: string) {
    return this.request(`/suppliers/${id}`);
  }

  async createSupplier(data: any) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplier(id: string, data: any) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplier(id: string) {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // Supplier Purchases
  async getSupplierPurchases(params?: { supplier_id?: string; status?: string; overdue_only?: boolean; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.supplier_id) searchParams.append('supplier_id', params.supplier_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.overdue_only) searchParams.append('overdue_only', 'true');
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/suppliers/purchases/all${query ? `?${query}` : ''}`);
  }

  async createSupplierPurchase(data: any) {
    return this.request('/suppliers/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplierPurchase(id: string, data: any) {
    return this.request(`/suppliers/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplierPurchase(id: string) {
    return this.request(`/suppliers/purchases/${id}`, {
      method: 'DELETE',
    });
  }

  // Supplier Payments
  async getSupplierPayments(params?: { supplier_id?: string; purchase_id?: string; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.supplier_id) searchParams.append('supplier_id', params.supplier_id);
    if (params?.purchase_id) searchParams.append('purchase_id', params.purchase_id);
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/suppliers/payments/all${query ? `?${query}` : ''}`);
  }

  async createSupplierPayment(data: any) {
    return this.request('/suppliers/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplierPayment(id: string) {
    return this.request(`/suppliers/payments/${id}`, {
      method: 'DELETE',
    });
  }

  async getSuppliersSummary() {
    return this.request('/suppliers/summary/all');
  }

  // ============ FINANCE (Movimientos financieros) ============

  async getMovements(params?: {
    type?: string; // "ingreso" o "egreso"
    category?: string;
    date_from?: string;
    date_to?: string;
    skip?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/finance/movements${query ? `?${query}` : ''}`);
  }

  async getMovement(id: string) {
    return this.request(`/finance/movements/${id}`);
  }

  async createMovement(data: {
    type: 'ingreso' | 'egreso';
    concept: string;
    category?: string;
    amount: number;
    date: string;
    notes?: string;
  }) {
    return this.request('/finance/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMovement(id: string, data: {
    concept?: string;
    category?: string;
    amount?: number;
    date?: string;
    notes?: string;
  }) {
    return this.request(`/finance/movements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMovement(id: string) {
    return this.request(`/finance/movements/${id}`, {
      method: 'DELETE',
    });
  }

  async getFinanceSummary(params?: { date_from?: string; date_to?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);

    const query = searchParams.toString();
    return this.request(`/finance/summary${query ? `?${query}` : ''}`);
  }

  async getFinancePeriodSummaries() {
    return this.request('/finance/summary/periods');
  }

  async getFinanceSummaryByCategory(type: 'ingreso' | 'egreso', params?: { date_from?: string; date_to?: string }) {
    const searchParams = new URLSearchParams();
    searchParams.append('type', type);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);

    return this.request(`/finance/summary/by-category?${searchParams.toString()}`);
  }

  async getCashFlow(days: number = 30) {
    return this.request(`/finance/cash-flow?days=${days}`);
  }

  async getIncomeCategories() {
    return this.request('/finance/categories/income');
  }

  async getExpenseCategories() {
    return this.request('/finance/categories/expense');
  }

  // Helper method to get full image URL
  getImageUrl(relativePath: string | null | undefined): string | null {
    if (!relativePath) return null;
    // If it's already a full URL, return it
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    // Remove /api from baseUrl and append the relative path
    const baseUrl = this.baseUrl.replace('/api', '');
    return `${baseUrl}${relativePath}`;
  }
}

export const api = new ApiClient();
export default api;
export { ApiClient };
