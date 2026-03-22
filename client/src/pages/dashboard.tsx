import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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

interface DiscoveredProduct {
  name: string;
  price: string;
  url: string;
  imageUrl?: string;
}

interface CompetitorProducts {
  products: DiscoveredProduct[];
  baseUrl: string;
  platform: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [candidates, setCandidates] = useState<BrandStoreCandidate[]>([]);

  // Price monitor state
  const [productsByCompetitor, setProductsByCompetitor] = useState<Record<string, CompetitorProducts>>({});
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [discoveringCompetitor, setDiscoveringCompetitor] = useState<string | null>(null);

  // Get user data from localStorage (set during onboarding)
  const userData = JSON.parse(localStorage.getItem('onboarding_user_data') || '{}');
  const competitors: string[] = userData.competitors || [];
  const productOrService = userData.product || '';
  const selectedServices: string[] = userData.selectedServices || [];

  const showPriceMonitor = selectedServices.includes("경쟁사 제품 가격 모니터링");
  const showEventMonitor = selectedServices.includes("이벤트 모니터링");

  // === Brand Store Discovery ===
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

  // === Price Monitor: Discover Products ===
  const discoverProductsMutation = useMutation({
    mutationFn: async (competitorName: string) => {
      setDiscoveringCompetitor(competitorName);
      const response = await apiRequest('POST', '/api/price-monitor/discover-products', {
        competitorName,
      });
      return response.json();
    },
    onSuccess: (data, competitorName) => {
      setProductsByCompetitor(prev => ({
        ...prev,
        [competitorName]: data,
      }));
      setDiscoveringCompetitor(null);
      const count = data.products?.length || 0;
      toast({
        title: "제품 탐색 완료",
        description: count > 0
          ? `${competitorName}에서 ${count}개의 제품을 발견했습니다.`
          : `${competitorName}에서 제품을 찾지 못했습니다. 직접 추가해보세요.`,
      });
    },
    onError: (_, competitorName) => {
      setDiscoveringCompetitor(null);
      toast({
        title: "탐색 실패",
        description: `${competitorName}의 제품 탐색 중 오류가 발생했습니다.`,
        variant: "destructive",
      });
    },
  });

