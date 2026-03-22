import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trackEvent } from "@/lib/tracking";
import { apiRequest } from "@/lib/queryClient";
import { OnboardingData } from "@/pages/home";

interface Step3Props {
  onboardingData: OnboardingData;
  onComplete: (userData: OnboardingData['userData']) => void;
}

const formSchema = z.object({
  company: z.string().min(1, "회사명을 입력해주세요"),
  team: z.string().min(1, "팀을 선택해주세요"),
  product: z.string().min(1, "담당 제품/서비스를 입력해주세요"),
  domain: z.string().optional(),
  competitors: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Step3({ onboardingData, onComplete }: Step3Props) {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [showCompetitorSection, setShowCompetitorSection] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      company: "",
      team: "",
      product: "",
      domain: "",
      competitors: [],
    },
  });

  const recommendCompetitorsMutation = useMutation({
    mutationFn: async (data: { company: string; team: string; product: string }) => {
      const response = await apiRequest('POST', '/api/recommend-competitors', data);
      return response.json();
    },
    onSuccess: (data) => {
      const recommended = data.recommended_competitors || [];
      setCompetitors(recommended);
      setShowCompetitorSection(true);
      trackEvent('competitors_recommended', { count: recommended.length });
    },
    onError: () => {
      setShowCompetitorSection(true);
      trackEvent('competitors_recommendation_failed');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: FormData) => {
      const response = await apiRequest('POST', '/api/register', {
        company: userData.company,
        team: userData.team,
        product: userData.product,
        competitors: competitors,
      });
      return response.json();
    },
    onSuccess: (user) => {
      apiRequest('POST', '/api/onboarding-session', {
        userConcern: onboardingData.userConcern,
        selectedServices: onboardingData.selectedServices,
        userId: user.id,
      });

      setShowSuccessModal(true);
    },
    onError: (error) => {
      console.error('Registration failed:', error);
    },
  });

  const handleRecommendCompetitors = () => {
    const { company, team, product } = form.getValues();
    if (company && team && product) {
      recommendCompetitorsMutation.mutate({ company, team, product });
    }
  };

  const onSubmit = (data: FormData) => {
    registerMutation.mutate(data);
  };

  const handleGoToDashboard = () => {
    const userData = form.getValues();
    const completeData = {
      company: userData.company,
      team: userData.team,
      product: userData.product,
      domain: userData.domain,
      competitors: competitors,
      selectedServices: onboardingData.selectedServices,
    };

    localStorage.setItem('onboarding_user_data', JSON.stringify(completeData));

    onComplete(completeData);
  };

  const handleAddCompetitor = () => {
    if (competitorInput.trim() && !competitors.includes(competitorInput.trim())) {
      setCompetitors([...competitors, competitorInput.trim()]);
      setCompetitorInput("");
    }
  };

  const handleRemoveCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCompetitor();
    }
  };

  const isFormFilledForRecommendation = form.watch("company") && form.watch("team") && form.watch("product");

  return (
    <section className="slide-up">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">경쟁사 분석 정보 입력</h1>
          <p className="text-lg text-muted-foreground">
            맞춤형 경쟁사 분석을 위해 간단한 정보를 입력해주세요.
          </p>
        </div>

        <div className="bg-secondary rounded-2xl p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Company */}
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>회사명 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="회사명을 입력해주세요"
                          {...field}
                          data-testid="input-company"
                          className={form.formState.errors.company ? 'border-destructive' : ''}
                        />
                        {!form.formState.errors.company && field.value && (
                          <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Team */}
              <FormField
                control={form.control}
                name="team"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>소속 팀 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger
                          data-testid="select-team"
                          className={form.formState.errors.team ? 'border-destructive' : ''}>
                          <SelectValue placeholder="팀을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="marketing">마케팅팀</SelectItem>
                        <SelectItem value="strategy">기획/전략팀</SelectItem>
                        <SelectItem value="insights">인사이트팀</SelectItem>
                        <SelectItem value="data">데이터 분석팀</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product */}
              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>담당 제품/서비스 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="담당하시는 제품 또는 서비스명을 입력해주세요"
                          {...field}
                          data-testid="input-product"
                          className={form.formState.errors.product ? 'border-destructive' : ''}
                        />
                        {!form.formState.errors.product && field.value && (
                          <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Domain */}
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>자사 도메인 <span className="text-muted-foreground font-normal">(선택사항)</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: https://www.mycompany.com"
                        {...field}
                        data-testid="input-domain"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      자사 공식 홈페이지 주소를 입력하면 경쟁사 분석 시 비교 기준으로 활용됩니다
                    </p>
                  </FormItem>
                )}
              />

              {/* AI Competitor Recommendation Button */}
              {!showCompetitorSection && (
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleRecommendCompetitors}
                    disabled={!isFormFilledForRecommendation || recommendCompetitorsMutation.isPending}
                    className="w-full py-4 text-lg font-semibold"
                    variant="outline"
                  >
                    {recommendCompetitorsMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI가 경쟁사를 분석 중입니다...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI 경쟁사 추천받기
                      </>
                    )}
                  </Button>
                  {!isFormFilledForRecommendation && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      위 정보를 모두 입력하면 AI가 경쟁사를 추천해드립니다
                    </p>
                  )}
                </div>
              )}

              {/* Competitor Section (shown after AI recommendation) */}
              {showCompetitorSection && (
                <div className="space-y-4 pt-2">
                  <div className="border border-border rounded-xl p-5 bg-background">
                    <div className="flex items-center justify-between mb-3">
                      <FormLabel className="text-sm font-medium">
                        모니터링할 경쟁사
                      </FormLabel>
                      {competitors.length > 0 && (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full font-medium">
                          AI 추천 완료
                        </span>
                      )}
                    </div>

                    {/* Recommended Competitors Tags */}
                    {competitors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {competitors.map((competitor, index) => (
                          <div
                            key={index}
                            data-testid={`competitor-tag-${index}`}
                            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium"
                          >
                            <span>{competitor}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCompetitor(index)}
                              data-testid={`button-remove-competitor-${index}`}
                              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {competitors.length === 0 && (
                      <p className="text-sm text-muted-foreground mb-4">
                        추천된 경쟁사가 없습니다. 직접 추가해주세요.
                      </p>
                    )}

                    {/* Add Competitor Input */}
                    <div className="flex gap-2">
                      <Input
                        value={competitorInput}
                        onChange={(e) => setCompetitorInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="경쟁사를 추가하려면 이름을 입력하세요"
                        data-testid="input-competitor"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleAddCompetitor}
                        disabled={!competitorInput.trim()}
                        data-testid="button-add-competitor"
                        variant="outline"
                        className="whitespace-nowrap"
                      >
                        추가
                      </Button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    data-testid="button-submit-form"
                    className="w-full py-4 text-lg font-semibold"
                    disabled={registerMutation.isPending || !form.formState.isValid}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        처리 중...
                      </>
                    ) : (
                      <>
                        경쟁사 분석 대시보드 보기
                        <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <DialogTitle className="text-xl font-bold leading-tight text-center">경쟁사 분석에 필요한 모든 단계를 완료했어요!</DialogTitle>
              <DialogDescription className="text-muted-foreground text-center">
                이제 분석 결과 대시보드로 이동할게요
              </DialogDescription>
            </DialogHeader>
            <div className="text-center">
              <Button
                onClick={handleGoToDashboard}
                data-testid="button-go-dashboard"
                className="px-6 py-3 font-semibold relative overflow-hidden bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out">
                대시보드 시작하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
