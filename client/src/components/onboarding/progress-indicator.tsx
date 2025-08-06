interface ProgressIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  canNavigate?: {
    step1: boolean;
    step2: boolean;
    step3: boolean;
  };
}

export default function ProgressIndicator({ 
  currentStep, 
  onStepClick,
  canNavigate = { step1: true, step2: false, step3: false }
}: ProgressIndicatorProps) {
  const handleStepClick = (step: number) => {
    if (onStepClick) {
      onStepClick(step);
    }
  };

  const getStepClass = (step: number) => {
    const isActive = currentStep >= step;
    const isClickable = canNavigate[`step${step}` as keyof typeof canNavigate];
    
    return `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
      isActive 
        ? 'bg-primary text-primary-foreground' 
        : 'bg-muted text-muted-foreground'
    } ${
      isClickable && onStepClick 
        ? 'cursor-pointer hover:scale-110 hover:shadow-md' 
        : ''
    }`;
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center">
        <div 
          className={getStepClass(1)}
          onClick={() => canNavigate.step1 && handleStepClick(1)}
        >
          1
        </div>
        <div className="w-12 h-1 bg-muted mx-2">
          <div 
            className={`progress-bar h-full bg-primary transition-all duration-400 ${
              currentStep >= 2 ? 'w-full' : 'w-0'
            }`}
          />
        </div>
        <div 
          className={getStepClass(2)}
          onClick={() => canNavigate.step2 && handleStepClick(2)}
        >
          2
        </div>
        <div className="w-12 h-1 bg-muted mx-2">
          <div 
            className={`progress-bar h-full bg-primary transition-all duration-400 ${
              currentStep >= 3 ? 'w-full' : 'w-0'
            }`}
          />
        </div>
        <div 
          className={getStepClass(3)}
          onClick={() => canNavigate.step3 && handleStepClick(3)}
        >
          3
        </div>
      </div>
    </div>
  );
}
