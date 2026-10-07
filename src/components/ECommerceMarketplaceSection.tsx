import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, ShoppingCart, Download, CreditCard, ArrowRight, X, Filter, FileText, Loader2, XCircle, Wallet, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiProduct, searchProducts } from '../api/products';
import { ApiStoreOrder, checkoutCart, getMyStoreOrders, getStoreDownloadUrl } from '../api/storeOrders';
import { startStoreRazorpayCheckout } from '../utils/storeRazorpayCheckout';
import { getWalletBalance } from '../api/wallet';
import { startWalletTopUpCheckout } from '../utils/walletTopUpCheckout';
import { AnalyticsItem, trackBeginCheckout, trackPDFPurchase, trackStoreDownload, trackViewItem } from '../utils/analytics';
import { Select } from './ui/Select';

interface CartLine {
  product: ApiProduct;
  quantity: number;
}

const CATEGORIES = ['All', 'Books', 'Test Series', 'Video Courses', 'Class Notes', 'GPSC', 'Police', 'Talati', 'Reasoning', 'General Knowledge'];

export const ECommerceMarketplaceSection: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [pricingType, setPricingType] = useState<'All' | 'Free' | 'Paid'>('All');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'failed'>('idle');
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const [orders, setOrders] = useState<ApiStoreOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'store' | 'orders'>('store');
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());
  const markImageBroken = (productId: number) => setBrokenImageIds((prev) => new Set(prev).add(productId));

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('200');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpStatus, setTopUpStatus] = useState<'idle' | 'processing'>('idle');

  const loadWalletBalance = () => {
    if (!isAuthenticated) return;
    getWalletBalance().then((res) => setWalletBalance(res.balance)).catch(() => setWalletBalance(null));
  };

  useEffect(() => {
    loadWalletBalance();
  }, [isAuthenticated]);

  useEffect(() => {
    searchProducts().then(setProducts).catch(() => setProducts([])).finally(() => setProductsLoading(false));
  }, []);

  const loadOrders = () => {
    if (!isAuthenticated) return;
    setOrdersLoading(true);
    getMyStoreOrders().then(setOrders).catch(() => setOrders([])).finally(() => setOrdersLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'orders') loadOrders();
  }, [activeTab, isAuthenticated]);

  const filteredProducts = useMemo(() => products.filter((p) => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || (p.shortDescription ?? '').toLowerCase().includes(q);
    const matchesPricing = pricingType === 'All' ? true : pricingType === 'Free' ? (p.isFree || !p.price) : (!p.isFree && !!p.price);
    return matchesCategory && matchesSearch && matchesPricing;
  }), [products, activeCategory, searchQuery, pricingType]);

  const requireLogin = () => {
    navigate('/login', { state: { from: '/store' } });
  };

  const addToCart = (product: ApiProduct) => {
    if (!isAuthenticated) { requireLogin(); return; }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.productId === product.productId);
      if (existing) {
        return prev.map((item) => item.product.productId === product.productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => prev
      .map((item) => item.product.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.isFree ? 0 : (item.product.price ?? 0)) * item.quantity, 0);

  const cartItems = (): AnalyticsItem[] => cart.map((c) => ({ item_id: String(c.product.productId), item_name: c.product.title, price: c.product.isFree ? 0 : (c.product.price ?? 0), quantity: c.quantity }));

  const handleRazorpayCheckout = async () => {
    if (!isAuthenticated) { requireLogin(); return; }
    if (cart.length === 0) return;

    setCheckoutStatus('processing');
    setCheckoutMessage(null);
    trackBeginCheckout(subtotal, cartItems());

    const outcome = await startStoreRazorpayCheckout(
      {
        items: cart.map((item) => ({ productId: item.product.productId, quantity: item.quantity })),
        paymentMethod: 'razorpay',
      },
      {
        name: 'JobCharcha Store',
        description: cart.length === 1 ? cart[0].product.title : `${cart.length} items`,
        prefillName: user?.name,
        prefillEmail: user?.email,
      }
    );

    if (outcome.status === 'success') {
      trackPDFPurchase(subtotal, String(outcome.result.orderId), cartItems());
      setCheckoutStatus('idle');
      setCart([]);
      setIsCartOpen(false);
      setActiveTab('orders');
      loadOrders();
    } else if (outcome.status === 'failed') {
      setCheckoutStatus('failed');
      setCheckoutMessage(outcome.message);
    } else {
      setCheckoutStatus('idle');
    }
  };

  const handleWalletCheckout = async () => {
    if (!isAuthenticated) { requireLogin(); return; }
    if (cart.length === 0) return;

    setCheckoutStatus('processing');
    setCheckoutMessage(null);
    trackBeginCheckout(subtotal, cartItems());

    try {
      const order = await checkoutCart({
        items: cart.map((item) => ({ productId: item.product.productId, quantity: item.quantity })),
        paymentMethod: 'wallet',
      });
      trackPDFPurchase(order.finalAmount, String(order.orderId), cartItems());
      setCheckoutStatus('idle');
      setCart([]);
      setIsCartOpen(false);
      setActiveTab('orders');
      loadOrders();
      loadWalletBalance();
    } catch (err) {
      setCheckoutStatus('failed');
      setCheckoutMessage(err instanceof Error ? err.message : 'Wallet payment failed.');
    }
  };

  const handleTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) return;
    setTopUpStatus('processing');
    const outcome = await startWalletTopUpCheckout(amount, { prefillName: user?.name, prefillEmail: user?.email });
    setTopUpStatus('idle');
    if (outcome.status === 'success') {
      setShowTopUp(false);
      loadWalletBalance();
    } else if (outcome.status === 'failed') {
      setCheckoutMessage(outcome.message);
    }
  };

  const handleDownload = async (orderId: number, orderItemId: number) => {
    try {
      const { downloadUrl } = await getStoreDownloadUrl(orderId, orderItemId);
      trackStoreDownload(orderId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      loadOrders();
    } catch (err) {
      setCheckoutMessage(err instanceof Error ? err.message : 'Could not start download.');
    }
  };

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aspirant Marketplace & Store</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Exam Books, Study Notes & Video Bundles
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Digital PDFs, guidebooks, and prep material — instant access after purchase.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setActiveTab('store')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'store' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Store Catalog
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'orders' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                My Orders
              </button>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
            </button>
          </div>
        </div>

        {activeTab === 'store' ? (
          <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search books, notes, topics..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
                <Select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value as 'All' | 'Free' | 'Paid')}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="All">All Pricing</option>
                  <option value="Free">Free</option>
                  <option value="Paid">Paid</option>
                </Select>
              </div>
            </div>

            {productsLoading ? (
              <div className="py-16 text-center text-xs font-semibold text-slate-400">Loading products…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
                <Filter className="w-6 h-6 text-slate-300" />
                No products match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.productId}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      <div className="relative h-48 bg-slate-100 overflow-hidden">
                        {product.coverImageUrl && !brokenImageIds.has(product.productId) ? (
                          <img
                            src={product.coverImageUrl}
                            alt={product.title}
                            onError={() => markImageBroken(product.productId)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <FileText className="w-12 h-12" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                          {product.category}
                        </span>
                        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Download className="w-3 h-3" /> Digital Instant
                        </span>
                      </div>

                      <div className="p-5 space-y-2">
                        <h3
                          onClick={() => { setSelectedProduct(product); trackViewItem({ item_id: String(product.productId), item_name: product.title, price: product.isFree ? 0 : (product.price ?? 0), quantity: 1 }); }}
                          className="font-heading font-extrabold text-sm text-slate-900 hover:text-emerald-600 cursor-pointer line-clamp-2 leading-snug"
                        >
                          {product.title}
                        </h3>

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {product.shortDescription}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                      <div>
                        {product.isFree || !product.price ? (
                          <span className="text-lg font-black text-emerald-600">Free</span>
                        ) : (
                          <>
                            <span className="text-lg font-black text-slate-900">₹{product.price}</span>
                            {!!product.originalPrice && product.originalPrice > product.price && (
                              <span className="text-xs text-slate-400 line-through ml-1.5">₹{product.originalPrice}</span>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ORDERS HISTORY TAB */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> Your Purchase History
            </h3>

            {!isAuthenticated ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-3">
                <p>Log in to see your order history.</p>
                <button onClick={requireLogin} className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer">
                  Log In
                </button>
              </div>
            ) : ordersLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No orders placed yet. Explore the Store Catalog!
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.orderId} className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm">{order.orderNumber}</span>
                        <span className="text-slate-500 block">Placed on {new Date(order.orderDate).toLocaleDateString()}</span>
                      </div>
                      <span className={`font-bold px-3 py-1 rounded-full text-[11px] w-fit ${
                        order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800'
                          : order.paymentStatus === 'Pending' ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.orderItemId} className="flex justify-between items-center text-xs gap-3">
                          <span className="font-medium text-slate-800">{item.productTitle} (x{item.quantity})</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                            {item.canDownload ? (
                              <button
                                onClick={() => handleDownload(order.orderId, item.orderItemId)}
                                className="bg-slate-900 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Download
                              </button>
                            ) : order.paymentStatus === 'Paid' ? (
                              <span className="text-[11px] text-slate-400">Limit reached</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm text-slate-900">
                      <span>Total</span>
                      <span className="text-emerald-700 font-black">₹{order.finalAmount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* SHOPPING CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="font-heading font-extrabold text-base">Your Cart ({cart.length})</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Your cart is empty.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.productId} className="bg-white p-3.5 rounded-2xl border border-slate-200 flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      {item.product.coverImageUrl && !brokenImageIds.has(item.product.productId) ? (
                        <img
                          src={item.product.coverImageUrl}
                          alt={item.product.title}
                          onError={() => markImageBroken(item.product.productId)}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-slate-900 line-clamp-1">{item.product.title}</div>
                      <div className="text-slate-500 flex items-center gap-2 mt-1">
                        <span>₹{item.product.isFree ? 0 : item.product.price}</span>
                        <span className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.product.productId, -1)} className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 cursor-pointer font-bold">-</button>
                          <span className="w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.productId, 1)} className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 cursor-pointer font-bold">+</button>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.productId)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}

              {checkoutMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl p-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {checkoutMessage}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 bg-white border-t border-slate-200 space-y-3">
                <div className="flex justify-between font-black text-slate-900 text-base">
                  <span>Total Amount</span>
                  <span className="text-emerald-700">₹{subtotal}</span>
                </div>

                {isAuthenticated && walletBalance !== null && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                    <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Wallet balance: <span className="font-bold text-slate-700">₹{walletBalance}</span></span>
                    <button onClick={() => setShowTopUp((v) => !v)} className="text-emerald-700 font-bold flex items-center gap-0.5 cursor-pointer">
                      <Plus className="w-3 h-3" /> Top Up
                    </button>
                  </div>
                )}

                {showTopUp && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                      placeholder="Amount"
                    />
                    <button
                      onClick={handleTopUp}
                      disabled={topUpStatus === 'processing'}
                      className="bg-slate-900 disabled:opacity-60 text-white font-bold text-xs px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1"
                    >
                      {topUpStatus === 'processing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add via Razorpay'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleRazorpayCheckout}
                    disabled={checkoutStatus === 'processing'}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1"
                  >
                    {checkoutStatus === 'processing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                    Razorpay
                  </button>
                  <button
                    onClick={handleWalletCheckout}
                    disabled={checkoutStatus === 'processing' || !isAuthenticated || (walletBalance ?? 0) < subtotal}
                    title={isAuthenticated && (walletBalance ?? 0) < subtotal ? 'Insufficient wallet balance' : undefined}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" /> Wallet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedProduct.coverImageUrl && !brokenImageIds.has(selectedProduct.productId) && (
              <img
                src={selectedProduct.coverImageUrl}
                alt={selectedProduct.title}
                onError={() => markImageBroken(selectedProduct.productId)}
                className="w-full h-48 rounded-2xl object-cover"
              />
            )}

            <div className="space-y-2">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                {selectedProduct.category}
              </span>
              <h3 className="text-xl font-heading font-extrabold text-slate-900">{selectedProduct.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{selectedProduct.description || selectedProduct.shortDescription}</p>
              {selectedProduct.whatIncluded && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">What's Included</span>
                  <p className="text-xs text-slate-600 mt-1">{selectedProduct.whatIncluded}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                {selectedProduct.isFree || !selectedProduct.price ? (
                  <span className="text-2xl font-black text-emerald-600">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-black text-slate-900">₹{selectedProduct.price}</span>
                    {!!selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                      <span className="text-xs text-slate-400 line-through ml-2">₹{selectedProduct.originalPrice}</span>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  addToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="bg-emerald-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
