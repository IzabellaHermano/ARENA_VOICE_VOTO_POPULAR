import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/supabase/client';

export interface ProjectBannerUploadProps {
  currentBannerUrl?: string;
  onBannerUploaded: (url: string) => void;
  onBannerRemoved: () => void;
  className?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export const ProjectBannerUpload: React.FC<ProjectBannerUploadProps> = ({
  currentBannerUrl,
  onBannerUploaded,
  onBannerRemoved,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentBannerUrl || '');
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validação de Formato
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage('Formato inválido. Apenas imagens PNG, JPG/JPEG ou WEBP são permitidas.');
      return;
    }

    // 2. Validação de Tamanho (Máx 5 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`O arquivo excede o limite máximo de 5 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    const sizeFormatted =
      file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    setFileName(file.name);
    setFileSizeText(sizeFormatted);

    // 3. Prévia instantânea no navegador
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // 4. Upload para o Supabase Storage (Bucket: project-banners)
    setIsUploading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase não configurado no ambiente.');
      }

      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${Date.now()}_${cleanName}`;
      const filePath = `banners/${uniqueFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.warn('Falha no upload do Supabase Storage:', uploadError.message);
        // Se o bucket ainda não tiver sido criado no Supabase, orienta o administrador
        if (uploadError.message.includes('not found') || uploadError.message.includes('bucket')) {
          setErrorMessage(
            'Bucket "project-banners" não localizado no Supabase. Crie o bucket com permissão pública no Storage ou execute o script SQL.'
          );
        } else {
          setErrorMessage(`Erro ao enviar arquivo para o Supabase Storage: ${uploadError.message}`);
        }
        setIsUploading(false);
        return;
      }

      // Obtém URL Pública definitiva do arquivo armazenado
      const { data: publicData } = supabase.storage
        .from('project-banners')
        .getPublicUrl(uploadData.path);

      const finalUrl = publicData.publicUrl;
      setPreviewUrl(finalUrl);
      onBannerUploaded(finalUrl);
      setSuccessMessage('Banner enviado e vinculado com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload de banner:', err);
      setErrorMessage(err?.message || 'Falha ao processar upload do banner.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    setFileName('');
    setFileSizeText('');
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onBannerRemoved();
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
          Banner Oficial do Projeto
        </label>
        <span className="text-[11px] font-semibold text-gray-400">
          Recomendado: 16:9 • Máx 5 MB (PNG, JPG, WEBP)
        </span>
      </div>

      {/* Input de arquivo invisível */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Se houver imagem ou prévia selecionada */}
      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-arena-border bg-arena-black shadow-lg group">
          {/* Container 16:9 sem distorção */}
          <div className="relative aspect-video w-full flex items-center justify-center bg-gradient-to-br from-[#0C182D] to-black">
            <img
              src={previewUrl}
              alt="Prévia do Banner"
              className="w-full h-full object-cover"
            />

            {/* Overlay com Ações de Substituir e Remover */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/20 transition-all shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                <span>Substituir Imagem</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="px-3.5 py-2 rounded-xl bg-arena-red/80 hover:bg-arena-red text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            </div>
          </div>

          {/* Rodapé da Imagem com Nome e Tamanho */}
          <div className="p-3 bg-arena-card/90 border-t border-arena-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate pr-2">
              <ImageIcon className="w-4 h-4 text-arena-gold shrink-0" />
              <span className="text-gray-200 font-medium truncate font-mono">
                {fileName || 'banner-projeto.png'}
              </span>
              {fileSizeText && (
                <span className="text-[10px] text-gray-400 font-mono">({fileSizeText})</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isUploading ? (
                <span className="text-arena-blue font-bold flex items-center gap-1.5 text-[11px]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Enviando...
                </span>
              ) : (
                <span className="text-arena-green font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Pronto
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Área de Drag and Drop para quando não há banner */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-arena-red bg-arena-red/10 scale-[1.01]'
              : 'border-arena-border hover:border-arena-borderLight bg-arena-black/60 hover:bg-arena-black'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-arena-gold mb-3 shadow-gold-glow">
            {isUploading ? (
              <Loader2 className="w-7 h-7 animate-spin text-arena-blue" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-white">
              <span className="text-arena-gold">Clique para selecionar</span> ou arraste a imagem aqui
            </p>
            <p className="text-xs text-gray-400">
              Proporção sugerida 16:9 para encaixe perfeito no Telão e Celular
            </p>
          </div>

          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400 font-mono">
            <span>PNG, JPG, WEBP até 5 MB</span>
          </div>
        </div>
      )}

      {/* Feedback de Erro */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Feedback de Sucesso */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ProjectBannerUpload;
