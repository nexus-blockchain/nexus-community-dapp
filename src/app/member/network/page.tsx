'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { HelpTip } from '@/components/ui/help-tip';
import {
  Network, ChevronDown, ChevronRight, Users, ArrowUp, User,
  Ban, MoreHorizontal, Share2, Copy, Check, UserPlus, Loader2,
} from 'lucide-react';
import { useEntityStore, useWalletStore } from '@/stores';
import { useMember, useDirectReferrals, useMemberCount, useRegisterMember, useBindReferrer } from '@/hooks/use-member';
import {
  useReferralTree,
  useUplineChain,
  useReferralsByGeneration,
} from '@/hooks/use-member-team';
import { shortAddress, formatUsdt } from '@/lib/utils/chain-helpers';
import type { ReferralTreeNode, GenerationMemberInfo } from '@/lib/types';

// ─────────────────────────────────────────────
// Tree Node Component (recursive)
// ─────────────────────────────────────────────
function TreeNode({
  node,
  depth = 0,
  t,
}: {
  node: ReferralTreeNode;
  depth?: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0 || node.hasMoreChildren;

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-border pl-3' : ''}>
      <div
        className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5 text-sm"
        role={hasChildren ? 'button' : undefined}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs truncate">{shortAddress(node.account)}</span>
            {node.isBanned && (
              <Ban className="h-3 w-3 text-destructive shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>LV.{node.levelId}</span>
            <span>{t('directReferrals')} {node.directReferrals}</span>
            <span>{t('teamSize')} {node.teamSize}</span>
          </div>
        </div>

        <span className="text-xs text-muted-foreground shrink-0">${formatUsdt(node.totalSpent)}</span>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode key={child.account} node={child} depth={depth + 1} t={t} />
          ))}
        </div>
      )}

      {expanded && node.hasMoreChildren && (
        <div className="ml-4 mt-1 pl-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MoreHorizontal className="h-3 w-3" />
            <span>{t('hasMore')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Generation Tab Content
// ─────────────────────────────────────────────
function GenerationList({
  entityId,
  address,
  generation,
  t,
}: {
  entityId: number;
  address: string;
  generation: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;
  const { data, isLoading } = useReferralsByGeneration(entityId, address, generation, pageSize, pageIndex);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.members.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t('noGenerationData')}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t('generation', { gen: generation })}</span>
        <span>{data.totalCount} {t('totalMembers').toLowerCase()}</span>
      </div>
      {data.members.map((m: GenerationMemberInfo) => (
        <div key={m.account} className="flex items-center justify-between rounded-lg bg-secondary p-2.5 text-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs truncate">{shortAddress(m.account)}</span>
              {m.isBanned && <Ban className="h-3 w-3 text-destructive shrink-0" />}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>LV.{m.levelId}</span>
              <span>{t('directReferrals')} {m.directReferrals}</span>
              <span>{t('teamSize')} {m.teamSize}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">${formatUsdt(m.totalSpent)}</span>
        </div>
      ))}
      {data.hasMore && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setPageIndex((p) => p + 1)}
        >
          {t('loadMore')}
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Invite Tab Content
// ─────────────────────────────────────────────
function InviteTab({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();
  const { data: member } = useMember(currentEntityId, address);
  const { data: referrals } = useDirectReferrals(currentEntityId, address);
  const { data: memberCount } = useMemberCount(currentEntityId);
  const [copied, setCopied] = useState(false);
  const [referrerInput, setReferrerInput] = useState('');

  const registerMember = useRegisterMember();
  const bindReferrer = useBindReferrer();

  const inviteLink = address
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/member/invite?ref=${address}&entity=${currentEntityId}`
    : '';

  const handleCopy = () => {
    if (!inviteLink) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteLink);
    } else {
      const ta = Object.assign(document.createElement('textarea'), { value: inviteLink, style: 'position:fixed;opacity:0' });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = async () => {
    if (!currentEntityId) return;
    const ref = referrerInput || null;
    await registerMember.mutate([currentEntityId, ref]);
  };

  const handleBindReferrer = async () => {
    if (!currentEntityId || !referrerInput) return;
    await bindReferrer.mutate([currentEntityId, referrerInput]);
  };

  const isBusy = (m: any) => ['signing', 'broadcasting', 'inBlock'].includes(m.txState.status);

  return (
    <div className="space-y-4">
      {/* Not member yet */}
      {address && !member && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-base">{t('joinCommunity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder={t('referrerPlaceholder')}
              value={referrerInput}
              onChange={(e) => setReferrerInput(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={!currentEntityId || isBusy(registerMember)}
              onClick={handleRegister}
            >
              {isBusy(registerMember) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {t('registerMember')}
            </Button>
            {registerMember.txState.status === 'finalized' && (
              <p className="text-sm text-success">{t('registerSuccess')}</p>
            )}
            {registerMember.txState.status === 'error' && (
              <p className="text-sm text-destructive">{registerMember.txState.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite link */}
      {member && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-4 w-4" />
              {t('inviteLink')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
              <p className="flex-1 truncate text-xs font-mono">{inviteLink}</p>
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bind referrer (if member without referrer) */}
      {member && !member.referrer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('bindReferrer')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder={t('referrerAddress')}
              value={referrerInput}
              onChange={(e) => setReferrerInput(e.target.value)}
            />
            <Button
              className="w-full"
              variant="outline"
              disabled={!referrerInput || isBusy(bindReferrer)}
              onClick={handleBindReferrer}
            >
              {isBusy(bindReferrer) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('bind')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* My stats */}
      {member && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('myReferrals')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-muted-foreground flex items-center justify-center gap-1">{t('directReferrals')} <HelpTip helpKey="member.directReferrals" iconSize={12} /></p>
                <p className="text-xl font-bold text-primary">{member.directReferrals}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center justify-center gap-1">{t('qualifiedReferrals')} <HelpTip helpKey="member.qualifiedReferrals" iconSize={12} /></p>
                <p className="text-xl font-bold">{member.qualifiedReferrals}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center justify-center gap-1">{t('teamSize')} <HelpTip helpKey="member.teamSize" iconSize={12} /></p>
                <p className="text-xl font-bold">{member.teamSize}</p>
              </div>
            </div>
            {member.referrer && (
              <div className="mt-3 text-sm">
                <span className="text-muted-foreground">{t('myReferrer')}</span>
                <span className="font-mono text-xs">{shortAddress(member.referrer)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Direct referrals list */}
      {referrals && referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{t('directMembers')}</span>
              <Badge variant="secondary">{referrals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {referrals.map((addr) => (
              <div key={addr} className="flex items-center gap-2 rounded-lg bg-secondary p-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs">{shortAddress(addr)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Community stats */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">{t('totalMembers')}</span>
          <span className="text-lg font-semibold">{memberCount ?? 0}</span>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function MemberNetworkPage() {
  const t = useTranslations('member');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();
  const { data: member } = useMember(currentEntityId, address);
  const { data: tree, isLoading: treeLoading } = useReferralTree(currentEntityId, address, 3);
  const { data: upline, isLoading: uplineLoading } = useUplineChain(currentEntityId, address, 10);

  const [activeTab, setActiveTab] = useState<'tree' | 'generation' | 'upline' | 'invite'>('tree');
  const [selectedGen, setSelectedGen] = useState(1);

  const tabs = [
    { id: 'tree' as const, label: t('referralTree') },
    { id: 'generation' as const, label: t('generationView') },
    { id: 'upline' as const, label: t('uplineChain') },
    { id: 'invite' as const, label: t('inviteFriends') },
  ];

  return (
    <>
      <MobileHeader title={t('networkTitle')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Team overview stats */}
          {member && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Network className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('teamOverview')}</p>
                    <p className="text-xs text-muted-foreground">{t('networkDesc')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('directReferrals')}</p>
                    <p className="text-lg font-bold text-primary">{member.directReferrals}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('qualifiedReferrals')}</p>
                    <p className="text-lg font-bold">{member.qualifiedReferrals}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('indirectReferrals')}</p>
                    <p className="text-lg font-bold">{member.indirectReferrals}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('teamSize')}</p>
                    <p className="text-lg font-bold">{member.teamSize}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tree tab */}
          {activeTab === 'tree' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('referralTree')}</CardTitle>
              </CardHeader>
              <CardContent>
                {treeLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : !tree ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t('noReferralTree')}</p>
                ) : (
                  <div className="space-y-1">
                    <TreeNode node={tree} t={t} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Generation tab */}
          {activeTab === 'generation' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('generationView')}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Generation selector */}
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                  {[1, 2, 3, 4, 5].map((gen) => (
                    <Button
                      key={gen}
                      variant={selectedGen === gen ? 'default' : 'outline'}
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => setSelectedGen(gen)}
                    >
                      {t('generationShort', { gen })}
                    </Button>
                  ))}
                </div>
                {currentEntityId != null && address && (
                  <GenerationList
                    entityId={currentEntityId}
                    address={address}
                    generation={selectedGen}
                    t={t}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Upline chain tab */}
          {activeTab === 'upline' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowUp className="h-4 w-4" />
                  {t('uplineChain')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uplineLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : !upline || upline.chain.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t('noUplineChain')}</p>
                ) : (
                  <div className="space-y-0">
                    {/* Current user at bottom */}
                    {upline.chain.map((node, idx) => (
                      <div key={node.account} className="relative">
                        {idx > 0 && (
                          <div className="absolute left-5 -top-2 h-2 w-px bg-border" />
                        )}
                        <div className={`flex items-center gap-3 rounded-lg p-2.5 text-sm ${
                          idx === 0 ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'
                        }`}>
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {idx === 0 ? <Users className="h-4 w-4" /> : idx}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-xs">{shortAddress(node.account)}</span>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span>LV.{node.levelId}</span>
                              <span>{t('teamSize')} {node.teamSize}</span>
                            </div>
                          </div>
                        </div>
                        {idx < upline.chain.length - 1 && (
                          <div className="flex justify-center py-0.5">
                            <div className="h-3 w-px bg-border" />
                          </div>
                        )}
                      </div>
                    ))}
                    {upline.truncated && (
                      <div className="mt-2 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {t('truncated')} ({t('depth', { depth: upline.depth })})
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invite tab */}
          {activeTab === 'invite' && <InviteTab t={t} />}
        </div>
      </PageContainer>
    </>
  );
}
