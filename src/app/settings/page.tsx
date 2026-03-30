'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout/page-container';
import { MobileHeader } from '@/components/layout/mobile-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Globe, Building2, CheckCircle2, Loader2, ChevronRight, Radio, Zap, Plus, X } from 'lucide-react';
import { useLocaleStore } from '@/stores/locale-store';
import { useWalletStore, useEntityStore } from '@/stores';
import { useAllEntities } from '@/hooks/use-entity';
import { useMember, useMyMemberships, useRegisterMember } from '@/hooks/use-member';
import { useApi } from '@/lib/chain';
import { useNodeHealthStore, type NodeStatus } from '@/stores/node-health-store';
import { locales, type Locale } from '@/i18n/config';
import { isTxBusy } from '@/lib/utils/chain-helpers';
import { TxStatusIndicator } from '@/components/ui/tx-status-indicator';

const LOCALE_LABELS: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
};

const STATUS_VARIANT: Record<NodeStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  healthy: 'success',
  slow: 'warning',
  unhealthy: 'destructive',
  unknown: 'secondary',
};

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('chainInfo');
  const { locale, setLocale } = useLocaleStore();
  const { address } = useWalletStore();
  const { currentEntityId, entityName, setEntity } = useEntityStore();
  const { data: entities, isLoading: entitiesLoading } = useAllEntities();
  const { data: member } = useMember(currentEntityId, address);
  const entityIds = entities?.map((e) => e.id) ?? [];
  const { data: myMemberships } = useMyMemberships(entityIds, address);
  const registerMember = useRegisterMember();

  const { activeEndpoint, switchNode, addManualNode } = useApi();
  const nodes = useNodeHealthStore((s) => s.nodes);
  const preferredEndpoint = useNodeHealthStore((s) => s.preferredEndpoint);
  const setPreferredEndpoint = useNodeHealthStore((s) => s.setPreferredEndpoint);
  const removeNode = useNodeHealthStore((s) => s.removeNode);
  const healthyCount = nodes.filter((n) => n.status === 'healthy').length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [joiningEntityId, setJoiningEntityId] = useState<number | null>(null);
  const [nodeInput, setNodeInput] = useState('');
  const [addingNode, setAddingNode] = useState(false);
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [nodeSuccess, setNodeSuccess] = useState(false);

  const isBusy = isTxBusy(registerMember.txState);

  const handleJoinEntity = async (entityId: number, name: string) => {
    if (!address) return;
    const entity = entities?.find((e) => e.id === entityId);
    if (!entity?.primaryShopId) return;
    setJoiningEntityId(entityId);
    registerMember.reset();
    try {
      await registerMember.mutate([entity.primaryShopId, null]);
      // On success, switch to this entity
      setEntity(entityId, name);
      setDialogOpen(false);
      setJoiningEntityId(null);
    } catch {
      setJoiningEntityId(null);
    }
  };

  const handleSelectEntity = (entityId: number, name: string) => {
    setEntity(entityId, name);
    setDialogOpen(false);
  };

  const handleAddNode = async () => {
    // Normalize: replace common full-width / Chinese punctuation
    const url = nodeInput.trim()
      .replace(/：/g, ':')
      .replace(/／/g, '/');
    if (!url) return;

    // Validate ws:// or wss:// URL
    if (!/^wss?:\/\/.+/.test(url)) {
      setNodeError(t('invalidNodeUrl'));
      return;
    }

    // Check if already exists
    if (nodes.some((n) => n.endpoint === url)) {
      setNodeInput('');
      return;
    }

    setAddingNode(true);
    setNodeError(null);
    setNodeSuccess(false);

    const ok = await addManualNode(url);
    setAddingNode(false);

    if (ok) {
      setNodeInput('');
      setNodeSuccess(true);
      setTimeout(() => setNodeSuccess(false), 2000);
    } else {
      setNodeError(t('addNodeFailed'));
    }
  };

  const handleRemoveNode = (endpoint: string) => {
    if (!confirm(t('removeNodeConfirm'))) return;
    removeNode(endpoint);
    // If removing the active preferred node, reset to auto
    if (endpoint === preferredEndpoint) {
      setPreferredEndpoint(null);
    }
  };

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Entity section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                {t('entity')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('entityDesc')}</p>

              {/* Current entity display */}
              {currentEntityId && entityName ? (
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('currentEntity')}</p>
                    <p className="font-medium">{entityName}</p>
                    <p className="text-xs text-muted-foreground">{t('entityId', { id: currentEntityId })}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                    {t('switchEntity')}
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 p-3">
                  <p className="text-sm text-muted-foreground">{t('noEntity')}</p>
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    {t('joinEntity')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                {t('language')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">{t('languageDesc')}</p>
              <div className="flex gap-2">
                {locales.map((loc) => (
                  <Button
                    key={loc}
                    variant={locale === loc ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLocale(loc)}
                  >
                    {LOCALE_LABELS[loc]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Node management section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  {t('nodeManagement')}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {t('nodeCount', { healthy: healthyCount, total: nodes.length })}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('nodeManagementDesc')}</p>

              {/* Active node indicator */}
              {activeEndpoint && (
                <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/30 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-xs text-muted-foreground">{t('activeNode')}</span>
                      <Badge variant={preferredEndpoint ? 'outline' : 'secondary'} className="text-[10px]">
                        {preferredEndpoint ? t('userSelected') : t('autoSelected')}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs">{activeEndpoint}</p>
                  </div>
                  {preferredEndpoint && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => setPreferredEndpoint(null)}
                    >
                      {t('resetAuto')}
                    </Button>
                  )}
                </div>
              )}

              {/* Add node form */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('addNode')}</p>
                <div className="flex gap-2">
                  <Input
                    value={nodeInput}
                    onChange={(e) => {
                      setNodeInput(e.target.value);
                      setNodeError(null);
                    }}
                    placeholder={t('addNodePlaceholder')}
                    className="h-8 font-mono text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !addingNode) handleAddNode();
                    }}
                    disabled={addingNode}
                  />
                  <Button
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={handleAddNode}
                    disabled={addingNode || !nodeInput.trim()}
                  >
                    {addingNode ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-3 w-3" />
                    )}
                    {addingNode ? t('addingNode') : t('addNodeBtn')}
                  </Button>
                </div>
                {nodeError && (
                  <p className="text-xs text-destructive">{nodeError}</p>
                )}
                {nodeSuccess && (
                  <p className="text-xs text-success">{t('addNodeSuccess')}</p>
                )}
              </div>

              {/* Node list */}
              {nodes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('noNodes')}</p>
              ) : (
                <div className="space-y-1.5">
                  {[...nodes]
                    .sort((a, b) => {
                      // Active first, then by status priority, then by latency
                      if (a.endpoint === activeEndpoint) return -1;
                      if (b.endpoint === activeEndpoint) return 1;
                      const statusOrder: Record<NodeStatus, number> = { healthy: 0, slow: 1, unknown: 2, unhealthy: 3 };
                      const sa = statusOrder[a.status];
                      const sb = statusOrder[b.status];
                      if (sa !== sb) return sa - sb;
                      return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity);
                    })
                    .map((node) => {
                      const isActive = node.endpoint === activeEndpoint;
                      const canRemove = node.source !== 'seed' && !isActive;
                      return (
                        <div
                          key={node.endpoint}
                          className={`flex w-full items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                            isActive
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border hover:border-primary/30 hover:bg-secondary'
                          }`}
                        >
                          <button
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              if (!isActive) {
                                switchNode(node.endpoint);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                                {node.endpoint}
                              </span>
                              <Badge variant={STATUS_VARIANT[node.status]} className="shrink-0 text-[10px]">
                                {tc(node.status)}
                              </Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] text-muted-foreground">
                              {node.latencyMs != null && (
                                <span>{t('latencyMs', { ms: node.latencyMs })}</span>
                              )}
                              {node.blockHeight != null && (
                                <span>{t('blockHeight', { height: node.blockHeight.toLocaleString() })}</span>
                              )}
                              <span>
                                {node.source === 'seed' && tc('seed')}
                                {node.source === 'discovered' && tc('discovered')}
                                {node.source === 'manual' && tc('manual')}
                              </span>
                              {isActive && (
                                <CheckCircle2 className="h-3 w-3 text-primary" />
                              )}
                            </div>
                          </button>
                          {canRemove && (
                            <button
                              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveNode(node.endpoint);
                              }}
                              title={t('removeNode')}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>

      {/* Entity selection dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('selectEntity')}</DialogTitle>
            <DialogDescription>{t('entityDesc')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {entitiesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !entities || entities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('noEntity')}</p>
            ) : (
              entities.map((entity) => {
                const isCurrent = entity.id === currentEntityId;
                const isJoining = joiningEntityId === entity.id && isBusy;
                return (
                  <button
                    key={entity.id}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isCurrent
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-secondary'
                    }`}
                    disabled={isJoining}
                    onClick={() => {
                      if (isCurrent) {
                        setDialogOpen(false);
                        return;
                      }
                      if (!address || myMemberships?.includes(entity.id)) {
                        handleSelectEntity(entity.id, entity.name);
                      } else {
                        handleJoinEntity(entity.id, entity.name);
                      }
                    }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-sm">{entity.name}</span>
                        {entity.verified && (
                          <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 text-info" />
                            {t('entityVerified')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('entityId', { id: entity.id })} · {entity.entityType}
                      </p>
                    </div>
                    {isJoining ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : isCurrent ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          <TxStatusIndicator txState={registerMember.txState} successMessage={t('joinSuccess')} />
        </DialogContent>
      </Dialog>
    </>
  );
}
