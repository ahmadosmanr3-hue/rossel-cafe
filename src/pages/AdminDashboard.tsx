import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useOrderNotification, useWaiterCallNotification } from '../hooks/useOrderNotification';
import QRCodeGenerator from './QRCodeGenerator';
import {
  LayoutDashboard, PlusCircle, CheckCircle, Clock, Globe, LogOut,
  Volume2, VolumeX, Bell, BellOff, ChefHat, QrCode, Upload, ImageIcon,
  BarChart3, Trash2, ToggleLeft, ToggleRight, X
} from 'lucide-react';

export default function AdminDashboard() {
  const { lang, setLang, t } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'categories' | 'reports' | 'qrcodes'>('orders');
  const [isMuted, setIsMuted] = useState(false);

  // Reports state
  const [reportPeriod, setReportPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [reportOrders, setReportOrders] = useState<any[]>([]);

  // Form states
  const [newCategory, setNewCategory] = useState({ name_en: '', name_ku: '' });
  const [newItem, setNewItem] = useState({ name_en: '', name_ku: '', description_en: '', description_ku: '', price_iqd: '', category_id: '', image_url: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Sound notifications
  const pendingOrders = orders.filter(o => o.status === 'pending');
  useOrderNotification(pendingOrders.length, isMuted);
  useWaiterCallNotification(waiterCalls.length, isMuted);

  const fetchOrders = async () => {
    const data = await db.getOrders();
    setOrders(data);
  };

  const fetchWaiterCalls = async () => {
    const data = await db.getActiveWaiterCalls();
    setWaiterCalls(data);
  };

  const fetchMenuItems = async () => {
    const data = await db.getMenuItems();
    setMenuItems(data);
  };

  useEffect(() => {
    fetchOrders();
    db.getCategories().then(setCategories);
    fetchMenuItems();
    fetchWaiterCalls();

    if (supabase) {
      const channel = supabase
        .channel('admin-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
          setOrders(prev => [payload.new, ...prev]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waiter_calls' }, () => {
          fetchWaiterCalls();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'waiter_calls' }, () => {
          fetchWaiterCalls();
        })
        .subscribe();

      // Also poll as a reliable backup (realtime can be delayed)
      const interval = setInterval(() => {
        fetchOrders();
        fetchWaiterCalls();
      }, 5000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    } else {
      const interval = setInterval(() => {
        fetchOrders();
        fetchWaiterCalls();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  // Fetch report data when period changes
  useEffect(() => {
    const now = new Date();
    let startDate: Date;
    if (reportPeriod === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (reportPeriod === 'week') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    db.getOrdersByDateRange(startDate.toISOString(), now.toISOString()).then(setReportOrders);
  }, [reportPeriod, orders]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await db.updateOrderStatus(id, newStatus);
    fetchOrders();
  };

  const handleDismissWaiterCall = async (id: string) => {
    await db.dismissWaiterCall(id);
    fetchWaiterCalls();
  };

  const handleToggleAvailability = async (item: any) => {
    await db.updateMenuItemAvailability(item.id, !item.is_available);
    fetchMenuItems();
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await db.deleteMenuItem(id);
    fetchMenuItems();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.addCategory(newCategory);
    setNewCategory({ name_en: '', name_ku: '' });
    db.getCategories().then(setCategories);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let imageUrl = newItem.image_url;
      if (imageFile) {
        imageUrl = await db.uploadMenuImage(imageFile);
      }
      await db.addMenuItem({
        ...newItem,
        image_url: imageUrl,
        price_iqd: parseInt(newItem.price_iqd)
      });
      setNewItem({ name_en: '', name_ku: '', description_en: '', description_ku: '', price_iqd: '', category_id: '', image_url: '' });
      setImageFile(null);
      setImagePreview(null);
      fetchMenuItems();
    } catch (err) {
      console.error('Error adding item:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Report calculations
  const reportRevenue = reportOrders.reduce((sum, o) => sum + (o.total_price_iqd || 0), 0);
  const reportAvg = reportOrders.length > 0 ? Math.round(reportRevenue / reportOrders.length) : 0;

  const getNextStatus = (current: string) => {
    const flow: Record<string, string> = { pending: 'preparing', preparing: 'ready', ready: 'completed' };
    return flow[current];
  };
  const getNextStatusLabel = (current: string) => {
    const labels: Record<string, string> = { pending: t('markPreparing'), preparing: t('markReady'), ready: t('markCompleted') };
    return labels[current];
  };
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      preparing: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      ready: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      completed: 'bg-green-500/10 text-green-500 border-green-500/20'
    };
    return colors[status] || '';
  };
  const getStatusIcon = (status: string) => {
    if (status === 'pending') return <Clock size={12} />;
    if (status === 'preparing') return <ChefHat size={12} />;
    if (status === 'ready') return <Bell size={12} />;
    return <CheckCircle size={12} />;
  };

  const sidebarItems = [
    { key: 'orders' as const, icon: <LayoutDashboard size={20} />, label: t('liveOrders'), badge: pendingOrders.length > 0 ? pendingOrders.length : undefined },
    { key: 'menu' as const, icon: <PlusCircle size={20} />, label: t('menuManagement') },
    { key: 'categories' as const, icon: <LayoutDashboard size={20} />, label: t('categories') },
    { key: 'reports' as const, icon: <BarChart3 size={20} />, label: t('reports') },
    { key: 'qrcodes' as const, icon: <QrCode size={20} />, label: t('qrCodes') },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-navy-900)] text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-[var(--color-navy-800)] border-r border-white/10 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple-500)] to-[var(--color-purple-600)] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-purple-500/20">R</div>
          <div>
            <h1 className="font-bold tracking-wider text-white">ROSEL</h1>
            <p className="text-xs text-gray-400">{t('adminDashboard')}</p>
          </div>
        </div>

        {/* Waiter Calls Alert */}
        {waiterCalls.length > 0 && (
          <div className="mb-4 bg-[var(--color-gold-400)]/10 border border-[var(--color-gold-400)]/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={16} className="text-[var(--color-gold-400)] animate-bounce" />
              <span className="text-sm font-bold text-[var(--color-gold-400)]">{t('waiterCalls')} ({waiterCalls.length})</span>
            </div>
            <div className="space-y-2">
              {waiterCalls.map(call => (
                <div key={call.id} className="flex items-center justify-between bg-[var(--color-navy-900)]/50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{t('table')} #{call.table_id}</span>
                  <button
                    onClick={() => handleDismissWaiterCall(call.id)}
                    className="text-xs bg-[var(--color-gold-400)] text-black px-2 py-1 rounded font-medium hover:bg-[var(--color-gold-500)] transition-colors"
                  >
                    {t('dismiss')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors relative ${
                activeTab === item.key
                  ? 'bg-[var(--color-purple-500)]/10 text-[var(--color-purple-500)] font-medium'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
              {item.badge && (
                <span className="absolute right-3 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-full flex items-center justify-center gap-2 text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {isMuted ? t('soundOff') : t('soundOn')}
          </button>
          <button 
            onClick={() => setLang(lang === 'en' ? 'ku' : 'en')}
            className="w-full flex items-center justify-center gap-2 text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
          >
            <Globe size={16} />
            {lang === 'en' ? 'Switch to Kurdish' : 'گۆڕین بۆ ئینگلیزی'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* ===================== LIVE ORDERS ===================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{t('liveOrders')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orders.filter(o => o.status !== 'completed').map(order => (
                <div key={order.id} className={`bg-[var(--color-navy-800)] border rounded-2xl p-5 shadow-lg ${
                  order.status === 'pending' ? 'border-yellow-500/30 shadow-yellow-500/5' :
                  order.status === 'preparing' ? 'border-orange-500/30 shadow-orange-500/5' :
                  'border-blue-500/30 shadow-blue-500/5'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-navy-700)] flex items-center justify-center text-xl font-bold text-white border border-white/10">
                        {order.table_id}
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">{t('table')}</p>
                        <p className="font-bold text-lg">#{order.table_id}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status === 'pending' ? t('pending') : order.status === 'preparing' ? t('preparing') : order.status === 'ready' ? t('ready') : t('completed')}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3 min-h-[80px]">
                    {order.items_json?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-300"><span className="text-gray-500 mr-2">{item.quantity}x</span> {lang === 'en' ? item.name_en : item.name_ku}</span>
                        <span className="text-gray-400">{(item.price * item.quantity).toLocaleString()} IQD</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-xs text-yellow-400 font-medium">{t('notes')}:</p>
                      <p className="text-xs text-gray-300">{order.notes}</p>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">{t('total')}</p>
                      <p className="text-lg font-bold text-[var(--color-gold-400)]">{order.total_price_iqd?.toLocaleString()} IQD</p>
                    </div>
                    {getNextStatus(order.status) && (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, getNextStatus(order.status)!)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          order.status === 'pending' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                          order.status === 'preparing' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                          'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {getNextStatusLabel(order.status)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {orders.filter(o => o.status !== 'completed').length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500">
                  {t('noOrders')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== MENU MANAGEMENT ===================== */}
        {activeTab === 'menu' && (
          <div className="space-y-8">
            {/* Add Item Form */}
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold mb-6">{t('addItem')}</h2>
              <form onSubmit={handleAddItem} className="bg-[var(--color-navy-800)] p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('nameEn')}</label>
                    <input required value={newItem.name_en} onChange={e => setNewItem({...newItem, name_en: e.target.value})} className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-purple-500)]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('nameKu')}</label>
                    <input required value={newItem.name_ku} onChange={e => setNewItem({...newItem, name_ku: e.target.value})} className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-purple-500)]" dir="rtl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('descEn')}</label>
                    <textarea required value={newItem.description_en} onChange={e => setNewItem({...newItem, description_en: e.target.value})} className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-purple-500)]" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('descKu')}</label>
                    <textarea required value={newItem.description_ku} onChange={e => setNewItem({...newItem, description_ku: e.target.value})} className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-purple-500)]" rows={3} dir="rtl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('price')}</label>
                    <input required type="number" value={newItem.price_iqd} onChange={e => setNewItem({...newItem, price_iqd: e.target.value})} className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-purple-500)]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('selectCategory')}</label>
                    <select required value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})} className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-purple-500)]">
                      <option value="">{t('selectCategory')}</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('image')}</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) handleImageSelect(file); }}
                    className="relative border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-[var(--color-purple-500)]/50 transition-colors"
                    onClick={() => document.getElementById('menu-image-input')?.click()}
                  >
                    <input
                      id="menu-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageSelect(file); }}
                    />
                    {imagePreview ? (
                      <div className="flex items-center gap-4">
                        <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                        <div className="text-left flex-1">
                          <p className="text-white text-sm font-medium">{imageFile?.name}</p>
                          <p className="text-gray-500 text-xs mt-1">{((imageFile?.size || 0) / 1024).toFixed(1)} KB</p>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} className="text-red-400 text-xs mt-1 hover:underline">Remove</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Upload size={28} />
                        <p className="text-sm">Click to select or drag & drop an image</p>
                        <p className="text-xs text-gray-600">JPG, PNG, WebP</p>
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={isUploading || (!imageFile && !newItem.image_url)} className="w-full py-3 bg-[var(--color-purple-500)] hover:bg-[var(--color-purple-600)] text-white rounded-lg font-medium transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isUploading ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
                  ) : (
                    t('save')
                  )}
                </button>
              </form>
            </div>

            {/* Menu Items List */}
            <div>
              <h3 className="text-xl font-bold mb-4">{t('menuItems')}</h3>
              <div className="space-y-2">
                {menuItems.map(item => (
                  <div key={item.id} className="bg-[var(--color-navy-800)] p-4 rounded-xl border border-white/5 flex items-center gap-4">
                    <img src={item.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name_en}</p>
                      <p className="text-sm text-gray-400">{item.price_iqd?.toLocaleString()} IQD</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          item.is_available !== false
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {item.is_available !== false ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {item.is_available !== false ? t('available') : t('soldOut')}
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== CATEGORIES ===================== */}
        {activeTab === 'categories' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">{t('addCategory')}</h2>
            <form onSubmit={handleAddCategory} className="bg-[var(--color-navy-800)] p-6 rounded-2xl border border-white/5 space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('nameEn')}</label>
                  <input required value={newCategory.name_en} onChange={e => setNewCategory({...newCategory, name_en: e.target.value})} className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-purple-500)]" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('nameKu')}</label>
                  <input required value={newCategory.name_ku} onChange={e => setNewCategory({...newCategory, name_ku: e.target.value})} className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-purple-500)]" dir="rtl" />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-[var(--color-purple-500)] hover:bg-[var(--color-purple-600)] text-white rounded-lg font-medium transition-colors">
                {t('save')}
              </button>
            </form>

            <h3 className="text-xl font-bold mb-4">{t('existingCategories')}</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="bg-[var(--color-navy-800)] p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{cat.name_en}</p>
                    <p className="text-sm text-gray-400">{cat.name_ku}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${cat.name_en}"? This will also delete all items in this category.`)) return;
                      await db.deleteCategory(cat.id);
                      db.getCategories().then(setCategories);
                      fetchMenuItems();
                    }}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== REPORTS ===================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{t('reports')}</h2>

            {/* Period Selector */}
            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setReportPeriod(period)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    reportPeriod === period
                      ? 'bg-[var(--color-purple-500)] text-white'
                      : 'bg-[var(--color-navy-800)] text-gray-400 hover:text-white'
                  }`}
                >
                  {period === 'today' ? t('today') : period === 'week' ? t('thisWeek') : t('thisMonth')}
                </button>
              ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--color-navy-800)] rounded-2xl border border-white/5 p-6">
                <p className="text-sm text-gray-400 mb-1">{t('todayRevenue')}</p>
                <p className="text-3xl font-bold text-[var(--color-gold-400)]">{reportRevenue.toLocaleString()} <span className="text-sm">IQD</span></p>
              </div>
              <div className="bg-[var(--color-navy-800)] rounded-2xl border border-white/5 p-6">
                <p className="text-sm text-gray-400 mb-1">{t('totalOrders')}</p>
                <p className="text-3xl font-bold text-[var(--color-purple-500)]">{reportOrders.length}</p>
              </div>
              <div className="bg-[var(--color-navy-800)] rounded-2xl border border-white/5 p-6">
                <p className="text-sm text-gray-400 mb-1">{t('avgOrder')}</p>
                <p className="text-3xl font-bold text-green-400">{reportAvg.toLocaleString()} <span className="text-sm">IQD</span></p>
              </div>
            </div>

            {/* Order History Table */}
            <div className="bg-[var(--color-navy-800)] rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-bold">{t('orderHistory')}</h3>
              </div>
              <div className="divide-y divide-white/5">
                {reportOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">{t('noOrders')}</div>
                ) : (
                  reportOrders.map(order => (
                    <div key={order.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-navy-700)] flex items-center justify-center font-bold border border-white/10">
                        {order.table_id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {order.items_json?.map((i: any) => `${i.quantity}x ${lang === 'en' ? i.name_en : i.name_ku}`).join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </div>
                      <span className="font-bold text-[var(--color-gold-400)] whitespace-nowrap">
                        {order.total_price_iqd?.toLocaleString()} IQD
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== QR CODES ===================== */}
        {activeTab === 'qrcodes' && (
          <QRCodeGenerator baseUrl={window.location.origin} />
        )}
      </div>
    </div>
  );
}
