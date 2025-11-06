import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import companyLogo from "@assets/회사로고_1754476459763.png";
import companyIcon from "@assets/회사 아이콘_1754476465483.png";

interface BrandStoreCandidate {
  competitor: string;
  baseUrl: string;
  platform: string;
  eventPaths: string[];
  score: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [candidates, setCandidates] = useState<BrandStoreCandidate[]>([]);
  // Get user data from localStorage (set during onboarding)
  const userData = JSON.parse(localStorage.getItem('onboarding_user_data') || '{}');
  const competitors = userData.competitors || [];
  const productOrService = userData.product || '';

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/brandstore/discover', {
        competitors,
        productOrService,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCandidates(data.candidates || []);
      toast({
        title: "탐색 완료",
        description: `${data.candidates?.length || 0}개의 브랜드 스토어를 발견했습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "탐색 실패",
        description: "브랜드 스토어 탐색 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (selections: BrandStoreCandidate[]) => {
      const response = await apiRequest('POST', '/api/brandstore/approve', {
        selections: selections.map(s => ({
          competitor: s.competitor,
          baseUrl: s.baseUrl,
          platform: s.platform,
          eventPaths: s.eventPaths,
        })),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "저장 완료",
        description: `${data.channels?.length || 0}개의 채널과 ${data.eventPages?.length || 0}개의 이벤트 페이지가 저장되었습니다.`,
      });
      setSelectedCandidates(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/brandstore/channels'] });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "선택 항목 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDiscover = () => {
    discoverMutation.mutate();
  };

  const handleToggleCandidate = (key: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedCandidates(newSelected);
  };

  const handleSaveSelections = () => {
    const selections = candidates.filter(c => 
      selectedCandidates.has(`${c.competitor}-${c.baseUrl}`)
    );
    approveMutation.mutate(selections);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={companyIcon} 
                alt="UNDERWATCH Icon" 
                className="w-8 h-8 object-contain"
              />
              <img 
                src={companyLogo} 
                alt="UNDERWATCH Logo" 
                className="h-6 object-contain"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">경쟁사 분석 대시보드</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            환영합니다! 🎉
          </h1>
          <p className="text-lg text-muted-foreground">
            온보딩이 완료되었습니다. 경쟁사 분석 대시보드가 준비 중입니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                온보딩 완료
              </CardTitle>
              <CardDescription>
                회원가입과 서비스 선택이 완료되었습니다.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 text-accent mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                대시보드 준비 중
              </CardTitle>
              <CardDescription>
                맞춤형 경쟁사 분석 대시보드를 준비하고 있습니다.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                데이터 수집 시작
              </CardTitle>
              <CardDescription>
                선택하신 서비스에 따라 데이터 수집을 시작합니다.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Brand Store Event Finder Section */}
        <div className="mt-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">브랜드 직영 스토어 이벤트 탐색</CardTitle>
              <CardDescription>
                경쟁사의 브랜드 직영 스토어에서 이벤트 페이지를 자동으로 찾아드립니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      등록된 경쟁사: <span className="font-medium text-foreground">
                        {competitors.length > 0 ? competitors.join(", ") : "없음 (AI 자동 선정)"}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      제품/서비스: <span className="font-medium text-foreground">{productOrService || "없음"}</span>
                    </p>
                  </div>
                  <Button
                    onClick={handleDiscover}
                    disabled={discoverMutation.isPending}
                    data-testid="button-discover-stores"
                  >
                    {discoverMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        탐색 중...
                      </>
                    ) : (
                      "브랜드 스토어 탐색"
                    )}
                  </Button>
                </div>

                {/* Candidates Table */}
                {candidates.length > 0 && (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium text-sm">선택</th>
                            <th className="p-3 text-left font-medium text-sm">경쟁사</th>
                            <th className="p-3 text-left font-medium text-sm">도메인</th>
                            <th className="p-3 text-left font-medium text-sm">플랫폼</th>
                            <th className="p-3 text-left font-medium text-sm">발견된 이벤트 경로</th>
                            <th className="p-3 text-left font-medium text-sm">점수</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.map((candidate, index) => {
                            const key = `${candidate.competitor}-${candidate.baseUrl}`;
                            return (
                              <tr key={key} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="p-3">
                                  <Checkbox
                                    checked={selectedCandidates.has(key)}
                                    onCheckedChange={() => handleToggleCandidate(key)}
                                    data-testid={`checkbox-candidate-${index}`}
                                  />
                                </td>
                                <td className="p-3 text-sm font-medium">{candidate.competitor}</td>
                                <td className="p-3 text-sm">
                                  <a 
                                    href={candidate.baseUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {candidate.baseUrl}
                                  </a>
                                </td>
                                <td className="p-3 text-sm">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary text-xs font-medium">
                                    {candidate.platform}
                                  </span>
                                </td>
                                <td className="p-3 text-sm">
                                  <details className="cursor-pointer">
                                    <summary className="text-primary hover:underline">
                                      {candidate.eventPaths.length}개 경로 보기
                                    </summary>
                                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground pl-4">
                                      {candidate.eventPaths.map((path, idx) => (
                                        <li key={idx} className="truncate">
                                          <a 
                                            href={path} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="hover:text-primary"
                                          >
                                            {path}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                </td>
                                <td className="p-3 text-sm font-semibold">{candidate.score}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {selectedCandidates.size}개 선택됨
                      </p>
                      <Button
                        onClick={handleSaveSelections}
                        disabled={selectedCandidates.size === 0 || approveMutation.isPending}
                        data-testid="button-save-selections"
                      >
                        {approveMutation.isPending ? "저장 중..." : "선택 항목 저장"}
                      </Button>
                    </div>
                  </div>
                )}

                {candidates.length === 0 && !discoverMutation.isPending && (
                  <div className="text-center py-12 text-muted-foreground">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>탐색 버튼을 클릭하여 브랜드 스토어를 찾아보세요.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
