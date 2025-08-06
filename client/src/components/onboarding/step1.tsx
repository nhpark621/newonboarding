import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/tracking";

interface Step1Props {
  onComplete: (userConcern: string) => void;
}

const PREDEFINED_TAGS = [
  { name: "신제품 출시 현황", icon: "🚀" },
  { name: "광고 발행", icon: "📢" },
  { name: "HR 인재채용", icon: "👥" },
  { name: "SNS 게시물 분석", icon: "#️⃣" },
];

export default function Step1({ onComplete }: Step1Props) {
  const [userInput, setUserInput] = useState("");

  const handleInputChange = (value: string) => {
    setUserInput(value);
    if (value.length > 0) {
      trackEvent('input_started', { method: 'manual' });
    }
  };

  const handleTagClick = (tagName: string) => {
    const tagText = `경쟁사의 ${tagName}에 대해 궁금해요.`;
    const newInput = userInput ? `${userInput} ${tagText}` : tagText;
    setUserInput(newInput);
    
    trackEvent('tag_selected', { tag_name: tagName });
    trackEvent('auto_text_generated', { generated_text: tagText });
  };

  const handleNext = () => {
    if (userInput.trim()) {
      onComplete(userInput.trim());
    }
  };

  return (
    <section className="fade-in">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            경쟁사와 관련해 가장 궁금한 점은 무엇인가요?
          </h1>
          <p className="text-lg text-muted-foreground">
            입력하신 내용을 바탕으로 경쟁사 분석 결과를 더욱 정교하게 보여드립니다.
          </p>
        </div>

        <div className="bg-secondary rounded-2xl p-8 mb-8">
          {/* Input Area */}
          <div className="mb-6">
            <div className="relative">
              <Textarea
                placeholder="예: 경쟁사의 신제품 출시 전략이 궁금해요..."
                value={userInput}
                onChange={(e) => handleInputChange(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={200}
              />
              <div className="absolute bottom-3 right-3 text-sm text-muted-foreground">
                {userInput.length}/200
              </div>
            </div>
          </div>

          {/* Recommended Tags */}
          <div className="mb-6">
            <p className="text-sm font-medium text-foreground mb-3">추천 주제를 선택해보세요</p>
            <div className="flex flex-wrap gap-3">
              {PREDEFINED_TAGS.map((tag) => (
                <Button
                  key={tag.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTagClick(tag.name)}
                  className="tag-button hover:border-primary hover:text-primary"
                >
                  <span className="mr-1">{tag.icon}</span>
                  {tag.name}
                </Button>
              ))}
            </div>
          </div>


        </div>

        {/* Next Button */}
        <div className="text-center">
          <Button
            onClick={handleNext}
            disabled={!userInput.trim()}
            size="lg"
            className="px-8 py-4 text-lg font-semibold"
          >
            맞춤 분석 서비스 확인하기
            <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
}
