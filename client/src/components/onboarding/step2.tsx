import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/tracking";
import { apiRequest } from "@/lib/queryClient";

interface Step2Props {
  userConcern: string;
  onComplete: (selectedServices: string[]) => void;
}

const SERVICE_DETAILS = {
  "뉴스·보도자료 분석": {
    icon: "📰",
    color: "from-slate-600 to-slate-700",
    description: "경쟁사의 최신 뉴스를 분석해 핵심 이슈와\n전략 방향을 파악할 수 있어요\n주요 기사도 함께 추천해드려요!"
  },
  "신제품·서비스 출시": {
    icon: "🚀",
    color: "from-blue-600 to-blue-700",
    description: "경쟁사가 출시한 신제품과 서비스, 기능 확장 현황을\n한눈에 정리해드려요\n시장 대응 흐름을 빠르게 파악할 수 있어요!"
  },
  "인재 영입": {
    icon: "👥",
    color: "from-indigo-600 to-indigo-700",
    description: "경쟁사 채용 공고를 모니터링해 주요 영입 분야와\n전략 변화 가능성을 알려드려요\n인재 영입으로 준비 중인 전략을 유추할 수 있어요!"
  },
  "광고 분석": {
    icon: "📢",
    color: "from-slate-600 to-slate-700",
    description: "경쟁사가 언제, 어디에, 어떤 광고를 집행했는지\n확인하고, 신규 콘텐츠도 함께 분석해드려요\n광고 전략의 흐름을 쉽게 파악할 수 있어요!"
  },
  "SNS 콘텐츠": {
    icon: "#️⃣",
    color: "from-slate-500 to-slate-600",
    description: "경쟁사의 SNS 채널에서 어떤 콘텐츠가 올라오고,\n반응은 어떤지 실시간으로 분석해드려요\n채널별 성과 비교도 가능해요!"
  },
  "이벤트 모니터링": {
    icon: "🎉",
    color: "from-gray-600 to-gray-700",
    description: "경쟁사가 진행한 프로모션, 할인, 사은품 증정 등\n이벤트 현황을 정리해드려요\n혜택 구성과 타이밍까지 비교할 수 있어요!"
  }
};

export default function Step2({ userConcern, onComplete }: Step2Props) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['/api/recommend-services'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/recommend-services', {
        userInput: userConcern
      });
      return response.json();
    }
  });

  useEffect(() => {
    if (recommendations?.recommended_services) {
      trackEvent('card_shown', { count: recommendations.recommended_services.length });
    }
  }, [recommendations]);

  const handleServiceToggle = (serviceName: string) => {
    if (selectedServices.includes(serviceName)) {
      setSelectedServices(prev => prev.filter(s => s !== serviceName));
    } else if (selectedServices.length < 3) {
      setSelectedServices(prev => [...prev, serviceName]);
      trackEvent('card_clicked', { selected_card: serviceName });
    }
  };

  const removeService = (serviceName: string) => {
    setSelectedServices(prev => prev.filter(s => s !== serviceName));
  };

  const handleNext = () => {
    if (selectedServices.length > 0) {
      onComplete(selectedServices);
    }
  };

  // Get all available services, with recommendations first
  const recommendedServices = recommendations?.recommended_services || [];
  const allServices = Object.keys(SERVICE_DETAILS);
  const otherServices = allServices.filter(service => !recommendedServices.includes(service));

  return (
    <section className="slide-up">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            맞춤형 분석 서비스를 추천드려요
          </h1>
          <p className="text-lg text-muted-foreground">
            입력해주신 관심사를 바탕으로 가장 적합한 분석 항목을 선별했습니다.
          </p>
        </div>

        {/* User Input Summary */}
        <div className="bg-secondary rounded-xl p-6 mb-12">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-primary mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" />
            </svg>
            <span className="text-sm text-muted-foreground">입력하신 관심사:</span>
            <span className="ml-2 font-medium text-foreground">{userConcern}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-muted rounded-lg mr-4" />
                    <div className="h-6 bg-muted rounded w-32" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Recommended Services */}
            {recommendedServices.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-foreground">추천 서비스</h3>
                  <span className="text-sm text-muted-foreground">체험형 경쟁사 분석 서비스에서는 최대 3개까지 선택 가능해요</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedServices.map((serviceName: string) => {
                    const service = SERVICE_DETAILS[serviceName as keyof typeof SERVICE_DETAILS];
                    const isSelected = selectedServices.includes(serviceName);
                    
                    return (
                      <Card
                        key={serviceName}
                        className={`service-card transition-all border-2 ${
                          isSelected 
                            ? 'card-selected border-primary cursor-pointer' 
                            : selectedServices.length >= 3 
                              ? 'border-border opacity-50 cursor-not-allowed' 
                              : 'border-border hover:border-primary/50 cursor-pointer'
                        }`}
                        onClick={() => handleServiceToggle(serviceName)}
                      >
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="flex items-center mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-lg flex items-center justify-center mr-4`}>
                              <span className="text-white text-xl">{service.icon}</span>
                            </div>
                            <h3 className="text-xl font-semibold text-foreground">{serviceName}</h3>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-grow whitespace-pre-line">
                            {service.description}
                          </p>
                          <div className="flex justify-between items-center mt-auto">
                            <Badge variant="secondary" className="text-primary bg-primary/10">
                              추천
                            </Badge>
                            {isSelected && (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other Services */}
            {otherServices.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-semibold text-foreground mb-4">기타 서비스</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherServices.map((serviceName) => {
                    const service = SERVICE_DETAILS[serviceName as keyof typeof SERVICE_DETAILS];
                    const isSelected = selectedServices.includes(serviceName);
                    
                    return (
                      <Card
                        key={serviceName}
                        className={`service-card transition-all border-2 ${
                          isSelected 
                            ? 'card-selected border-primary cursor-pointer' 
                            : selectedServices.length >= 3 
                              ? 'border-border opacity-50 cursor-not-allowed' 
                              : 'border-border hover:border-primary/50 cursor-pointer'
                        }`}
                        onClick={() => handleServiceToggle(serviceName)}
                      >
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="flex items-center mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-lg flex items-center justify-center mr-4`}>
                              <span className="text-white text-xl">{service.icon}</span>
                            </div>
                            <h3 className="text-xl font-semibold text-foreground">{serviceName}</h3>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-grow whitespace-pre-line">
                            {service.description}
                          </p>
                          <div className="flex justify-between items-center mt-auto">
                            <Badge variant="outline">
                              선택 가능
                            </Badge>
                            {isSelected && (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h4 className="font-semibold text-blue-900 mb-2">선택된 분석 서비스</h4>
            <div className="flex flex-wrap gap-2">
              {selectedServices.map((service) => (
                <div key={service} className="flex items-center bg-primary text-primary-foreground rounded-md px-3 py-1">
                  <span className="text-sm font-medium">{service}</span>
                  <button
                    onClick={() => removeService(service)}
                    className="ml-2 hover:bg-primary-foreground/20 rounded-full p-1 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Button */}
        <div className="text-center">
          <Button
            onClick={handleNext}
            disabled={selectedServices.length === 0}
            size="lg"
            className="px-8 py-4 text-lg font-semibold"
          >
            분석하기
            <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Button>
          {selectedServices.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              최소 1개 이상의 서비스를 선택해주세요
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
