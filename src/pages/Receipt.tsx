import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../lib/db';
import { Printer, ArrowLeft } from 'lucide-react';

export default function Receipt() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    db.getOrderById(orderId).then(data => {
      setOrder(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-navy-900)] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-white/20 border-t-[var(--color-purple-500)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[var(--color-navy-900)] flex items-center justify-center text-white">
        <p>{t('orderNotFound')}</p>
      </div>
    );
  }

  const date = new Date(order.created_at);

  return (
    <div className="min-h-screen bg-[var(--color-navy-900)] text-white p-4">
      {/* Action Buttons - Hidden during print */}
      <div className="flex gap-3 mb-6 print:hidden">
        <button
          onClick={() => navigate(`/order/${orderId}?table=${tableId || order.table_id}`)}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 py-3 bg-[var(--color-purple-500)] hover:bg-[var(--color-purple-600)] rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Printer size={18} />
          {t('printReceipt')}
        </button>
      </div>

      {/* Receipt Card */}
      <div className="max-w-md mx-auto bg-[var(--color-navy-800)] rounded-2xl border border-white/10 overflow-hidden print:bg-white print:text-black print:border-gray-200 print:shadow-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--color-purple-500)] to-[var(--color-purple-600)] p-6 text-center print:bg-gray-100 print:text-black">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-bold text-2xl text-white mx-auto mb-3 print:bg-gray-300 print:text-black">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-wider">ROSEL CAFE</h1>
          <p className="text-white/70 text-sm mt-1 print:text-gray-500">{t('receipt')}</p>
        </div>

        {/* Order Info */}
        <div className="p-6">
          <div className="flex justify-between text-sm text-gray-400 mb-4 pb-4 border-b border-white/10 print:border-gray-200 print:text-gray-600">
            <div>
              <p>{t('table')}: #{order.table_id}</p>
              <p>{t('orderNumber')}: #{order.id?.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p>{date.toLocaleDateString()}</p>
              <p>{date.toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3 mb-4">
            {order.items_json?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <div className="flex-1">
                  <span className="text-gray-400 mr-2">{item.quantity}x</span>
                  <span className="text-white print:text-black">{lang === 'en' ? item.name_en : item.name_ku}</span>
                </div>
                <span className="text-gray-300 print:text-gray-700">
                  {(item.price * item.quantity).toLocaleString()} IQD
                </span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="text-sm text-gray-400 mb-4 pb-4 border-b border-white/10 border-t pt-4 print:border-gray-200">
              <p className="font-medium mb-1">{t('notes')}:</p>
              <p>{order.notes}</p>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-white/10 pt-4 print:border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">{t('total')}</span>
              <span className="text-xl font-bold text-[var(--color-gold-400)] print:text-black">
                {order.total_price_iqd?.toLocaleString()} IQD
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-dashed border-white/10 print:border-gray-300">
            <p className="text-gray-500 text-sm">{t('thankYou')}</p>
            <p className="text-gray-600 text-xs mt-1">ROSEL CAFE</p>
          </div>
        </div>
      </div>
    </div>
  );
}
