/**
 * Reservado para MVP+ — não integrado ao fluxo atual.
 * PostActions avança para `agendado` via `publishDate` + PATCH /tasks/:id/status.
 * Reativar quando houver persistência estruturada de plataforma/data (não só em description).
 */
import React, { useState } from 'react';
import { XIcon, CalendarIcon } from './icons';

type SchedulePostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduledDate: string, platform: string) => void;
};

const SchedulePostModal: React.FC<SchedulePostModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [platform, setPlatform] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!scheduledDate) {
      setError('Data de agendamento é obrigatória');
      return;
    }
    if (!platform) {
      setError('Plataforma é obrigatória');
      return;
    }
    setError(null);
    onConfirm(scheduledDate, platform);
    // Reset form
    setScheduledDate('');
    setPlatform('');
  };

  const platforms = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'Twitter/X', 'Pinterest', 'WhatsApp'];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Agendar Post</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data e Hora
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Plataforma
              </label>
              <select
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione uma plataforma</option>
                {platforms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-md hover:from-cyan-700 hover:to-blue-700 transition-all"
            >
              Agendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePostModal;
