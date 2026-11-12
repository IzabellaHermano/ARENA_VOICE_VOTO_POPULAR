import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/supabase/client';

export interface ProjectBannerUploadProps {
  currentBannerUrl?: string;
  onBannerUploaded: (url: string, storagePath?: string) => void;
  onBannerRemoved: () => void;
  className?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/**
 * Validação rigorosa do arquivo: checa se o conteúdo é realmente uma imagem
 * decodificável pelo browser (evita arquivos maliciosos ou texto renomeado como imagem).
 */
const validateIsRealImage = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(false);
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };
    img.src = objectUrl;
  });
};

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

  // Sincroniza com currentBannerUrl caso mude externamente (ex.: troca de projeto a editar)
  useEffect(() => {
    setPreviewUrl(currentBannerUrl || '');
    if (!currentBannerUrl) {
      setFileName('');
      setFileSizeText('');
    }
  }, [currentBannerUrl]);

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validação de Extensão de Arquivo
    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage('Formato inválido por extensão. Apenas imagens PNG, JPG/JPEG ou WEBP são permitidas.');
      return;
    }

    // 2. Validação de Formato MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage('Formato de mídia não permitido. Apenas PNG, JPG/JPEG e WEBP são aceitos.');
      return;
    }

    // 3. Validação de Tamanho (Máximo 5 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`O arquivo selecionado excede o limite máximo de 5 MB (${sizeMb} MB). Reduza o tamanho da imagem.`);
      return;
    }

    // 4. Validação Real de Imagem (Impede arquivos falsos ou corrompidos)
    const isRealImage = await validateIsRealImage(file);
    if (!isRealImage) {
      setErrorMessage('O arquivo selecionado não é uma imagem válida decodificável ou está corrompido.');
      return;
    }

    const sizeFormatted =
      file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    setFileName(file.name);
    setFileSizeText(sizeFormatted);

    // Pré-visualização instantânea local
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // 5. Upload para o Supabase Storage (Bucket: project-banners)
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
        console.warn('Falha no upload do Supabase Storage:', uploadError);
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(currentBannerUrl || '');

        const errCode = (uploadError as any).statusCode || (uploadError as any).status;
        const msg = uploadError.message || '';

        if (msg.includes('not found') || msg.includes('bucket') || errCode === '404' || errCode === 404) {
          setErrorMessage(
            'Bucket "project-banners" não foi criado no Supabase Storage. É necessário autorizar o script SQL incremental de criação do bucket.'
          );
        } else if (errCode === '403' || errCode === 403 || msg.includes('policy') || msg.includes('row-level security')) {
          setErrorMessage(
            'Permissão negada pelo Supabase Storage (RLS). Apenas administradores autenticados podem enviar banners para o bucket "project-banners".'
          );
        } else {
          setErrorMessage(`Erro ao enviar arquivo para o Supabase Storage: ${msg}`);
        }
        setIsUploading(false);
        return;
      }

      // Obtém URL Pública permanente do arquivo armazenado
      const { data: publicData } = supabase.storage
        .from('project-banners')
        .getPublicUrl(uploadData.path);

      const finalUrl = publicData.publicUrl;
      setPreviewUrl(finalUrl);
      onBannerUploaded(finalUrl, uploadData.path);
      setSuccessMessage('Banner enviado e vinculado com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload de banner:', err);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(currentBannerUrl || '');
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
          Proporção: 16:9 • Máx 5 MB (PNG, JPG, WEBP)
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
          {/* Container 16:9 mantendo proporção ideal */}
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
                {fileName || 'banner-cadastrado.png'}
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

          {/* Botão em destaque "ADICIONAR BANNER" */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
            className="mt-3.5 px-4 py-2 rounded-xl bg-gradient-to-r from-arena-red to-[#B3050F] hover:from-[#FF1E27] hover:to-arena-red text-white text-xs font-black uppercase tracking-wider shadow-neon-glow transition-all flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            <span>ADICIONAR BANNER</span>
          </button>

          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400 font-mono">
            <span>PNG, JPG, WEBP até 5 MB</span>
          </div>
        </div>
      )}

      {/* Feedback de Erro */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Feedback de Sucesso */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ProjectBannerUpload;
