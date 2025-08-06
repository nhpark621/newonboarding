import { useState } from "react";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/tracking";
import ProgressIndicator from "@/components/onboarding/progress-indicator";
import Step1 from "@/components/onboarding/step1";
import Step2 from "@/components/onboarding/step2";
import Step3 from "@/components/onboarding/step3";
import companyLogo from "@assets/회사로고_1754476459763.png";
import companyIcon from "@assets/회사 아이콘_1754476465483.png";
import mascot1 from "@assets/1아이콘_1754479209971.png";
import mascot2 from "@assets/2아이콘_1754479209969.png";
import mascot3 from "@assets/3아이콘_1754479209970.png";

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
  const [matchingStage, setMatchingStage] = useState(0); // 0: analyzing, 1: matching, 2: completing
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
    setMatchingStage(0);
    trackEvent('step1_completed');
    
    // Progressive stage animation: analyzing → matching → completing
    setTimeout(() => setMatchingStage(1), 800);  // Move to matching stage
    setTimeout(() => setMatchingStage(2), 1600); // Move to completing stage
    setTimeout(() => {
      setShowMatching(false);
      setMatchingStage(0);
      setCurrentStep(2);
    }, 2500);
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
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
            <div className="text-center max-w-lg mx-auto px-6 bg-background/80 backdrop-blur-sm rounded-2xl py-12 shadow-lg border border-border/50">
              {/* Professional Progress Interface */}
              <div className="mb-8">
                {/* Progress Bar Container */}
                <div className="w-full max-w-md mx-auto mb-8">
                  <div className="bg-secondary/50 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out ${
                        matchingStage === 0 ? 'w-1/3' : matchingStage === 1 ? 'w-2/3' : 'w-full'
                      }`}
                    >
                      <div className="h-full bg-white/20 animate-pulse rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center justify-center space-x-12">
                  {/* Step 1: Analyzing */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      matchingStage >= 0 ? 'border-primary bg-primary text-white' : 'border-muted bg-background text-muted-foreground'
                    }`}>
                      {matchingStage > 0 ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      matchingStage >= 0 ? 'text-primary' : 'text-muted-foreground'
                    }`}>Analyzing</span>
                  </div>

                  {/* Step 2: Matching */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      matchingStage >= 1 ? 'border-primary bg-primary text-white' : 'border-muted bg-background text-muted-foreground'
                    }`}>
                      {matchingStage > 1 ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : matchingStage === 1 ? (
                        <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      matchingStage >= 1 ? 'text-primary' : 'text-muted-foreground'
                    }`}>Matching</span>
                  </div>

                  {/* Step 3: Complete */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      matchingStage >= 2 ? 'border-green-500 bg-green-500 text-white' : 'border-muted bg-background text-muted-foreground'
                    }`}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      matchingStage >= 2 ? 'text-green-600' : 'text-muted-foreground'
                    }`}>Complete</span>
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Matching your customized competitor analysis service…
              </h2>
              <p className="text-muted-foreground text-sm">
                We're using your input to find the most relevant insights.
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
