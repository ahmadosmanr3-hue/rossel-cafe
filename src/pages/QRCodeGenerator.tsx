import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { QrCode, Printer, Globe } from 'lucide-react';

// Simple QR Code generator using Google Charts API
function getQRCodeUrl(text: string, size: number = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=000000&margin=10`;
}

interface QRCodeGeneratorProps {
  baseUrl: string;
}

export default function QRCodeGenerator({ baseUrl: initialBaseUrl }: QRCodeGeneratorProps) {
  const { t } = useLanguage();
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl || 'http://localhost:3000');
  const [tableCount, setTableCount] = useState(25);

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('qrCodes')}</h2>

      {/* Settings */}
      <div className="bg-[var(--color-navy-800)] rounded-2xl border border-white/5 p-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('baseUrl')}</label>
            <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://your-cafe.com"
                className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[var(--color-purple-500)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('numberOfTables')}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={tableCount}
              onChange={e => setTableCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full bg-[var(--color-navy-700)] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--color-purple-500)]"
            />
          </div>
        </div>
        <button
          onClick={handlePrintAll}
          className="mt-4 w-full py-3 bg-[var(--color-purple-500)] hover:bg-[var(--color-purple-600)] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Printer size={18} />
          {t('printAll')}
        </button>
      </div>

      {/* QR Code Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 print:grid-cols-3 print:gap-6">
        {tables.map(tableNum => {
          const url = `${baseUrl}/?table=${tableNum}`;
          return (
            <div
              key={tableNum}
              className="bg-[var(--color-navy-800)] rounded-2xl border border-white/5 p-4 text-center print:bg-white print:border-gray-300 print:rounded-lg print:shadow-sm break-inside-avoid"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <QrCode size={16} className="text-[var(--color-purple-500)] print:text-purple-600" />
                <span className="font-bold text-lg print:text-black">{t('table')} {tableNum}</span>
              </div>
              <div className="bg-white rounded-xl p-3 mb-3 inline-block">
                <img
                  src={getQRCodeUrl(url, 180)}
                  alt={`Table ${tableNum} QR Code`}
                  className="w-[180px] h-[180px]"
                  crossOrigin="anonymous"
                />
              </div>
              <p className="text-xs text-gray-500 break-all print:text-gray-600">{url}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
