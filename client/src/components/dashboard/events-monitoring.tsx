import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EventsSummary } from "@shared/schema";

interface EventsMonitoringProps {
  companyId: string;
  productOrService: string;
  competitors: string[];
}

export default function EventsMonitoring({ companyId, productOrService, competitors }: EventsMonitoringProps) {
  const [hasInitialized, setHasInitialized] = useState(false);

  // Mutation to discover channels
  const discoverChannelsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/channels/suggest', {
        companyId,
        productOrService,
        competitors
      });
      return response.json();
    },
    onSuccess: () => {
      // After channels are discovered, crawl for events
      crawlEventsMutation.mutate();
    }
  });

  // Mutation to crawl events
  const crawlEventsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/events/crawl', {
        companyId,
        limitDays: 30,
        limitPages: 2
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events/summary', companyId] });
      setHasInitialized(true);
    }
  });

  // Query to get summary
  const { data: summary, isLoading } = useQuery<EventsSummary>({
    queryKey: ['/api/events/summary', companyId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/events/summary?companyId=${companyId}`);
      return response.json();
    },
    enabled: hasInitialized
  });

  // Initialize data collection on first load
  useEffect(() => {
    if (!hasInitialized && !discoverChannelsMutation.isPending && !crawlEventsMutation.isPending) {
      discoverChannelsMutation.mutate();
    }
  }, [hasInitialized]);

  const isInitializing = discoverChannelsMutation.isPending || crawlEventsMutation.isPending;

  if (isInitializing || (isLoading && !summary)) {
    return <EventsMonitoringSkeleton />;
  }

  if (!summary || summary.newEventsCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이벤트 모니터링 (최근 30일)</CardTitle>
          <CardDescription>경쟁사의 프로모션, 할인, 이벤트 현황을 추적합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">이벤트 데이터를 수집 중입니다...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-events-title">
          이벤트 모니터링 (최근 30일)
        </h2>
        <p className="text-muted-foreground">
          경쟁사의 프로모션, 할인, 사은품 증정 등 이벤트 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* Summary Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">모니터링 채널</p>
              <p className="text-3xl font-bold text-primary" data-testid="text-total-channels">
                {summary.totalChannels}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">발견된 링크</p>
              <p className="text-3xl font-bold text-blue-600" data-testid="text-total-links">
                {summary.totalLinks}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">신규 이벤트</p>
              <p className="text-3xl font-bold text-green-600" data-testid="text-new-events">
                {summary.newEventsCount}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">종료 임박 (7일 이내)</p>
              <p className="text-3xl font-bold text-orange-600" data-testid="text-ending-soon">
                {summary.endingSoonCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* New Events Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>신규 이벤트 (30일 이내)</span>
              <Badge variant="secondary">{summary.events.newIn30Days.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.events.newIn30Days.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                신규 이벤트가 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {summary.events.newIn30Days.map((event) => (
                  <div 
                    key={event.id} 
                    className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                    data-testid={`card-event-${event.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm text-foreground flex-1">
                        {event.title}
                      </h4>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {event.companyName}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {event.startDate && event.endDate 
                          ? `${event.startDate} ~ ${event.endDate}`
                          : '기간 미정'}
                      </span>
                      {event.isActive && (
                        <Badge variant="default" className="bg-green-500 text-xs">
                          진행중
                        </Badge>
                      )}
                    </div>
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 inline-block"
                      data-testid={`link-event-${event.id}`}
                    >
                      자세히 보기 →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ending Soon Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>종료 임박 이벤트 (7일 이내)</span>
              <Badge variant="destructive">{summary.events.endingSoon.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.events.endingSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                종료 임박 이벤트가 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {summary.events.endingSoon.map((event) => (
                  <div 
                    key={event.id} 
                    className="border border-orange-200 rounded-lg p-4 bg-orange-50/50 hover:border-orange-300 transition-colors"
                    data-testid={`card-ending-${event.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm text-foreground flex-1">
                        {event.title}
                      </h4>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {event.companyName}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {event.endDate ? `마감: ${event.endDate}` : '기간 미정'}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        ⏰ 종료 임박
                      </Badge>
                    </div>
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 inline-block"
                      data-testid={`link-ending-${event.id}`}
                    >
                      자세히 보기 →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventsMonitoringSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Skeleton className="h-4 w-24 mx-auto" />
                <Skeleton className="h-10 w-16 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
