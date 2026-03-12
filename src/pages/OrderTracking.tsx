import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../lib/db';
import { Clock, ChefHat, CheckCircle, Bell, FileText, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

const STATUS_STEPS = ['pending', 'preparing', 'ready', 'completed'];

export default function OrderTracking() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const data = await db.getOrderById(orderId);
        setOrder(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
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
        <div className="text-center">
          <p className="text-xl mb-4">{t('orderNotFound')}</p>
          <button onClick={() => navigate(`/?table=${tableId || '1'}`)} className="text-[var(--color-purple-500)] hover:underline">
            {t('backToMenu')}
          </button>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const statusIcons = [
    <Clock size={24} />,
    <ChefHat size={24} />,
    <Bell size={24} />,
    <CheckCircle size={24} />
  ];
  const statusLabels = [t('pending'), t('preparing'), t('ready'), t('completed')];

  return (
    <div className="min-h-screen bg-[var(--color-navy-900)] text-white p-4 pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(`/?table=${order.table_id}`)}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">{t('orderTracking')}</h1>
          <p className="text-sm text-gray-400">{t('table')} #{order.table_id}</p>
        </div>
      </header>

      {/* Status Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-navy-800)] rounded-2xl border border-white/5 p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-8">
          {STATUS_STEPS.map((step, idx) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: idx <= currentStep ? 1 : 0.8,
                    backgroundColor: idx <= currentStep ? (idx === currentStep ? '#8b5cf6' : '#22c55e') : '#1f2937'
                  }}
                  transition={{ delay: idx * 0.1, duration: 0.3 }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 border-2 transition-all ${
                    idx <= currentStep
                      ? idx === currentStep
                        ? 'border-[var(--color-purple-500)] text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                        : 'border-green-500 text-white'
                      : 'border-gray-700 text-gray-600'
                  }`}
                >
                  {statusIcons[idx]}
                </motion.div>
                <span className={`text-xs font-medium text-center ${
                  idx <= currentStep ? 'text-white' : 'text-gray-600'
                }`}>
                  {statusLabels[idx]}
                </span>
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mt-[-24px] transition-colors ${
                  idx < currentStep ? 'bg-green-500' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Current Status Message */}
        <div className="text-center">
          {order.status === 'pending' && (
            <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[var(--color-gold-400)]">
              {t('orderPendingMsg')}
            </motion.p>
          )}
          {order.status === 'preparing' && (
            <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="text-orange-400">
              {t('orderPreparingMsg')}
            </motion.p>
          )}
          {order.status === 'ready' && (
            <motion.p className="text-green-400 font-bold text-lg">
              {t('orderReadyMsg')}
            </motion.p>
          )}
          {order.status === 'completed' && (
            <p className="text-gray-400">{t('orderCompletedMsg')}</p>
          )}
        </div>
      </motion.div>

      {/* Order Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--color-navy-800)] rounded-2xl border border-white/5 p-6 mb-6"
      >
        <h3 className="font-bold text-lg mb-4">{t('orderDetails')}</h3>
        <div className="space-y-3">
          {order.items_json?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <div>
                <p className="font-medium">{lang === 'en' ? item.name_en : item.name_ku}</p>
                <p className="text-sm text-gray-400">x{item.quantity}</p>
              </div>
              <span className="text-[var(--color-gold-400)]">
                {(item.price * item.quantity).toLocaleString()} IQD
              </span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-sm text-yellow-400 font-medium mb-1">{t('notes')}:</p>
            <p className="text-sm text-gray-300">{order.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
          <span className="text-gray-400">{t('total')}</span>
          <span className="text-xl font-bold text-[var(--color-gold-400)]">
            {order.total_price_iqd?.toLocaleString()} IQD
          </span>
        </div>
      </motion.div>

      {/* Receipt Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        <button
          onClick={() => navigate(`/receipt/${orderId}?table=${order.table_id}`)}
          className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <FileText size={18} />
          {t('viewReceipt')}
        </button>
        <button
          onClick={() => navigate(`/?table=${order.table_id}`)}
          className="flex-1 py-3 bg-[var(--color-purple-500)] hover:bg-[var(--color-purple-600)] rounded-xl text-white font-medium transition-colors"
        >
          {t('backToMenu')}
        </button>
      </motion.div>
    </div>
  );
}
