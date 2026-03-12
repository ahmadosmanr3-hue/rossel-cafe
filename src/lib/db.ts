import { supabase, mockCategories, mockMenuItems, loadMockOrders, saveMockOrders, loadMockWaiterCalls, saveMockWaiterCalls } from './supabase';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const db = {
  // ===================== IMAGE UPLOAD =====================
  async uploadMenuImage(file: File): Promise<string> {
    if (supabase) {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('menu-images').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    }
    // Fallback: create a data URL for local/mock usage
    return URL.createObjectURL(file);
  },

  // ===================== CATEGORIES =====================
  async getCategories() {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    }
    await delay(200);
    return [...mockCategories];
  },

  async addCategory(category: any) {
    if (supabase) {
      const { data, error } = await supabase.from('categories').insert([category]).select();
      if (error) throw error;
      return data[0];
    }
    await delay(200);
    const newCat = { ...category, id: Math.random().toString(36).substr(2, 9) };
    mockCategories.push(newCat);
    return newCat;
  },

  async deleteCategory(id: string) {
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    await delay(200);
    const idx = mockCategories.findIndex(c => c.id === id);
    if (idx > -1) mockCategories.splice(idx, 1);
  },

  // ===================== MENU ITEMS =====================
  async getMenuItems() {
    if (supabase) {
      const { data, error } = await supabase.from('menu_items').select('*');
      if (error) throw error;
      return data;
    }
    await delay(200);
    return [...mockMenuItems];
  },

  async addMenuItem(item: any) {
    if (supabase) {
      const { data, error } = await supabase.from('menu_items').insert([item]).select();
      if (error) throw error;
      return data[0];
    }
    await delay(200);
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9), is_available: true };
    mockMenuItems.push(newItem);
    return newItem;
  },

  async updateMenuItemAvailability(id: string, isAvailable: boolean) {
    if (supabase) {
      const { data, error } = await supabase.from('menu_items').update({ is_available: isAvailable }).eq('id', id).select();
      if (error) throw error;
      return data[0];
    }
    await delay(200);
    const item = mockMenuItems.find(i => i.id === id);
    if (item) item.is_available = isAvailable;
    return item;
  },

  async deleteMenuItem(id: string) {
    if (supabase) {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    await delay(200);
    const idx = mockMenuItems.findIndex(i => i.id === id);
    if (idx > -1) mockMenuItems.splice(idx, 1);
  },

  // ===================== ORDERS =====================
  async getOrders() {
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    await delay(200);
    return loadMockOrders().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getOrderById(id: string) {
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
    await delay(200);
    const orders = loadMockOrders();
    return orders.find((o: any) => o.id === id) || null;
  },

  async createOrder(order: any) {
    if (supabase) {
      const { data, error } = await supabase.from('orders').insert([order]).select();
      if (error) throw error;
      return data[0];
    }
    await delay(200);
    const orders = loadMockOrders();
    const newOrder = { ...order, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
    orders.push(newOrder);
    saveMockOrders(orders);
    return newOrder;
  },

  async updateOrderStatus(id: string, status: string) {
    if (supabase) {
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select();
      if (error) throw error;
      return data[0];
    }
    await delay(200);
    const orders = loadMockOrders();
    const order = orders.find((o: any) => o.id === id);
    if (order) {
      order.status = status;
      saveMockOrders(orders);
    }
    return order;
  },

  async updateOrderItems(id: string, items: any[], totalPrice: number) {
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .update({ items_json: items, total_price_iqd: totalPrice })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    }
    await delay(200);
    const orders = loadMockOrders();
    const order = orders.find((o: any) => o.id === id);
    if (order) {
      order.items_json = items;
      order.total_price_iqd = totalPrice;
      saveMockOrders(orders);
    }
    return order;
  },

  async deleteOrder(id: string) {
    if (supabase) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    await delay(200);
    const orders = loadMockOrders();
    const filtered = orders.filter((o: any) => o.id !== id);
    saveMockOrders(filtered);
    return true;
  },

  async deleteAllOrders() {
    if (supabase) {
      const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      if (error) throw error;
      return true;
    }
    await delay(200);
    saveMockOrders([]);
    return true;
  },

  async getOrdersByDateRange(startDate: string, endDate: string) {
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    await delay(200);
    const orders = loadMockOrders();
    return orders.filter((o: any) => {
      const d = new Date(o.created_at);
      return d >= new Date(startDate) && d <= new Date(endDate);
    }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // ===================== WAITER CALLS =====================
  async getActiveWaiterCalls() {
    if (supabase) {
      const { data, error } = await supabase
        .from('waiter_calls')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    await delay(200);
    return loadMockWaiterCalls().filter((c: any) => c.status === 'active');
  },

  async createWaiterCall(tableId: string) {
    if (supabase) {
      const { data, error } = await supabase
        .from('waiter_calls')
        .insert([{ table_id: tableId, status: 'active' }])
        .select();
      if (error) throw error;
      return data[0];
    }
    await delay(200);
    const calls = loadMockWaiterCalls();
    const newCall = { id: Math.random().toString(36).substr(2, 9), table_id: tableId, status: 'active', created_at: new Date().toISOString() };
    calls.push(newCall);
    saveMockWaiterCalls(calls);
    return newCall;
  },

  async dismissWaiterCall(id: string) {
    if (supabase) {
      const { data, error } = await supabase
        .from('waiter_calls')
        .update({ status: 'dismissed' })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    }
    await delay(200);
    const calls = loadMockWaiterCalls();
    const call = calls.find((c: any) => c.id === id);
    if (call) {
      call.status = 'dismissed';
      saveMockWaiterCalls(calls);
    }
    return call;
  },

  // ===================== SEED DATA =====================
  async seedInitialData() {
    if (!supabase) return;
    try {
      // Check if categories exist
      const { data: existingCats } = await supabase.from('categories').select('id').limit(1);
      if (existingCats && existingCats.length > 0) return; // Already seeded

      // Seed categories
      const { data: cats } = await supabase.from('categories').insert([
        { name_en: 'Hot Drinks', name_ku: 'خواردنەوە گەرمەکان' },
        { name_en: 'Cold Drinks', name_ku: 'خواردنەوە ساردەکان' },
        { name_en: 'Desserts', name_ku: 'شیرینی' },
      ]).select();

      if (!cats) return;

      const hotDrinks = cats.find((c: any) => c.name_en === 'Hot Drinks');
      const coldDrinks = cats.find((c: any) => c.name_en === 'Cold Drinks');
      const desserts = cats.find((c: any) => c.name_en === 'Desserts');

      await supabase.from('menu_items').insert([
        { category_id: hotDrinks?.id, name_en: 'Espresso', name_ku: 'ئێسپرێسۆ', description_en: 'Strong black coffee', description_ku: 'قاوەی ڕەشی بەهێز', price_iqd: 2500, image_url: 'https://picsum.photos/seed/espresso/400/300' },
        { category_id: hotDrinks?.id, name_en: 'Cappuccino', name_ku: 'کاپوچینۆ', description_en: 'Espresso with steamed milk foam', description_ku: 'ئێسپرێسۆ بە کەفی شیری گەرم', price_iqd: 3500, image_url: 'https://picsum.photos/seed/cappuccino/400/300' },
        { category_id: coldDrinks?.id, name_en: 'Iced Latte', name_ku: 'لاتێی سەهۆڵین', description_en: 'Chilled coffee with milk', description_ku: 'قاوەی سارد بە شیر', price_iqd: 4000, image_url: 'https://picsum.photos/seed/icedlatte/400/300' },
        { category_id: desserts?.id, name_en: 'Chocolate Cake', name_ku: 'کێکی شوکولاتە', description_en: 'Rich chocolate layer cake', description_ku: 'کێکی شوکولاتەی دەوڵەمەند', price_iqd: 5000, image_url: 'https://picsum.photos/seed/chocolatecake/400/300' },
      ]);
    } catch (e) {
      console.error('Seed error:', e);
    }
  }
};
