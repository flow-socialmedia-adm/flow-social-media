import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { XIcon, UploadCloudIcon, GoogleDriveIcon } from '../icons';
import TooltipHint from '../TooltipHint';
import { UPLOAD_MAX_BYTES } from '../../lib/api';
import { compressImageToMaxBytes } from '../../lib/compressImage';
import { getCroppedImageCircle, type Area } from '../../lib/cropImage';
import Cropper from 'react-easy-crop';

const GOOGLE_DRIVE_ENABLED = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_API_KEY);

function isSvgFile(file: File): boolean {
    return file.type === 'image/svg+xml' || (file.name || '').toLowerCase().endsWith('.svg');
}

/** Centraliza o crop na imagem (aspect 1) considerando o zoom: crop em % para o quadrado ficar no centro. */
function getCenterCrop(mediaWidth: number, mediaHeight: number, zoom: number): { x: number; y: number } {
    const w = mediaWidth;
    const h = mediaHeight;
    const size = Math.min(w, h) / zoom;
    return {
        x: 50 * (1 - size / w),
        y: 50 * (1 - size / h),
    };
}

export const UploadModal: React.FC<{
    onClose: () => void;
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
    uploadError?: string | null;
    onValidationError?: (message: string | null) => void;
    /** 'avatar' = header (JPG + fundo branco). 'logo' = card Logotipos. 'persona_photo' = crop redondo como logo. 'photo' | 'graphic' = preview sem crop. 'icon' = SVG só preview; raster = crop como logo. */
    uploadTarget?: 'avatar' | 'logo' | 'photo' | 'graphic' | 'icon' | 'persona_photo';
    /** Quando definido, modal inicia já com este arquivo (ex.: ícone escolhido na seção). Apenas para uploadTarget === 'icon'. */
    initialFile?: File | null;
    onInitialFileConsumed?: () => void;
    readOnly?: boolean;
}> = ({ onClose, onFileSelect, isLoading, uploadError, onValidationError, uploadTarget = 'avatar', initialFile = null, onInitialFileConsumed, readOnly = false }) => {
    const { t } = useContext(AppContext)!;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'computer' | 'drive'>('computer');
    const [isDragging, setIsDragging] = useState(false);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [cropObjectUrl, setCropObjectUrl] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const croppedAreaPixelsRef = useRef<Area | null>(null);
    const mediaSizeRef = useRef<{ width: number; height: number } | null>(null);
    const [cropConfirming, setCropConfirming] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const initialFileProcessedRef = useRef(false);

    const isAssetTargetPreviewOnly = uploadTarget === 'photo' || uploadTarget === 'graphic';

    useEffect(() => {
        if (!cropObjectUrl) {
            mediaSizeRef.current = null;
            return;
        }
        const img = new Image();
        img.onload = () => {
            mediaSizeRef.current = { width: img.naturalWidth, height: img.naturalHeight };
        };
        img.onerror = () => {
            mediaSizeRef.current = null;
        };
        img.src = cropObjectUrl;
        return () => {
            img.src = '';
        };
    }, [cropObjectUrl]);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const openCrop = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            onValidationError?.('Selecione uma imagem (JPEG, PNG ou WebP).');
            return;
        }
        const skipSizeCheck = uploadTarget === 'logo' || uploadTarget === 'icon';
        if (!skipSizeCheck && file.size > UPLOAD_MAX_BYTES) {
            onValidationError?.('Arquivo muito grande. Máximo 5MB.');
            return;
        }
        onValidationError?.(null);
        setCropFile(file);
        setCropObjectUrl(URL.createObjectURL(file));
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        croppedAreaPixelsRef.current = null;
    }, [onValidationError, uploadTarget]);

    const closeCrop = useCallback(() => {
        if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
        setCropFile(null);
        setCropObjectUrl(null);
        setCropConfirming(false);
    }, [cropObjectUrl]);

    const closePreview = useCallback(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewFile(null);
        setPreviewUrl(null);
    }, [previewUrl]);

    const handleFileSelected = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            onValidationError?.('Selecione uma imagem (JPEG, PNG ou WebP).');
            return;
        }
        if (uploadTarget === 'icon' && isSvgFile(file)) {
            onValidationError?.(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            return;
        }
        if (uploadTarget === 'icon' && !isSvgFile(file)) {
            if (file.size > UPLOAD_MAX_BYTES) {
                setIsCompressing(true);
                onValidationError?.(null);
                try {
                    const reduced = await compressImageToMaxBytes(file, UPLOAD_MAX_BYTES);
                    openCrop(reduced);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Não foi possível reduzir a imagem. Tente outra.';
                    onValidationError?.(msg);
                } finally {
                    setIsCompressing(false);
                }
            } else {
                openCrop(file);
            }
            return;
        }
        if (uploadTarget === 'persona_photo') {
            if (file.size > UPLOAD_MAX_BYTES) {
                setIsCompressing(true);
                onValidationError?.(null);
                try {
                    const reduced = await compressImageToMaxBytes(file, UPLOAD_MAX_BYTES);
                    openCrop(reduced);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Não foi possível reduzir a imagem. Tente outra.';
                    onValidationError?.(msg);
                } finally {
                    setIsCompressing(false);
                }
            } else {
                openCrop(file);
            }
            return;
        }
        if (isAssetTargetPreviewOnly) {
            if (file.size > UPLOAD_MAX_BYTES) {
                setIsCompressing(true);
                onValidationError?.(null);
                try {
                    const reduced = await compressImageToMaxBytes(file, UPLOAD_MAX_BYTES);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewFile(reduced);
                    setPreviewUrl(URL.createObjectURL(reduced));
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Não foi possível reduzir a imagem. Tente outra.';
                    onValidationError?.(msg);
                } finally {
                    setIsCompressing(false);
                }
            } else {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewFile(file);
                setPreviewUrl(URL.createObjectURL(file));
            }
            return;
        }
        if (uploadTarget === 'logo' && file.size > UPLOAD_MAX_BYTES) {
            setIsCompressing(true);
            onValidationError?.(null);
            try {
                const reduced = await compressImageToMaxBytes(file, UPLOAD_MAX_BYTES);
                openCrop(reduced);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Não foi possível reduzir a imagem. Tente outra.';
                onValidationError?.(msg);
            } finally {
                setIsCompressing(false);
            }
            return;
        }
        openCrop(file);
    }, [uploadTarget, isAssetTargetPreviewOnly, onValidationError, openCrop, previewUrl]);

    useEffect(() => {
        if (!initialFile || uploadTarget !== 'icon' || initialFileProcessedRef.current) return;
        initialFileProcessedRef.current = true;
        handleFileSelected(initialFile);
        onInitialFileConsumed?.();
    }, [initialFile, uploadTarget, onInitialFileConsumed, handleFileSelected]);

    const handlePreviewConfirm = useCallback(() => {
        if (!previewFile) return;
        onFileSelect(previewFile);
        closePreview();
    }, [previewFile, onFileSelect, closePreview]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelected(file);
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading) setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isLoading) return;
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelected(file);
    };

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        croppedAreaPixelsRef.current = croppedAreaPixels;
    }, []);

    const getCroppedAreaPixels = useCallback((): Area | null => {
        const media = mediaSizeRef.current;
        if (media) {
            const { width: w, height: h } = media;
            const size = Math.min(w, h) / zoom;
            const x = (crop.x / 100) * w;
            const y = (crop.y / 100) * h;
            return { x: Math.round(x), y: Math.round(y), width: Math.round(size), height: Math.round(size) };
        }
        return croppedAreaPixelsRef.current;
    }, [crop.x, crop.y, zoom]);

    const handleCropConfirm = useCallback(async () => {
        const pixels = croppedAreaPixelsRef.current ?? getCroppedAreaPixels();
        if (!cropObjectUrl || !pixels || !cropFile) return;
        setCropConfirming(true);
        const preservePng = (uploadTarget === 'logo' || uploadTarget === 'icon' || uploadTarget === 'persona_photo') && (cropFile.type === 'image/png' || cropFile.type === 'image/webp');
        try {
            const blob = await getCroppedImageCircle(
                cropObjectUrl,
                pixels,
                '#ffffff',
                { outputFormat: preservePng ? 'png' : 'jpeg' },
            );
            if (!(blob instanceof Blob) || blob.size === 0) {
                onValidationError?.('Falha ao gerar a imagem. Tente novamente.');
                return;
            }
            if (preservePng) {
                const baseName = cropFile.name.replace(/\.[^.]+$/, '') || (uploadTarget === 'persona_photo' ? 'persona' : 'logo');
                const file = new File([blob], `${baseName}.png`, { type: 'image/png' });
                closeCrop();
                onFileSelect(file);
                return;
            }
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
                onValidationError?.('Imagem gerada inválida. Tente outra foto.');
                return;
            }
            const fileName = uploadTarget === 'persona_photo' ? 'persona.jpg' : 'logo.jpg';
            const file = new File([bytes], fileName, { type: 'image/jpeg' });
            closeCrop();
            onFileSelect(file);
        } catch (err) {
            console.error('[crop]', err);
            onValidationError?.('Falha ao processar a imagem. Tente novamente.');
        } finally {
            setCropConfirming(false);
        }
    }, [cropObjectUrl, cropFile, uploadTarget, getCroppedAreaPixels, onFileSelect, closeCrop, onValidationError]);

    const driveTooltip = 'Configuração necessária: credenciais do Google (Client ID/API Key)';
    const showCropStep = cropFile && cropObjectUrl;
    const showPreviewStep = !!previewFile && !!previewUrl && (isAssetTargetPreviewOnly || uploadTarget === 'icon');

    const handleHeaderClose = () => {
        if (showCropStep) closeCrop();
        else if (showPreviewStep) closePreview();
        else onClose();
    };

    if (readOnly) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('choose_upload_method')}</h3>
                    <div className="rounded-lg border border-slate-200/90 dark:border-slate-600/50 bg-slate-50/90 dark:bg-slate-800/40 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{t('read_only_badge')}</p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400 leading-snug">{t('read_only_hint')}</p>
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            {t('close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between shrink-0 p-5 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {showCropStep ? 'Ajustar imagem' : showPreviewStep ? t('confirm') : isCompressing ? 'Reduzindo imagem...' : (initialFile && uploadTarget === 'icon') ? 'Preparando...' : isLoading ? 'Enviando...' : t('choose_upload_method')}
                    </h3>
                    <button type="button" onClick={handleHeaderClose} disabled={!!isLoading || isCompressing} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50" aria-label={t('close')}><XIcon className="w-5 h-5" /></button>
                </div>
                {uploadError && !showCropStep && !showPreviewStep && (
                    <div className="shrink-0 px-5 pt-3 pb-1">
                        <p className="text-sm text-orange-600 dark:text-orange-400" role="alert">{uploadError}</p>
                    </div>
                )}
                {showCropStep ? (
                    <div className="flex-1 min-h-0 flex flex-col p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">Arraste para centralizar • Zoom abaixo</p>
                        <div
                            className="relative w-full flex-1 min-h-[280px] rounded-xl overflow-hidden"
                            style={{
                                backgroundImage: 'linear-gradient(45deg, #d1d5db 25%, transparent 25%), linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)',
                                backgroundSize: '14px 14px',
                                backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0',
                                backgroundColor: '#e5e7eb',
                            }}
                        >
                            <Cropper
                                image={cropObjectUrl}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                restrictPosition={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                style={{
                                    containerStyle: { backgroundColor: 'transparent' },
                                    mediaStyle: { backgroundColor: 'transparent' },
                                    cropAreaStyle: { backgroundColor: 'transparent' },
                                }}
                            />
                        </div>
                        <div className="mt-4 px-2 flex flex-wrap items-center gap-4">
                            <div className="flex-1 min-w-[120px]">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Zoom</label>
                                <input type="range" min={0.25} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-600 accent-indigo-500" />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const media = mediaSizeRef.current;
                                    if (media) setCrop(getCenterCrop(media.width, media.height, zoom));
                                    else setCrop({ x: 0, y: 0 });
                                }}
                                className="self-end py-2 px-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                Centralizar
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                            {uploadTarget === 'logo' ? 'PNG/WebP mantêm transparência no arquivo. No header, o fundo é exibido em branco.' : 'PNGs transparentes recebem fundo branco no resultado.'}
                        </p>
                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={closeCrop} disabled={cropConfirming} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50">{t('cancel')}</button>
                            <button type="button" onClick={handleCropConfirm} disabled={cropConfirming} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{cropConfirming ? 'Gerando...' : 'Confirmar'}</button>
                        </div>
                    </div>
                ) : initialFile && uploadTarget === 'icon' && !showCropStep && !showPreviewStep ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">Preparando...</div>
                ) : showPreviewStep && previewUrl ? (
                    <div className="flex-1 min-h-0 flex flex-col p-4">
                        <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <img src={previewUrl} alt="" className="max-w-full max-h-[60vh] w-auto h-auto object-contain" />
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={closePreview} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">{t('cancel')}</button>
                            <button type="button" onClick={handlePreviewConfirm} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">{t('confirm')}</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <button type="button" onClick={() => setActiveTab('computer')} className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'computer' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>{t('upload_from_computer')}</button>
                            <TooltipHint label={GOOGLE_DRIVE_ENABLED ? t('import_from_google_drive') : driveTooltip}>
                                <button
                                    type="button"
                                    onClick={() => GOOGLE_DRIVE_ENABLED && setActiveTab('drive')}
                                    className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'drive' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : GOOGLE_DRIVE_ENABLED ? 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400' : 'border-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                                    disabled={!GOOGLE_DRIVE_ENABLED}
                                    aria-label={GOOGLE_DRIVE_ENABLED ? t('import_from_google_drive') : driveTooltip}
                                >
                                    <GoogleDriveIcon className="w-4 h-4" />
                                    {t('import_from_google_drive')}
                                </button>
                            </TooltipHint>
                        </div>
                        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col items-center justify-center">
                            <div className="w-full max-w-md mx-auto">
                                {activeTab === 'computer' && (
                                    <>
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${isCompressing ? 'opacity-70 pointer-events-none' : ''} ${isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 hover:border-gray-400 dark:hover:border-gray-500'}`}
                                        >
                                            <UploadCloudIcon className={`w-14 h-14 mx-auto mb-4 ${isDragging ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'}`} />
                                            <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">Arraste e solte</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">JPG, PNG ou WebP • até 5MB{uploadTarget === 'logo' ? ' (arquivos maiores são reduzidos automaticamente)' : ''}</p>
                                            <button type="button" onClick={() => !isLoading && !isCompressing && fileInputRef.current?.click()} disabled={!!isLoading || isCompressing} className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Selecionar arquivo</button>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/webp" />
                                    </>
                                )}
                                {activeTab === 'drive' && (
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-gray-800/30">
                                        <GoogleDriveIcon className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('import_from_google_drive')}</p>
                                        <TooltipHint label={driveTooltip}>
                                            <button
                                                type="button"
                                                disabled
                                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                                                aria-describedby="drive-tooltip"
                                                aria-label={driveTooltip}
                                            >
                                                Em breve
                                            </button>
                                        </TooltipHint>
                                        <p id="drive-tooltip" className="mt-3 text-xs text-gray-500 dark:text-gray-400">{driveTooltip}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
