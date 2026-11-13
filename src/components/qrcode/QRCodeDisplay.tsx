import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getPublicVotingUrl } from '@/utils/url';
import { Copy, Check, Download, ExternalLink, Sparkles } from 'lucide-react';

interface QRCodeDisplayProps {
  size?: number;
  showActions?: boolean;
  className?: string;
  badgeLabel?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  size = 260,
  showActions = true,
  className = '',
  badgeLabel = 'ACESSE A VOTAÇÃO',
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
      {/* Moldura Tecnológica Escura (Sem o grande cartão branco) */}
      <div
        ref={qrRef}
        className="relative group p-5 sm:p-6 rounded-[30px] bg-gradient-to-b from-[#131728] via-[#0C0F1B] to-[#070912] border-2 border-arena-gold/50 shadow-[0_0_50px_rgba(255,196,0,0.18)] flex flex-col items-center justify-center transition-all"
      >
        {/* Glow Decorativo */}
        <div className="absolute -inset-1 bg-gradient-to-r from-arena-red/15 via-arena-gold/20 to-arena-red/15 rounded-[32px] blur-md opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none" />

        {/* Badge Discreta Superior */}
        {badgeLabel && (
          <div className="relative mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-gold/15 border border-arena-gold/30 text-arena-gold text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-arena-gold" />
            <span>{badgeLabel}</span>
          </div>
        )}

        {/* Área Clara MÍNIMA Necessária para os Módulos Ópticos do QR Code */}
        <div className="relative p-3.5 bg-white rounded-2xl shadow-xl flex items-center justify-center">
          <QRCodeSVG
            value={votingUrl}
            size={size}
            level="H" // Alta correção de erro para facilidade de leitura por celulares
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#050810"
          />
        </div>

        {/* Link de Acesso Público Discreto */}
        <div className="relative mt-3.5 px-3.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-arena-blue font-mono text-[11px] font-semibold tracking-wide max-w-xs truncate">
          {votingUrl.replace(/^https?:\/\//, '')}
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
            <Download className="w-3.5 h-3.5 text-arena-blue" />
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
