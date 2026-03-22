import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import companyLogo from "@assets/회사로고_1754476459763.png";
import companyIcon from "@assets/회사 아이콘_1754476465483.png";

interface DiscoveredEvent {
  id: string;
  competitorName: string;
  source: "official" | "naver";
  sourceUrl: string;
  eventType: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  benefits: string[] | null;
  imageUrl: string | null;
}

const EVENT_TYPE_CONFIG: Record<string, { color: string; icon: string }> = {
  "할인/세일": { color: "bg-red-100 text-red-700 border-red-200", icon: "🏷️" },
  "사은품 증정": { color: "bg-pink-100 text-pink-700 border-pink-200", icon: "🎁" },
  "1+1/번들": { color: "bg-purple-100 text-purple-700 border-purple-200", icon: "📦" },
  "포인트/적립": { color: "bg-amber-100 text-amber-700 border-amber-200", icon: "💰" },
  "신규가입 혜택": { color: "bg-blue-100 text-blue-700 border-blue-200", icon: "👋" },
  "시즌 프로모션": { color: "bg-orange-100 text-orange-700 border-orange-200", icon: "🌸" },
  "한정판/특별판": { color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: "✨" },
  "체험/샘플": { color: "bg-teal-100 text-teal-700 border-teal-200", icon: "🧪" },
  "무료배송": { color: "bg-green-100 text-green-700 border-green-200", icon: "🚚" },
  "기타": { color: "bg-gray-100 text-gray-700 border-gray-200", icon: "📢" },
};

