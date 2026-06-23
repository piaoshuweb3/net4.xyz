'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// 动态导入各个 Section 组件，实现代码分割
const WhitepaperSection = dynamic(() => import('./WhitepaperSection'), {
  loading: () => <SectionLoading />,
});

const PoUESection = dynamic(() => import('./PoUESection'), {
  loading: () => <SectionLoading />,
});

const NodesSection = dynamic(() => import('./NodesSection'), {
  loading: () => <SectionLoading />,
});

const DNSSection = dynamic(() => import('./DNSSection'), {
  loading: () => <SectionLoading />,
});

const EcosystemSection = dynamic(() => import('./EcosystemSection'), {
  loading: () => <SectionLoading />,
});

const ColumnSection = dynamic(() => import('./ColumnSection'), {
  loading: () => <SectionLoading />,
});

const TeamSection = dynamic(() => import('./TeamSection'), {
  loading: () => <SectionLoading />,
});

function SectionLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );
}

interface SectionRendererProps {
  activeSection: string;
  pageData: Record<string, unknown>;
  searchDomain: string;
  onSearchDomainChange: (value: string) => void;
  onDomainSearch: () => void;
  onAIQuery: (prompt: string) => void;
  onSelectEco: (key: string) => void;
  onSelectArticle: (key: string) => void;
  onSelectMedia: () => void;
  onSelectSection: (section: string) => void;
  loading: boolean;
}

export default function SectionRenderer(props: SectionRendererProps) {
  const { activeSection, pageData, loading } = props;

  if (loading) {
    return <SectionLoading />;
  }

  switch (activeSection) {
    case 'whitepaper':
      return <WhitepaperSection data={pageData.whitepaper as Record<string, unknown>} />;

    case 'poue':
      return (
        <PoUESection
          data={pageData.poue as Record<string, unknown>}
          onAIQuery={props.onAIQuery}
        />
      );

    case 'nodes':
      return <NodesSection data={pageData.nodes as Record<string, unknown>} />;

    case 'dns':
      return (
        <DNSSection
          searchDomain={props.searchDomain}
          onSearchDomainChange={props.onSearchDomainChange}
          onSearch={props.onDomainSearch}
          loading={loading}
        />
      );

    case 'ecosystem':
      return <EcosystemSection onSelectEco={props.onSelectEco} />;

    case 'column':
      return (
        <ColumnSection
          onSelectMedia={props.onSelectMedia}
          onSelectArticle={props.onSelectArticle}
        />
      );

    case 'team':
      return <TeamSection onSelectSection={props.onSelectSection} />;

    default:
      return null;
  }
}