  // === Price Monitor: Save Selected Products ===
  const saveProductsMutation = useMutation({
    mutationFn: async () => {
      const productsToSave: Array<{
        competitorName: string;
        productName: string;
        productUrl: string;
        currentPrice?: string;
        imageUrl?: string;
      }> = [];

      for (const [competitor, data] of Object.entries(productsByCompetitor)) {
        for (const product of data.products) {
          const key = `${competitor}::${product.name}`;
          if (selectedProducts.has(key)) {
            productsToSave.push({
              competitorName: competitor,
              productName: product.name,
              productUrl: product.url,
              currentPrice: product.price || undefined,
              imageUrl: product.imageUrl || undefined,
            });
          }
        }
      }

      const response = await apiRequest('POST', '/api/price-monitor/save-selections', {
        products: productsToSave,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "모니터링 등록 완료",
        description: `${data.products?.length || 0}개의 제품이 가격 모니터링에 등록되었습니다.`,
      });
      // Save to localStorage for price monitor page
      localStorage.setItem("monitored_products", JSON.stringify(data.products || []));
      setSelectedProducts(new Set());
      // Navigate to price monitor dashboard
      setTimeout(() => setLocation("/price-monitor"), 500);
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "제품 저장 중 오류가 발생했습니다.",
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

  const handleDiscoverProducts = (competitorName: string) => {
    discoverProductsMutation.mutate(competitorName);
  };

  const handleToggleProduct = (competitor: string, productName: string) => {
    const key = `${competitor}::${productName}`;
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAllProducts = (competitor: string) => {
    const data = productsByCompetitor[competitor];
    if (!data) return;
    const newSelected = new Set(selectedProducts);
    const allKeys = data.products.map(p => `${competitor}::${p.name}`);
    const allSelected = allKeys.every(k => newSelected.has(k));

    if (allSelected) {
      allKeys.forEach(k => newSelected.delete(k));
    } else {
      allKeys.forEach(k => newSelected.add(k));
    }
    setSelectedProducts(newSelected);
  };

  const totalSelectedProducts = selectedProducts.size;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
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
            경쟁사 분석 대시보드
          </h1>
          <p className="text-lg text-muted-foreground">
            온보딩이 완료되었습니다. 선택하신 서비스를 아래에서 확인하세요.
          </p>
        </div>

        {/* Status Cards */}
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
                <svg className="w-5 h-5 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                경쟁사 {competitors.length}개 등록
              </CardTitle>
              <CardDescription>
                {competitors.length > 0 ? competitors.join(", ") : "AI 자동 선정"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                서비스 {selectedServices.length}개 선택
              </CardTitle>
              <CardDescription>
                {selectedServices.length > 0 ? selectedServices.join(", ") : "없음"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* ==========================================
            Price Monitor Section
           ========================================== */}
        {showPriceMonitor && (
          <div className="mt-16">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#F59E0B"/>
                      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">W</text>
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-2xl">경쟁사 제품 가격 모니터링</CardTitle>
                    <CardDescription>
                      경쟁사의 공식 홈페이지에서 제품을 탐색하고, 가격을 모니터링할 제품을 선택하세요.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Competitor List */}
                  {competitors.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>등록된 경쟁사가 없습니다. 온보딩에서 경쟁사를 추가해주세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {competitors.map((competitor) => {
                        const data = productsByCompetitor[competitor];
                        const isDiscovering = discoveringCompetitor === competitor;
                        const hasProducts = data && data.products.length > 0;

                        return (
                          <div key={competitor} className="border border-border rounded-xl overflow-hidden">
                            {/* Competitor Header */}
                            <div className="flex items-center justify-between p-4 bg-muted/30">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <span className="text-primary font-bold text-lg">
                                    {competitor.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-foreground">{competitor}</h3>
                                  {data && (
                                    <p className="text-xs text-muted-foreground">
                                      {data.baseUrl} · {data.platform}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                onClick={() => handleDiscoverProducts(competitor)}
                                disabled={isDiscovering}
                                variant={hasProducts ? "outline" : "default"}
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
                                ) : hasProducts ? (
                                  "다시 탐색"
                                ) : (
                                  <>
                                    <svg className="mr-1.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    제품 탐색
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Loading State */}
                            {isDiscovering && (
                              <div className="p-8 text-center">
                                <div className="inline-flex items-center gap-3 text-muted-foreground">
                                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>{competitor}의 공식 홈페이지에서 제품을 찾고 있습니다...</span>
                                </div>
                              </div>
                            )}

                            {/* No Products Found */}
                            {data && data.products.length === 0 && !isDiscovering && (
                              <div className="p-6 text-center text-muted-foreground">
                                <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p className="text-sm">제품을 찾지 못했습니다. 다시 탐색하거나 웹사이트를 직접 확인해보세요.</p>
                                {data.baseUrl && (
                                  <a
                                    href={data.baseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-sm hover:underline mt-1 inline-block"
                                  >
                                    {data.baseUrl} 방문하기
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Product List */}
                            {hasProducts && !isDiscovering && (
                              <div className="p-4">
                                {/* Select All */}
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAllProducts(competitor)}
                                    className="text-sm text-primary hover:underline font-medium"
                                  >
                                    {data.products.every(p => selectedProducts.has(`${competitor}::${p.name}`))
                                      ? "전체 해제"
                                      : "전체 선택"
                                    }
                                  </button>
                                  <span className="text-xs text-muted-foreground">
                                    {data.products.filter(p => selectedProducts.has(`${competitor}::${p.name}`)).length}/{data.products.length}개 선택
                                  </span>
                                </div>

                                {/* Product Grid */}
                                <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
                                  {data.products.map((product, idx) => {
                                    const isSelected = selectedProducts.has(`${competitor}::${product.name}`);
                                    return (
                                      <div
                                        key={idx}
                                        onClick={() => handleToggleProduct(competitor, product.name)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                          isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                        }`}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => handleToggleProduct(competitor, product.name)}
                                          className="pointer-events-none"
                                        />

                                        {/* Product Image */}
                                        {product.imageUrl ? (
                                          <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-12 h-12 object-cover rounded-md border border-border"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                          </div>
                                        )}

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-foreground truncate">
                                            {product.name}
                                          </p>
                                          <a
                                            href={product.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-muted-foreground hover:text-primary truncate block"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {product.url}
                                          </a>
                                        </div>

                                        {/* Price */}
                                        {product.price && (
                                          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                                            {product.price}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Save Selected Products */}
                  {totalSelectedProducts > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        총 <span className="font-semibold text-foreground">{totalSelectedProducts}</span>개 제품 선택됨
                      </p>
                      <Button
                        onClick={() => saveProductsMutation.mutate()}
                        disabled={saveProductsMutation.isPending}
                      >
                        {saveProductsMutation.isPending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            저장 중...
                          </>
                        ) : (
                          `${totalSelectedProducts}개 제품 모니터링 시작`
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==========================================
            Event Monitor Section
           ========================================== */}
        {showEventMonitor && (
          <div className="mt-16">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#EC4899"/>
                      <rect x="6" y="12" width="12" height="8" rx="2" fill="#EC4899"/>
                      <rect x="8" y="14" width="8" height="1" fill="white"/>
                      <rect x="8" y="16" width="6" height="1" fill="white"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl">이벤트 모니터링</CardTitle>
                    <CardDescription>
                      경쟁사의 공식 홈페이지와 네이버 브랜드 스토어에서 진행 중인 이벤트/프로모션을 탐색합니다.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/event-monitor")}>
                    <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    이벤트 탐색 시작
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
                    <p className="text-2xl mb-1">🏠</p>
                    <p className="text-sm font-medium text-foreground">공식 홈페이지</p>
                    <p className="text-xs text-muted-foreground mt-1">이벤트/프로모션 페이지 탐색</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
                    <p className="text-2xl mb-1">🟢</p>
                    <p className="text-sm font-medium text-foreground">네이버 브랜드 스토어</p>
                    <p className="text-xs text-muted-foreground mt-1">브랜드 스토어 이벤트 탐색</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
                    <p className="text-2xl mb-1">🤖</p>
                    <p className="text-sm font-medium text-foreground">AI 이미지 분석</p>
                    <p className="text-xs text-muted-foreground mt-1">OCR로 이벤트 이미지 텍스트 추출</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==========================================
            Brand Store Event Finder Section
           ========================================== */}
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
