import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Key,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  VercelStatus,
  VercelEnvVar,
  VercelProjectConfig,
  ProjectInspection,
} from '../../types/api';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
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
  const [projectName, setProjectName] = useState(defaultProjectName || inspection.folderName);
  const [projectRoot, setProjectRoot] = useState('.');
  const [framework, setFramework] = useState(inspection.framework?.id || 'vite-react');
  const [envVars, setEnvVars] = useState<VercelEnvVar[]>([]);
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});
  const [isLinked, setIsLinked] = useState(!!linkedProjectName);

  // New env var inputs
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

    if (success) {
      setIsLinked(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100">Step 6: Vercel One-Time Project Setup</h3>
        <p className="text-xs text-slate-400 mt-1">
          Link your project to Vercel once. After setup, Vercel will automatically deploy whenever you push to GitHub.
        </p>
      </div>

      {/* Vercel CLI Status Check */}
      {!status?.installed ? (
        <div className="p-6 rounded-2xl border border-amber-800/60 bg-amber-950/30 space-y-4">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span>Vercel CLI Not Found</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            DeployHub uses the official Vercel CLI to configure project settings and link your repository.
          </p>

          <TerminalBlock
            title="Install Vercel CLI (Node / npm)"
            command="npm install -g vercel"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={onRefreshStatus}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Check Vercel CLI Again
          </Button>
        </div>
      ) : !status?.authenticated ? (
        <div className="p-6 rounded-2xl border border-amber-800/60 bg-amber-950/30 space-y-4">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span>Vercel Authentication Required</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Please log in to your Vercel account via terminal to link this project:
          </p>

          <TerminalBlock
            title="Log in to Vercel"
            command="vercel login"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={onRefreshStatus}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Check Login Status
          </Button>
        </div>
      ) : isLinked ? (
        /* Successfully Linked Banner */
        <div className="p-6 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Vercel Project Linked Successfully</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300">
            Project: <strong className="text-slate-100">{linkedProjectName || projectName}</strong>
          </div>
          <p className="text-xs text-slate-400">
            Configuration saved to .vercel. All future Git pushes to your connected branch will trigger automatic builds.
          </p>
        </div>
      ) : (
        /* Vercel Configuration Form */
        <form onSubmit={handleLink} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Vercel Project Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Framework Preset
              </label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="nextjs">Next.js</option>
                <option value="vite-react">Vite (React)</option>
                <option value="vite-vue">Vite (Vue)</option>
                <option value="vite-svelte">Vite (Svelte)</option>
                <option value="astro">Astro</option>
                <option value="nuxt">Nuxt</option>
                <option value="remix">Remix</option>
                <option value="html-static">Static HTML</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>
          </div>

          {/* Root Directory (useful for monorepos) */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Project Root Directory
            </label>
            {inspection.isMonorepo && inspection.monorepoPackages ? (
              <select
                value={projectRoot}
                onChange={(e) => setProjectRoot(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 mb-1"
              >
                <option value=".">Root directory (.)</option>
                {inspection.monorepoPackages.map((pkg, idx) => (
                  <option key={idx} value={pkg}>
                    {pkg}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={projectRoot}
                onChange={(e) => setProjectRoot(e.target.value)}
                placeholder="."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            )}
            <span className="text-[11px] text-slate-500">
              For standard repositories, leave as &quot;.&quot;. For monorepos, select your frontend package directory.
            </span>
          </div>

          {/* Environment Variables Section */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Environment Variables (Optional)
              </span>
              <span className="text-[11px] text-slate-400">Values are masked and injected securely</span>
            </div>

            {/* Existing env vars */}
            {envVars.length > 0 && (
              <div className="space-y-2">
                {envVars.map((ev, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span className="font-mono font-semibold text-emerald-400 w-1/3 truncate">{ev.key}</span>
                    <span className="font-mono text-slate-400 flex-1 truncate">
                      {showValues[idx] ? ev.value : '••••••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowValues({ ...showValues, [idx]: !showValues[idx] })}
                      className="p-1 text-slate-400 hover:text-white"
                      title={showValues[idx] ? 'Hide value' : 'Show value'}
                    >
                      {showValues[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEnvVar(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new env var */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="KEY (e.g. VITE_API_URL)"
                className="w-1/3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 uppercase"
              />
              <input
                type="password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addEnvVar} disabled={!newKey.trim()}>
                Add
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              icon={<Globe className="w-4 h-4" />}
            >
              Link Project with Vercel
            </Button>
          </div>
        </form>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" size="md" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!isLinked}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Continue to Summary & Deploy
        </Button>
      </div>
    </div>
  );
};
