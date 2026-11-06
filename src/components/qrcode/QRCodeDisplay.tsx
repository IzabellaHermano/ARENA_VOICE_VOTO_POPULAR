import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getPublicVotingUrl } from '@/utils/url';
import { Copy, Check, Download, ExternalLink } from 'lucide-react';

interface QRCodeDisplayProps {
  size?: number;
  showActions?: boolean;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  size = 280,
  showActions = true,
  className = '',
}) => {
  const votingUrl = getPublicVotingUrl();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(votingUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleDownloadSVG = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arena-voice-qrcode-${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col items-center text-center space-y-4 ${className}`}>
      {/* Moldura de Alto Contraste para Escaneamento Perfeito (sem sobreposição) */}
      <div
        ref={qrRef}
        className="p-5 sm:p-6 bg-white rounded-3xl shadow-2xl border-4 border-arena-gold/30 flex items-center justify-center transition-transform hover:scale-[1.01]"
        style={{ width: size + 48, height: size + 48 }}
      >
        <QRCodeSVG
          value={votingUrl}
          size={size}
          level="H" // Alta correção de erro para facilidade de leitura por celulares
          includeMargin={false}
          bgColor="#FFFFFF"
          fgColor="#050810"
        />
      </div>

      {/* URL Exibida de Forma Clara */}
      <div className="space-y-1 max-w-sm">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
          Link de Acesso Público
        </p>
        <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-arena-border text-arena-blueLight font-mono text-xs truncate max-w-xs mx-auto">
          {votingUrl}
        </div>
      </div>

      {/* Ações Rápidas (Copiar e Baixar SVG) */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-arena-border text-xs font-bold transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-arena-gold" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadSVG}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-arena-border text-xs font-bold transition-colors"
            title="Download do QR Code em vetor SVG para banners e crachás"
          >
            <Download className="w-3.5 h-3.5 text-arena-blueLight" />
            <span>Baixar SVG</span>
          </button>

          <a
            href={votingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-arena-red/20 hover:bg-arena-red/30 text-white border border-arena-red/40 text-xs font-bold transition-colors"
          >
            <span>Testar /votar</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
