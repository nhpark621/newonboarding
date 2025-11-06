import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOnboardingData } from "@/lib/onboardingContext";
import EventsMonitoring from "@/components/dashboard/events-monitoring";
import companyLogo from "@assets/회사로고_1754476459763.png";
import companyIcon from "@assets/회사 아이콘_1754476465483.png";

const SERVICE_ICONS = {
  "뉴스·보도자료 분석": (
    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="#3B82F6"/>
        <rect x="6" y="7" width="6" height="1" fill="white"/>
        <rect x="6" y="9" width="12" height="1" fill="white"/>
        <rect x="6" y="11" width="12" height="1" fill="white"/>
        <rect x="6" y="13" width="8" height="1" fill="white"/>
        <rect x="14" y="7" width="4" height="3" fill="white"/>
      </svg>
    </div>
  ),
  "신제품·서비스 출시": (
    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="#10B981"/>
      </svg>
    </div>
  ),
  "인재 영입": (
    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3" fill="#8B5CF6"/>
        <path d="M12 12C8.69 12 6 14.69 6 18H18C18 14.69 15.31 12 12 12Z" fill="#8B5CF6"/>
      </svg>
    </div>
  ),
  "광고 분석": (
    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M19 7H5C3.9 7 3 7.9 3 9V18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18V9C21 7.9 20.1 7 19 7Z" fill="#F97316"/>
        <path d="M12 2L15.5 6H8.5L12 2Z" fill="#F97316"/>
        <circle cx="12" cy="13" r="2" fill="white"/>
      </svg>
    </div>
  ),
  "SNS 콘텐츠": (
    <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H8L12 22L16 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="#06B6D4"/>
        <circle cx="8" cy="9" r="1.5" fill="white"/>
        <circle cx="12" cy="9" r="1.5" fill="white"/>
        <circle cx="16" cy="9" r="1.5" fill="white"/>
      </svg>
    </div>
  ),
  "이벤트 모니터링": (
    <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#EC4899"/>
        <rect x="6" y="12" width="12" height="8" rx="2" fill="#EC4899"/>
        <rect x="8" y="14" width="8" height="1" fill="white"/>
        <rect x="8" y="16" width="6" height="1" fill="white"/>
      </svg>
    </div>
  )
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<ReturnType<typeof getOnboardingData>>(null);

  useEffect(() => {
    const data = getOnboardingData();
    if (!data) {
      // Redirect to home if no onboarding data
      setLocation('/');
      return;
    }
    setOnboardingData(data);
    
    // Auto-select first service if available
    if (data.selectedServices && data.selectedServices.length > 0) {
      setSelectedService(data.selectedServices[0]);
    }
  }, [setLocation]);

  if (!onboardingData || !onboardingData.userData) {
    return null;
  }

  const { userData, selectedServices } = onboardingData;
  const companyId = userData.id || `temp-${Date.now()}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
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
              <div className="text-right">
                <p className="text-sm font-medium text-foreground" data-testid="text-company-name">
                  {userData.company}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userData.team} · {userData.product}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Service Selection Tabs */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">경쟁사 분석 대시보드</h1>
          <p className="text-muted-foreground mb-6">
            선택하신 분석 서비스의 실시간 데이터를 확인하세요
          </p>

          <div className="flex items-center space-x-3 overflow-x-auto pb-2">
            {selectedServices.map((service) => (
              <button
                key={service}
                onClick={() => setSelectedService(service)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all whitespace-nowrap ${
                  selectedService === service
                    ? 'border-primary bg-primary/5 text-primary font-semibold'
                    : 'border-border hover:border-primary/50 text-foreground'
                }`}
                data-testid={`button-service-${service}`}
              >
                <div className="flex-shrink-0">
                  {SERVICE_ICONS[service as keyof typeof SERVICE_ICONS]}
                </div>
                <span>{service}</span>
                {service === "이벤트 모니터링" && (
                  <Badge variant="default" className="bg-green-500 text-xs">Live</Badge>
                )}
                {service !== "이벤트 모니터링" && (
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Service Content */}
        <div className="mt-8">
          {selectedService === "이벤트 모니터링" ? (
            <EventsMonitoring
              companyId={companyId}
              productOrService={userData.product}
              competitors={userData.competitors || []}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  {SERVICE_ICONS[selectedService as keyof typeof SERVICE_ICONS]}
                  <span>{selectedService}</span>
                </CardTitle>
                <CardDescription>
                  이 서비스는 곧 출시됩니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary mb-4">
                    <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {selectedService} 준비 중
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    현재 이벤트 모니터링 서비스를 먼저 체험해보실 수 있습니다. 
                    다른 분석 서비스는 순차적으로 추가될 예정입니다.
                  </p>
                  <Button
                    onClick={() => setSelectedService("이벤트 모니터링")}
                    className="mt-6"
                    data-testid="button-go-events"
                  >
                    이벤트 모니터링 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
