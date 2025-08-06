import { useState } from "react";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/tracking";
import ProgressIndicator from "@/components/onboarding/progress-indicator";
import Step1 from "@/components/onboarding/step1";
import Step2 from "@/components/onboarding/step2";
import Step3 from "@/components/onboarding/step3";
import companyLogo from "@assets/회사로고_1754476459763.png";
import companyIcon from "@assets/회사 아이콘_1754476465483.png";

export interface OnboardingData {
  userConcern: string;
  selectedServices: string[];
  userData?: {
    email: string;
    password: string;
    company: string;
    team: string;
    product?: string;
  };
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showMatching, setShowMatching] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    userConcern: "",
    selectedServices: [],
  });
  const [, setLocation] = useLocation();

  const handleStepNavigation = (step: number) => {
    // Only allow navigation to completed or current step
    if (step === 1) {
      setCurrentStep(1);
    } else if (step === 2 && onboardingData.userConcern) {
      setCurrentStep(2);
    } else if (step === 3 && onboardingData.userConcern && onboardingData.selectedServices.length > 0) {
      setCurrentStep(3);
    }
  };

  const handleBackClick = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStep1Complete = (userConcern: string) => {
    setOnboardingData(prev => ({ ...prev, userConcern }));
    setShowMatching(true);
    trackEvent('step1_completed');
    
    // Show matching animation for 2 seconds, then proceed to Step 2
    setTimeout(() => {
      setShowMatching(false);
      setCurrentStep(2);
    }, 2000);
  };

  const handleStep2Complete = (selectedServices: string[]) => {
    setOnboardingData(prev => ({ ...prev, selectedServices }));
    setCurrentStep(3);
    trackEvent('signup_started');
  };

  const handleStep3Complete = (userData: OnboardingData['userData']) => {
    setOnboardingData(prev => ({ ...prev, userData }));
    trackEvent('signup_completed');
    trackEvent('onboarding_completed');
    
    // Redirect to dashboard
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Back Button */}
              {currentStep > 1 && !showMatching && (
                <button
                  onClick={handleBackClick}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-muted transition-colors"
                >
                  <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              
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
            </div>
            
            <div className="hidden md:block">
              {!showMatching && (
                <ProgressIndicator 
                  currentStep={currentStep} 
                  onStepClick={handleStepNavigation}
                  canNavigate={{
                    step1: true,
                    step2: !!onboardingData.userConcern,
                    step3: !!(onboardingData.userConcern && onboardingData.selectedServices.length > 0)
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="fade-in">
        {showMatching ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                맞춤형 분석 서비스를 구성 중입니다
              </h2>
              <p className="text-muted-foreground">
                입력해주신 고민을 바탕으로 최적의 서비스를 매칭하고 있어요
              </p>
            </div>
          </div>
        ) : (
          <>
            {currentStep === 1 && (
              <Step1 onComplete={handleStep1Complete} />
            )}
            {currentStep === 2 && (
              <Step2 
                userConcern={onboardingData.userConcern}
                onComplete={handleStep2Complete} 
              />
            )}
            {currentStep === 3 && (
              <Step3 
                onboardingData={onboardingData}
                onComplete={handleStep3Complete} 
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
