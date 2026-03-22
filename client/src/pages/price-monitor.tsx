import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import companyLogo from "@assets/회사로고_1754476459763.png";
import companyIcon from "@assets/회사 아이콘_1754476465483.png";

interface DomainPrice {
  domain: "official" | "naver" | "coupang";
  label: string;
  price: string | null;
  productUrl: string;
  fetchedAt: string;
}

interface ProductPriceResult {
  competitorName: string;
  productName: string;
  prices: DomainPrice[];
}

interface MonitoredProduct {
  id: string;
  competitorName: string;
  productName: string;
  productUrl: string;
  currentPrice: string | null;
  imageUrl: string | null;
}

const DOMAIN_CONFIG = {
  official: { label: "공식 홈페이지", color: "bg-blue-500", lightColor: "bg-blue-50 text-blue-700 border-blue-200", icon: "🏠" },
  naver: { label: "네이버 쇼핑", color: "bg-green-500", lightColor: "bg-green-50 text-green-700 border-green-200", icon: "🟢" },
  coupang: { label: "쿠팡", color: "bg-red-500", lightColor: "bg-red-50 text-red-700 border-red-200", icon: "🔴" },
};

function parsePrice(priceStr: string | null): number | null {
  if (!priceStr) return null;
  const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? null : num;
}

