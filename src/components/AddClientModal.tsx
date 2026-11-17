import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Emirate, LegalForm } from '../types/finance';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateClient: (payload: {
    name: string;
    legalForm: LegalForm;
    emirate: Emirate;
    industry: string;
    trn: string;
    tradeLicense: string;
    shareCapital: number;
    isQualifyingFreeZone: boolean;
  }) => Promise<void>;
}

const LEGAL_FORMS: LegalForm[] = [
  'Mainland LLC',
  'DMCC Free Zone',
  'DIFC Entity',
  'ADGM SPV',
  'JAFZA FZCO',
];

const EMIRATES: Emirate[] = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
];

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onCreateClient,
}) => {
  const [name, setName] = useState('');
  const [legalForm, setLegalForm] = useState<LegalForm>('Mainland LLC');
  const [emirate, setEmirate] = useState<Emirate>('Dubai');
  const [industry, setIndustry] = useState('Commercial Trading & Contracting');
  const [trn, setTrn] = useState('100852391047219');
  const [tradeLicense, setTradeLicense] = useState('DED-884120-DXB');
  const [shareCapital, setShareCapital] = useState('500000');
  const [isQualifyingFreeZone, setIsQualifyingFreeZone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !trn.trim()) {
      setError('Entity name and 15-digit UAE TRN are required.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateClient({
        name: name.trim(),
        legalForm,
        emirate,
        industry: industry.trim(),
        trn: trn.trim(),
        tradeLicense: tradeLicense.trim(),
        shareCapital: Math.max(50000, Number(shareCapital) || 300000),
        isQualifyingFreeZone,
      });
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create client entity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Onboard UAE Client Entity</h2>
            <p className="text-xs text-slate-500">
              Creates a balanced IFRS Chart of Accounts, VAT 201 period, and ISA working paper file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Legal Entity Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Desert Falcon Properties LLC"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Legal Form</label>
              <select
                value={legalForm}
                onChange={(e) => setLegalForm(e.target.value as LegalForm)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {LEGAL_FORMS.map((lf) => (
                  <option key={lf} value={lf}>
                    {lf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Emirate</label>
              <select
                value={emirate}
                onChange={(e) => setEmirate(e.target.value as Emirate)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {EMIRATES.map((em) => (
                  <option key={em} value={em}>
                    {em}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                FTA VAT TRN (15 Digits)
              </label>
              <input
                type="text"
                value={trn}
                onChange={(e) => setTrn(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Commercial License No.
              </label>
              <input
                type="text"
                value={tradeLicense}
                onChange={(e) => setTradeLicense(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Industry Sector</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Opening Share Capital (AED)
              </label>
              <input
                type="number"
                min="50000"
                step="10000"
                value={shareCapital}
                onChange={(e) => setShareCapital(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-right"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isQualifyingFreeZone}
              onChange={(e) => setIsQualifyingFreeZone(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-slate-900"
            />
            <span className="text-xs text-slate-700">
              Elect Qualifying Free Zone Person (0% Corporate Tax under Article 18)
            </span>
          </label>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating Entity...' : 'Create Client Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