const SOURCE_CONFIG = {
  official: { label: "공식 홈페이지", icon: "🏠", color: "bg-blue-50 text-blue-600" },
  naver: { label: "네이버 브랜드 스토어", icon: "🟢", color: "bg-green-50 text-green-600" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

function EventCard({ event }: { event: DiscoveredEvent }) {
  const typeConfig = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG["기타"];
  const sourceConfig = SOURCE_CONFIG[event.source];
  const hasDates = event.startDate || event.endDate;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Event Image */}
      {event.imageUrl && (
        <div className="relative h-40 bg-muted overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.style.display = "none";
            }}
          />
          <div className="absolute top-2 left-2">
            <Badge className={`${typeConfig.color} border`}>
              {typeConfig.icon} {event.eventType}
            </Badge>
          </div>
        </div>
      )}

      <CardHeader className={event.imageUrl ? "pt-3 pb-2" : "pb-2"}>
        {/* Event Type (if no image) */}
        {!event.imageUrl && (
          <div className="mb-2">
            <Badge className={`${typeConfig.color} border`}>
              {typeConfig.icon} {event.eventType}
            </Badge>
          </div>
        )}

        <CardTitle className="text-lg leading-snug">{event.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>

        {/* Benefits */}
        {event.benefits && event.benefits.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">주요 혜택</p>
            <div className="flex flex-wrap gap-1.5">
              {(event.benefits as string[]).map((benefit, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-xs bg-secondary px-2 py-1 rounded-md text-foreground"
                >
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Event Period */}
        {hasDates && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-muted-foreground">
              {event.startDate ? formatDate(event.startDate) : "시작일 미정"}
              {" ~ "}
              {event.endDate ? formatDate(event.endDate) : "종료일 미정"}
            </span>
          </div>
        )}

        {/* Source + Link */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className={`text-xs px-2 py-1 rounded-full ${sourceConfig.color}`}>
            {sourceConfig.icon} {sourceConfig.label}
          </span>
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            원본 페이지
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EventMonitor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [eventsByCompetitor, setEventsByCompetitor] = useState<Record<string, DiscoveredEvent[]>>({});
  const [discoveringCompetitor, setDiscoveringCompetitor] = useState<string | null>(null);

  const userData = JSON.parse(localStorage.getItem("onboarding_user_data") || "{}");
  const competitors: string[] = userData.competitors || [];

  const discoverMutation = useMutation({
    mutationFn: async (competitorName: string) => {
      setDiscoveringCompetitor(competitorName);
      const response = await apiRequest("POST", "/api/event-monitor/discover", {
        competitorName,
      });
      return response.json();
    },
    onSuccess: (data, competitorName) => {
      setEventsByCompetitor((prev) => ({
        ...prev,
        [competitorName]: data.events || [],
      }));
      setDiscoveringCompetitor(null);
      const count = data.events?.length || 0;
      toast({
        title: "이벤트 탐색 완료",
        description: count > 0
          ? `${competitorName}에서 ${count}개의 이벤트를 발견했습니다.`
          : `${competitorName}에서 진행 중인 이벤트를 찾지 못했습니다.`,
      });
    },
    onError: (_, competitorName) => {
      setDiscoveringCompetitor(null);
      toast({
        title: "탐색 실패",
        description: `${competitorName}의 이벤트 탐색 중 오류가 발생했습니다.`,
        variant: "destructive",
      });
    },
  });

  const discoverAllMutation = useMutation({
    mutationFn: async () => {
      const results: Record<string, DiscoveredEvent[]> = {};
      for (const competitor of competitors) {
        setDiscoveringCompetitor(competitor);
        try {
          const response = await apiRequest("POST", "/api/event-monitor/discover", {
            competitorName: competitor,
          });
          const data = await response.json();
          results[competitor] = data.events || [];
        } catch {
          results[competitor] = [];
        }
      }
      return results;
    },
    onSuccess: (results) => {
      setEventsByCompetitor(results);
      setDiscoveringCompetitor(null);
      const totalEvents = Object.values(results).reduce((sum, events) => sum + events.length, 0);
      toast({
        title: "전체 탐색 완료",
        description: `${competitors.length}개 경쟁사에서 총 ${totalEvents}개의 이벤트를 발견했습니다.`,
      });
    },
    onError: () => {
      setDiscoveringCompetitor(null);
      toast({
        title: "탐색 실패",
        description: "이벤트 탐색 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Count total events
  const totalEvents = Object.values(eventsByCompetitor).reduce((sum, events) => sum + events.length, 0);

  // Collect all event types for summary
  const eventTypeCounts: Record<string, number> = {};
  for (const events of Object.values(eventsByCompetitor)) {
    for (const event of events) {
      eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
    }
  }

  if (competitors.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background border-b border-border sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-3">
              <img src={companyIcon} alt="Icon" className="w-8 h-8 object-contain" />
              <img src={companyLogo} alt="Logo" className="h-6 object-contain" />
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">등록된 경쟁사가 없습니다</h1>
          <p className="text-muted-foreground mb-6">대시보드에서 먼저 경쟁사를 등록해주세요.</p>
          <Button onClick={() => setLocation("/dashboard")}>대시보드로 돌아가기</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setLocation("/dashboard")}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-muted transition-colors mr-1"
              >
                <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <img src={companyIcon} alt="Icon" className="w-8 h-8 object-contain" />
              <img src={companyLogo} alt="Logo" className="h-6 object-contain" />
            </div>
            <span className="text-sm text-muted-foreground">이벤트 모니터링</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Title + Discover All Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">경쟁사 이벤트 모니터링</h1>
            <p className="text-muted-foreground">
              공식 홈페이지와 네이버 브랜드 스토어에서 이벤트/프로모션을 탐색합니다.
            </p>
          </div>
          <Button
            onClick={() => discoverAllMutation.mutate()}
            disabled={discoverAllMutation.isPending}
            size="lg"
          >
            {discoverAllMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {discoveringCompetitor ? `${discoveringCompetitor} 탐색 중...` : "탐색 중..."}
              </>
            ) : (
              <>
                <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                전체 경쟁사 이벤트 탐색
              </>
            )}
          </Button>
        </div>

        {/* Event Type Summary */}
        {totalEvents > 0 && (
          <div className="flex flex-wrap gap-3 mb-8 p-4 bg-secondary/50 rounded-xl">
            <span className="text-sm font-semibold text-foreground self-center mr-2">
              발견된 이벤트 {totalEvents}건
            </span>
            {Object.entries(eventTypeCounts).map(([type, count]) => {
              const config = EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG["기타"];
              return (
                <Badge key={type} variant="outline" className={`${config.color} border`}>
                  {config.icon} {type} ({count})
                </Badge>
              );
            })}
          </div>
        )}

        {/* Competitor Sections */}
        {competitors.map((competitor) => {
          const events = eventsByCompetitor[competitor];
          const isDiscovering = discoveringCompetitor === competitor;
          const hasEvents = events && events.length > 0;
          const hasSearched = events !== undefined;

          return (
            <div key={competitor} className="mb-12">
              {/* Competitor Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">
                      {competitor.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{competitor}</h2>
                    {hasSearched && (
                      <p className="text-xs text-muted-foreground">
                        {hasEvents ? `${events.length}개 이벤트 발견` : "진행 중인 이벤트 없음"}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => discoverMutation.mutate(competitor)}
                  disabled={isDiscovering || discoverAllMutation.isPending}
                  variant={hasSearched ? "outline" : "default"}
                  size="sm"
                >
                  {isDiscovering ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      탐색 중...
                    </>
                  ) : hasSearched ? (
                    "다시 탐색"
                  ) : (
                    "이벤트 탐색"
                  )}
                </Button>
              </div>

              {/* Loading */}
              {isDiscovering && (
                <div className="p-8 text-center border border-dashed border-border rounded-xl">
                  <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-muted-foreground">{competitor}의 공식 홈페이지와 네이버 브랜드 스토어에서 이벤트를 탐색하고 있습니다...</p>
                  <p className="text-xs text-muted-foreground mt-1">이미지 분석(OCR)을 포함하여 시간이 걸릴 수 있습니다.</p>
                </div>
              )}

              {/* No Events Found */}
              {hasSearched && !hasEvents && !isDiscovering && (
                <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">현재 진행 중인 이벤트를 찾지 못했습니다.</p>
                </div>
              )}

              {/* Event Cards Grid */}
              {hasEvents && !isDiscovering && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}

              {/* Not searched yet placeholder */}
              {!hasSearched && !isDiscovering && (
                <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">"이벤트 탐색" 버튼을 클릭하여 이벤트를 찾아보세요.</p>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
