import React, { useState } from 'react';
import {
  Globe,
  Trash2,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import {
  VercelStatus,
  VercelEnvVar,
  VercelProjectConfig,
  ProjectInspection,
} from '../../types/api';
import { Button } from '../common/Button';
import { TerminalBlock } from '../common/TerminalBlock';

interface Step6Props {
  status: VercelStatus | null;
  inspection: ProjectInspection;
  defaultProjectName: string;
  onRefreshStatus: () => void;
  onLinkProject: (config: VercelProjectConfig) => Promise<boolean>;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
  linkedProjectName: string | null;
}

export const Step6VercelSetup: React.FC<Step6Props> = ({
  status,
  inspection,
  defaultProjectName,
  onRefreshStatus,
  onLinkProject,
  onNext,
  onBack,
  loading,
  linkedProjectName,
}) => {
  const initialName = (defaultProjectName || inspection.folderName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const [projectName, setProjectName] = useState(initialName || 'my-project');
  const [projectRoot, setProjectRoot] = useState('.');
  const [framework, setFramework] = useState(inspection.framework?.id || 'vite-react');
  const [envVars, setEnvVars] = useState<VercelEnvVar[]>([]);
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});
  const [isLinked, setIsLinked] = useState(!!linkedProjectName);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const addEnvVar = () => {
    if (!newKey.trim()) return;
    setEnvVars([
      ...envVars,
      {
        key: newKey.trim(),
        value: newValue.trim(),
        target: ['production', 'preview', 'development'],
      },
    ]);
    setNewKey('');
    setNewValue('');
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const success = await onLinkProject({
      projectName: projectName.trim(),
      framework,
      projectRoot,
      envVars,
    });

    if (success) setIsLinked(true);
  };

  return (
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 6: Vercel One-Time Project Setup</h3>
        <p className="text-[11px] text-devtoys-muted">
          Link to Vercel once. After setup, Vercel deploys automatically when you push to GitHub.
        </p>
      </div>

      {!status?.installed ? (
        <div className="p-3.5 rounded-md border border-devtoys-warning/30 bg-devtoys-warning/10 space-y-2">
          <div className="flex items-center gap-1.5 text-devtoys-warning font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Vercel CLI Not Found</span>
          </div>
          <p className="text-[11px] text-devtoys-secondary">Install Vercel CLI via npm:</p>
          <TerminalBlock title="Install Vercel CLI" command="npm install -g vercel" />
          <Button variant="primary" size="sm" onClick={onRefreshStatus} loading={loading}>
            Check Again
          </Button>
        </div>
      ) : isLinked ? (
        <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
          <div className="flex items-center gap-2 text-devtoys-success font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Vercel Project Linked Successfully</span>
          </div>
          <div className="p-2 bg-devtoys-sidebar rounded border border-devtoys-border font-mono text-devtoys-primary text-xs">
            Project: <strong className="text-devtoys-accent">{linkedProjectName || projectName}</strong>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLink} className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-devtoys-muted block mb-1">
                Project Name <span className="text-devtoys-error">*</span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs font-mono text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
              />
            </div>

            <div>
              <label className="text-[11px] text-devtoys-muted block mb-1">Framework Preset</label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="w-full h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2 text-xs text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
              >
                <option value="nextjs">Next.js</option>
                <option value="vite-react">Vite (React)</option>
                <option value="vite-vue">Vite (Vue)</option>
                <option value="vite-svelte">Vite (Svelte)</option>
                <option value="astro">Astro</option>
                <option value="html-static">Static HTML</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-devtoys-muted block mb-1">Project Root</label>
            <input
              type="text"
              value={projectRoot}
              onChange={(e) => setProjectRoot(e.target.value)}
              placeholder="."
              className="w-full h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs font-mono text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
            />
          </div>

          {/* Environment Variables */}
          <div className="pt-2 border-t border-devtoys-border space-y-2">
            <span className="text-[11px] font-semibold text-devtoys-primary block">
              Environment Variables (Optional)
            </span>

            {envVars.length > 0 && (
              <div className="space-y-1">
                {envVars.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-devtoys-sidebar border border-devtoys-border text-[11px]">
                    <span className="font-mono text-devtoys-accent font-semibold w-1/3 truncate">{ev.key}</span>
                    <span className="font-mono text-devtoys-muted flex-1 truncate">
                      {showValues[idx] ? ev.value : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowValues({ ...showValues, [idx]: !showValues[idx] })}
                      className="text-devtoys-muted hover:text-devtoys-primary p-0.5"
                    >
                      {showValues[idx] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEnvVar(idx)}
                      className="text-devtoys-muted hover:text-devtoys-error p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="KEY (e.g. VITE_API_URL)"
                className="w-1/3 h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2 text-xs font-mono text-devtoys-primary uppercase focus:outline-none focus:border-devtoys-accent"
              />
              <input
                type="password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value"
                className="flex-1 h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2 text-xs font-mono text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addEnvVar} disabled={!newKey.trim()}>
                Add
              </Button>
            </div>
          </div>

          <div className="pt-1">
            <Button type="submit" variant="primary" size="sm" loading={loading} icon={<Globe className="w-3.5 h-3.5" />}>
              Link Project with Vercel
            </Button>
          </div>
        </form>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={!isLinked}
          icon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Continue to Summary
        </Button>
      </div>
    </div>
  );
};
