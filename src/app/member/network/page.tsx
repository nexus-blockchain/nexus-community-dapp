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
import {
  Network, ChevronDown, ChevronRight, Users, User,
  Ban, MoreHorizontal, UserPlus, Loader2,
} from 'lucide-react';
import { useEntityStore, useWalletStore } from '@/stores';
import { useEntity } from '@/hooks/use-entity';
import { useMember, useRegisterMember } from '@/hooks/use-member';
import {
  useReferralTree,
  useReferralsByGeneration,
} from '@/hooks/use-member-team';
import { shortAddress, isTxBusy } from '@/lib/utils/chain-helpers';
import { TxStatusIndicator } from '@/components/ui/tx-status-indicator';
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
  const [expanded, setExpanded] = useState(false);
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
// All Generations List (1-5 combined, paged)
// ─────────────────────────────────────────────
function AllGenerationsList({
  entityId,
  address,
  t,
}: {
  entityId: number;
  address: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const pageSize = 10;
  const [pageIndex, setPageIndex] = useState(0);

  const g1 = useReferralsByGeneration(entityId, address, 1, 999, 0);
  const g2 = useReferralsByGeneration(entityId, address, 2, 999, 0);
  const g3 = useReferralsByGeneration(entityId, address, 3, 999, 0);
  const g4 = useReferralsByGeneration(entityId, address, 4, 999, 0);
  const g5 = useReferralsByGeneration(entityId, address, 5, 999, 0);

  const isLoading = g1.isLoading || g2.isLoading || g3.isLoading || g4.isLoading || g5.isLoading;

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  // Merge all generations, tag each member with generation number
  const allMembers: (GenerationMemberInfo & { gen: number })[] = [];
  [g1, g2, g3, g4, g5].forEach((g, i) => {
    if (g.data?.members) {
      g.data.members.forEach((m) => allMembers.push({ ...m, gen: i + 1 }));
    }
  });

  if (allMembers.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t('noGenerationData')}</p>;
  }

  const totalPages = Math.ceil(allMembers.length / pageSize);
  const paged = allMembers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  return (
    <div className="space-y-2">
      {paged.map((m) => (
        <div key={m.account} className="flex items-center rounded-lg bg-secondary p-2.5 text-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs truncate">{shortAddress(m.account)}</span>
              <Badge variant="outline" className="text-[9px] h-3.5 px-1">{t('generationShort', { gen: m.gen })}</Badge>
              {m.isBanned && <Ban className="h-3 w-3 text-destructive shrink-0" />}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>LV.{m.levelId}</span>
              <span>{t('directReferrals')} {m.directReferrals}</span>
              <span>{t('teamSize')} {m.teamSize}</span>
            </div>
          </div>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => p - 1)}
          >
            {t('prevPage')}
          </Button>
          <span className="text-xs text-muted-foreground">{pageIndex + 1} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => setPageIndex((p) => p + 1)}
          >
            {t('nextPage')}
          </Button>
        </div>
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
  const { data: entity } = useEntity(currentEntityId);
  const { data: member } = useMember(currentEntityId, address);
  const [referrerInput, setReferrerInput] = useState('');

  const registerMember = useRegisterMember();

  const shopId = entity?.primaryShopId ?? null;

  const handleRegister = async () => {
    if (!shopId) return;
    const ref = referrerInput || null;
    await registerMember.mutate([shopId, ref]);
  };

  const isBusy = (m: any) => isTxBusy(m.txState);

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
              disabled={!shopId || isBusy(registerMember)}
              onClick={handleRegister}
            >
              {isBusy(registerMember) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {t('registerMember')}
            </Button>
            <TxStatusIndicator txState={registerMember.txState} successMessage={t('registerSuccess')} />
          </CardContent>
        </Card>
      )}
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

  return (
    <>
      <MobileHeader title={t('networkTitle')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Team overview stats */}
          {member && (
            <Card className="border-transparent bg-gradient-to-br from-primary/10 to-primary/5">
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
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('directReferrals')}</p>
                    <p className="text-lg font-bold text-primary">{member.directReferrals}</p>
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

          {/* Generation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('generationView')}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentEntityId != null && address && (
                <AllGenerationsList
                  entityId={currentEntityId}
                  address={address}
                  t={t}
                />
              )}
            </CardContent>
          </Card>

          {/* Tree */}
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
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  <TreeNode node={tree} t={t} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invite */}
          <InviteTab t={t} />
        </div>
      </PageContainer>
    </>
  );
}
