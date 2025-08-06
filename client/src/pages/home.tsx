import { useState } from "react";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/tracking";
import ProgressIndicator from "@/components/onboarding/progress-indicator";
import Step1 from "@/components/onboarding/step1";
import Step2 from "@/components/onboarding/step2";
import Step3 from "@/components/onboarding/step3";

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
    setCurrentStep(2);
    trackEvent('step1_completed');
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
              {currentStep > 1 && (
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
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-foreground">UNDERWATCH</span>
              </div>
            </div>
            
            <div className="hidden md:block">
              <ProgressIndicator 
                currentStep={currentStep} 
                onStepClick={handleStepNavigation}
                canNavigate={{
                  step1: true,
                  step2: !!onboardingData.userConcern,
                  step3: !!(onboardingData.userConcern && onboardingData.selectedServices.length > 0)
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="fade-in">
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
      </main>
    </div>
  );
}
