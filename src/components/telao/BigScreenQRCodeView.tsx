import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { getPublicVotingUrl } from '@/utils/url';
import { ArenaLogo } from '@/components/branding';
import { Sparkles, Copy, Check, Smartphone, ShieldCheck } from 'lucide-react';

export interface BigScreenQRCodeViewProps {
  className?: string;
  size?: number;
}

export const BigScreenQRCodeView: React.FC<BigScreenQRCodeViewProps> = ({
  className = '',
  size = 280,
}) => {
  const votingUrl = getPublicVotingUrl();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(votingUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-8 py-6 z-10 max-w-5xl mx-auto w-full relative overflow-hidden select-none ${className}`}
    >
      {/* Luzes Volumétricas de Fundo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[360px] bg-gradient-to-r from-arena-red/15 via-arena-gold/15 to-transparent blur-[160px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="space-y-6 flex flex-col items-center max-w-xl w-full"
      >
        {/* Logo Oficial */}
        <ArenaLogo
          variant="complete"
          width={300}
          className="max-w-[240px] sm:max-w-[300px] drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)]"
        />

        {/* Badge e Título */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-arena-red/20 to-arena-gold/20 border border-arena-gold/40 text-arena-gold text-xs font-black uppercase tracking-widest shadow-gold-glow">
            <Sparkles className="w-3.5 h-3.5 text-arena-gold" />
            <span>ACESSE A VOTAÇÃO</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            VOTO <span className="text-arena-red">POPULAR</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 font-medium max-w-md mx-auto">
            Aponte a câmera do seu celular para votar nos projetos em tempo real.
          </p>
        </div>

        {/* Moldura Tecnológica Escura do QR Code (Sem o cartão branco gigante) */}
        <div className="relative group p-6 sm:p-7 rounded-[32px] bg-gradient-to-b from-[#131728] via-[#0C0F1B] to-[#070912] border-2 border-arena-gold/50 shadow-[0_0_60px_rgba(255,196,0,0.2)] flex flex-col items-center">
          {/* Efeito Glow Suave ao Redor */}
          <div className="absolute -inset-1 bg-gradient-to-r from-arena-red/20 via-arena-gold/25 to-arena-red/20 rounded-[34px] blur-lg opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none" />

          {/* Área Clara Mínima Exclusiva para os Módulos do QR Code */}
          <div className="relative p-3.5 sm:p-4 bg-white rounded-2xl shadow-2xl flex items-center justify-center">
            <QRCodeSVG
              value={votingUrl}
              size={size}
              level="H"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#050810"
            />
          </div>

          {/* Link Público Discreto Abaixo do QR Code */}
          <div className="relative mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 border border-white/15 text-arena-blue font-mono text-xs font-semibold tracking-wide">
            <Smartphone className="w-3.5 h-3.5 text-arena-gold shrink-0" />
            <span className="truncate max-w-[240px] sm:max-w-[300px]">
              {votingUrl.replace(/^https?:\/\//, '')}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
              title="Copiar link"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Informação Complementar Discreta */}
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Acesso direto sem necessidade de cadastro • 1 voto por projeto</span>
        </div>
      </motion.div>
    </div>
  );
};

export default BigScreenQRCodeView;