function PriceCard({ domainPrice, isLowest }: { domainPrice: DomainPrice; isLowest: boolean }) {
  const config = DOMAIN_CONFIG[domainPrice.domain];
  const price = parsePrice(domainPrice.price);

  return (
    <a
      href={domainPrice.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block p-4 rounded-xl border transition-all hover:shadow-md ${
        isLowest ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium text-foreground">{config.label}</span>
        </div>
        {isLowest && (
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            최저가
          </span>
        )}
      </div>
      <div className="mt-1">
        {domainPrice.price ? (
          <p className={`text-2xl font-bold ${isLowest ? "text-primary" : "text-foreground"}`}>
            {domainPrice.price}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">가격 정보 없음</p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 truncate hover:text-primary">
        {domainPrice.productUrl ? new URL(domainPrice.productUrl).hostname : "링크 없음"}
      </p>
    </a>
  );
}

export default function PriceMonitor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<MonitoredProduct[]>([]);
  const [priceResults, setPriceResults] = useState<ProductPriceResult[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  // Load monitored products from localStorage (saved from dashboard)
  useEffect(() => {
    const saved = localStorage.getItem("monitored_products");
    if (saved) {
      try {
        setProducts(JSON.parse(saved));
      } catch {
        // fallback: try fetching from API
      }
    }
  }, []);

  // Fetch prices from 3 domains
  const fetchPricesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/price-monitor/fetch-prices", {
        products: products.map((p) => ({
          id: p.id,
          competitorName: p.competitorName,
          productName: p.productName,
          productUrl: p.productUrl,
        })),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPriceResults(data.results || []);
      setHasFetched(true);
      toast({
        title: "가격 조회 완료",
        description: `${data.results?.length || 0}개 제품의 가격 정보를 조회했습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "가격 조회 실패",
        description: "가격 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Group products by competitor
  const productsByCompetitor: Record<string, MonitoredProduct[]> = {};
  for (const product of products) {
    if (!productsByCompetitor[product.competitorName]) {
      productsByCompetitor[product.competitorName] = [];
    }
    productsByCompetitor[product.competitorName].push(product);
  }

  // Find price result for a product
  const findPriceResult = (product: MonitoredProduct): ProductPriceResult | undefined => {
    return priceResults.find(
      (r) => r.competitorName === product.competitorName && r.productName === product.productName
    );
  };

  // Find lowest price domain
  const findLowestDomain = (prices: DomainPrice[]): string | null => {
    let lowest: number | null = null;
    let lowestDomain: string | null = null;
    for (const dp of prices) {
      const p = parsePrice(dp.price);
      if (p !== null && (lowest === null || p < lowest)) {
        lowest = p;
        lowestDomain = dp.domain;
      }
    }
    return lowestDomain;
  };

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background border-b border-border sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-3">
              <img src={companyIcon} alt="UNDERWATCH Icon" className="w-8 h-8 object-contain" />
              <img src={companyLogo} alt="UNDERWATCH Logo" className="h-6 object-contain" />
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">모니터링할 제품이 없습니다</h1>
          <p className="text-muted-foreground mb-6">대시보드에서 먼저 모니터링할 제품을 선택해주세요.</p>
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
              <button onClick={() => setLocation("/dashboard")} className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-muted transition-colors mr-1">
                <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <img src={companyIcon} alt="UNDERWATCH Icon" className="w-8 h-8 object-contain" />
              <img src={companyLogo} alt="UNDERWATCH Logo" className="h-6 object-contain" />
            </div>
            <span className="text-sm text-muted-foreground">제품 가격 모니터링</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Title + Fetch Button */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">경쟁사 제품 가격 모니터링</h1>
            <p className="text-muted-foreground">
              공식 홈페이지, 네이버 쇼핑, 쿠팡에서 가격을 비교합니다. 총 {products.length}개 제품 모니터링 중
            </p>
          </div>
          <Button
            onClick={() => fetchPricesMutation.mutate()}
            disabled={fetchPricesMutation.isPending}
            size="lg"
          >
            {fetchPricesMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                가격 조회 중...
              </>
            ) : hasFetched ? (
              "가격 새로고침"
            ) : (
              <>
                <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                3개 도메인 가격 조회
              </>
            )}
          </Button>
        </div>

        {/* Domain Legend */}
        <div className="flex gap-4 mb-8">
          {(["official", "naver", "coupang"] as const).map((domain) => {
            const config = DOMAIN_CONFIG[domain];
            return (
              <div key={domain} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${config.lightColor}`}>
                <span>{config.icon}</span>
                <span className="font-medium">{config.label}</span>
              </div>
            );
          })}
        </div>

        {/* Products by Competitor */}
        {Object.entries(productsByCompetitor).map(([competitor, competitorProducts]) => (
          <div key={competitor} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary font-bold">{competitor.charAt(0).toUpperCase()}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">{competitor}</h2>
              <span className="text-sm text-muted-foreground">{competitorProducts.length}개 제품</span>
            </div>

            <div className="space-y-4">
              {competitorProducts.map((product) => {
                const priceResult = findPriceResult(product);
                const lowestDomain = priceResult ? findLowestDomain(priceResult.prices) : null;

                return (
                  <Card key={product.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="w-14 h-14 object-cover rounded-lg border border-border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{product.productName}</CardTitle>
                          {product.currentPrice && (
                            <CardDescription>탐색 시 가격: {product.currentPrice}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {priceResult ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {priceResult.prices.map((dp) => (
                            <PriceCard
                              key={dp.domain}
                              domainPrice={dp}
                              isLowest={dp.domain === lowestDomain && lowestDomain !== null}
                            />
                          ))}
                        </div>
                      ) : hasFetched ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <p className="text-sm">이 제품의 가격 정보를 가져오지 못했습니다.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {(["official", "naver", "coupang"] as const).map((domain) => {
                            const config = DOMAIN_CONFIG[domain];
                            return (
                              <div key={domain} className="p-4 rounded-xl border border-dashed border-border">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{config.icon}</span>
                                  <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">가격 조회 버튼을 클릭하세요</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Price Comparison Summary */}
                      {priceResult && (() => {
                        const prices = priceResult.prices
                          .map(dp => ({ ...dp, parsed: parsePrice(dp.price) }))
                          .filter(dp => dp.parsed !== null);

                        if (prices.length < 2) return null;

                        const sorted = [...prices].sort((a, b) => (a.parsed || 0) - (b.parsed || 0));
                        const lowest = sorted[0];
                        const highest = sorted[sorted.length - 1];
                        const diff = (highest.parsed || 0) - (lowest.parsed || 0);

                        if (diff === 0) return null;

                        return (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800">
                              <span className="font-semibold">{DOMAIN_CONFIG[lowest.domain].label}</span>이(가) 가장 저렴합니다.{" "}
                              <span className="font-semibold">{DOMAIN_CONFIG[highest.domain].label}</span>보다{" "}
                              <span className="font-bold text-amber-900">{diff.toLocaleString()}원</span> 저렴
                              {highest.parsed ? ` (${((diff / highest.parsed) * 100).toFixed(1)}% 차이)` : ""}
                            </p>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
