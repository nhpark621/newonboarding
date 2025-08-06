interface ProgressIndicatorProps {
  currentStep: number;
}

export default function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center">
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            currentStep >= 1 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}
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
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            currentStep >= 2 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}
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
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            currentStep >= 3 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          3
        </div>
      </div>
    </div>
  );
}
