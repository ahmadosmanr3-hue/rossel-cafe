/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Mock data fallback (used when Supabase is not configured)
export const mockCategories: any[] = [
  { id: '1', name_en: 'Hot Drinks', name_ku: 'خواردنەوە گەرمەکان' },
  { id: '2', name_en: 'Cold Drinks', name_ku: 'خواردنەوە ساردەکان' },
  { id: '3', name_en: 'Desserts', name_ku: 'شیرینی' },
];

export const mockMenuItems: any[] = [
  { id: '1', category_id: '1', name_en: 'Espresso', name_ku: 'ئێسپرێسۆ', description_en: 'Strong black coffee', description_ku: 'قاوەی ڕەشی بەهێز', price_iqd: 2500, image_url: 'https://picsum.photos/seed/espresso/400/300', is_available: true },
  { id: '2', category_id: '1', name_en: 'Cappuccino', name_ku: 'کاپوچینۆ', description_en: 'Espresso with steamed milk foam', description_ku: 'ئێسپرێسۆ بە کەفی شیری گەرم', price_iqd: 3500, image_url: 'https://picsum.photos/seed/cappuccino/400/300', is_available: true },
  { id: '3', category_id: '2', name_en: 'Iced Latte', name_ku: 'لاتێی سەهۆڵین', description_en: 'Chilled coffee with milk', description_ku: 'قاوەی سارد بە شیر', price_iqd: 4000, image_url: 'https://picsum.photos/seed/icedlatte/400/300', is_available: true },
  { id: '4', category_id: '3', name_en: 'Chocolate Cake', name_ku: 'کێکی شوکولاتە', description_en: 'Rich chocolate layer cake', description_ku: 'کێکی شوکولاتەی دەوڵەمەند', price_iqd: 5000, image_url: 'https://picsum.photos/seed/chocolatecake/400/300', is_available: true },
];

// localStorage-backed mock orders
const MOCK_ORDERS_KEY = 'rosel_mock_orders';
const MOCK_WAITER_CALLS_KEY = 'rosel_mock_waiter_calls';

export function loadFromStorage(key: string, defaults: any[] = []): any[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore */ }
  saveToStorage(key, defaults);
  return [...defaults];
}

export function saveToStorage(key: string, data: any[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

export function loadMockOrders(): any[] {
  return loadFromStorage(MOCK_ORDERS_KEY, []);
}

export function saveMockOrders(orders: any[]) {
  saveToStorage(MOCK_ORDERS_KEY, orders);
}

export function loadMockWaiterCalls(): any[] {
  return loadFromStorage(MOCK_WAITER_CALLS_KEY, []);
}

export function saveMockWaiterCalls(calls: any[]) {
  saveToStorage(MOCK_WAITER_CALLS_KEY, calls);
}
