import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { db } from '../lib/db';
import { ShoppingCart, Globe, Plus, Minus, Bell, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CustomerMenu() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const navigate = useNavigate();
  const { lang, setLang, t, isRtl } = useLanguage();
  const { items, addToCart, removeFromCart, total, clearCart, notes, setNotes } = useCart();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [waiterCallStatus, setWaiterCallStatus] = useState<'idle' | 'calling' | 'called'>('idle');

  useEffect(() => {
    db.getCategories().then(data => {
      setCategories(data);
      if (data.length > 0) setActiveCategory(data[0].id);
    });
    db.getMenuItems().then(setMenuItems);
  }, []);

  const handleOrder = async () => {
    if (!tableId || items.length === 0) return;
    setOrderStatus('submitting');
    try {
      const order = await db.createOrder({
        table_id: tableId,
        items_json: items,
        notes: notes || '',
        total_price_iqd: total,
        status: 'pending'
      });
      setOrderStatus('success');
      clearCart();
      // Redirect to order tracking after a short delay
      setTimeout(() => {
        setOrderStatus('idle');
        setIsCartOpen(false);
        navigate(`/order/${order.id}?table=${tableId}`);
      }, 1500);
    } catch (e) {
      console.error(e);
      setOrderStatus('idle');
    }
  };

  const handleCallWaiter = async () => {
    if (!tableId || waiterCallStatus !== 'idle') return;
    setWaiterCallStatus('calling');
    try {
      await db.createWaiterCall(tableId);
      setWaiterCallStatus('called');
      setTimeout(() => setWaiterCallStatus('idle'), 30000); // 30s cooldown
    } catch (e) {
      console.error(e);
      setWaiterCallStatus('idle');
    }
  };

  const filteredItems = menuItems.filter(item => item.category_id === activeCategory);

  return (
    <div className="min-h-screen bg-[var(--color-navy-900)] text-white pb-24 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-navy-800)]/80 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/admin')}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-purple-500)] to-[var(--color-purple-600)] flex items-center justify-center font-bold text-white hover:opacity-80 transition-opacity"
            title={t('admin')}
          >
            R
          </button>
          <h1 className="text-xl font-bold tracking-wider text-white">ROSEL</h1>
        </div>
        <div className="flex items-center gap-3">
          {tableId && (
            <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
              {t('table')} {tableId}
            </span>
          )}
          <button 
            onClick={() => setLang(lang === 'en' ? 'ku' : 'en')}
            className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
          >
            <Globe size={16} />
            {lang === 'en' ? 'کوردی' : 'EN'}
          </button>
        </div>
      </header>

      {!tableId && (
        <div className="p-4 bg-red-500/20 text-red-200 text-center m-4 rounded-xl border border-red-500/30">
          {t('noTable')}
        </div>
      )}

      {/* Categories */}
      <div className="overflow-x-auto hide-scrollbar py-4 px-4 sticky top-[65px] z-30 bg-[var(--color-navy-900)]/90 backdrop-blur-sm">
        <div className="flex gap-3">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id 
                  ? 'bg-[var(--color-purple-500)] text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' 
                  : 'bg-[var(--color-navy-700)] text-gray-300 hover:bg-gray-700'
              }`}
            >
              {lang === 'en' ? cat.name_en : cat.name_ku}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isAvailable = item.is_available !== false;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={item.id} 
              className={`bg-[var(--color-navy-800)] rounded-2xl overflow-hidden border border-white/5 shadow-lg flex flex-col ${!isAvailable ? 'opacity-60' : ''}`}
            >
              <div className="h-48 w-full bg-gray-800 relative">
                <img src={item.image_url} alt={item.name_en} className={`w-full h-full object-cover ${!isAvailable ? 'grayscale' : ''}`} referrerPolicy="no-referrer" />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-navy-800)] to-transparent" />
                {!isAvailable && (
                  <div className="absolute top-3 right-3 bg-red-500/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                    {t('soldOut')}
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white">
                    {lang === 'en' ? item.name_en : item.name_ku}
                  </h3>
                  <span className="text-[var(--color-gold-400)] font-bold whitespace-nowrap ml-2">
                    {item.price_iqd.toLocaleString()} IQD
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4 flex-1">
                  {lang === 'en' ? item.description_en : item.description_ku}
                </p>
                <button
                  onClick={() => isAvailable && addToCart(item)}
                  disabled={!isAvailable}
                  className={`w-full py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                    isAvailable
                      ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Plus size={18} />
                  {isAvailable ? t('addToCart') : t('soldOut')}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Buttons Area */}
      <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 flex flex-col gap-3">
        {/* Waiter Call Button */}
        {tableId && (
          <AnimatePresence>
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleCallWaiter}
              disabled={waiterCallStatus !== 'idle'}
              className={`self-end w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
                waiterCallStatus === 'called'
                  ? 'bg-green-500 shadow-green-500/30'
                  : waiterCallStatus === 'calling'
                  ? 'bg-yellow-500 shadow-yellow-500/30'
                  : 'bg-[var(--color-gold-400)] shadow-[var(--color-gold-400)]/30 hover:bg-[var(--color-gold-500)] active:scale-90'
              }`}
            >
              {waiterCallStatus === 'called' ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Bell size={22} className="text-white" />
                </motion.div>
              ) : waiterCallStatus === 'calling' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Bell size={22} className="text-[var(--color-navy-900)]" />
              )}
            </motion.button>
          </AnimatePresence>
        )}

        {/* Cart Button */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.button
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[var(--color-purple-500)] hover:bg-[var(--color-purple-600)] text-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(139,92,246,0.4)] flex items-center justify-between transition-transform active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart size={24} />
                  <span className="absolute -top-2 -right-2 bg-[var(--color-gold-400)] text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {items.reduce((acc, i) => acc + i.quantity, 0)}
                  </span>
                </div>
                <span className="font-bold">{t('cart')}</span>
              </div>
              <span className="font-bold text-[var(--color-gold-400)]">{total.toLocaleString()} IQD</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:w-[400px] bg-[var(--color-navy-800)] rounded-t-3xl md:rounded-3xl border border-white/10 shadow-2xl z-50 flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold">{t('cart')}</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <Minus size={20} className="rotate-45" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1">
                {orderStatus === 'success' ? (
                  <div className="text-center py-8 text-green-400">
                    <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-bold text-lg">{t('orderSuccess')}</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('emptyCart')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                        <div className="flex-1">
                          <h4 className="font-medium">{lang === 'en' ? item.name_en : item.name_ku}</h4>
                          <div className="text-[var(--color-gold-400)] text-sm">{item.price.toLocaleString()} IQD</div>
                        </div>
                        <div className="flex items-center gap-3 bg-[var(--color-navy-900)] rounded-lg p-1">
                          <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-white/10 rounded-md">
                            <Minus size={16} />
                          </button>
                          <span className="w-4 text-center font-medium">{item.quantity}</span>
                          <button onClick={() => addToCart({ ...item, price_iqd: item.price })} className="p-1 hover:bg-white/10 rounded-md">
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Order Notes */}
                    <div className="mt-2">
                      <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <MessageSquare size={14} />
                        {t('notes')}
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder={t('notesPlaceholder')}
                        rows={2}
                        className="w-full bg-[var(--color-navy-900)] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-purple-500)] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {items.length > 0 && orderStatus !== 'success' && (
                <div className="p-4 border-t border-white/10 bg-[var(--color-navy-900)]/50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400">{t('total')}</span>
                    <span className="text-xl font-bold text-[var(--color-gold-400)]">{total.toLocaleString()} IQD</span>
                  </div>
                  <button
                    onClick={handleOrder}
                    disabled={!tableId || orderStatus === 'submitting'}
                    className="w-full py-3.5 bg-gradient-to-r from-[var(--color-purple-500)] to-[var(--color-purple-600)] hover:from-[#7c3aed] hover:to-[#581c87] text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                  >
                    {orderStatus === 'submitting' ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      t('order')
                    )}
                  </button>
                  {!tableId && (
                    <p className="text-red-400 text-xs text-center mt-2">{t('noTable')}</p>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
