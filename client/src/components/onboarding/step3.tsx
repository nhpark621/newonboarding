import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  password: z.string()
    .min(8, "8자 이상 입력해주세요")
    .regex(/[A-Za-z]/, "영문을 포함해주세요")
    .regex(/\d/, "숫자를 포함해주세요"),
  company: z.string().min(1, "회사명을 입력해주세요"),
  team: z.string().min(1, "팀을 선택해주세요"),
  product: z.string().min(1, "담당 제품/서비스를 입력해주세요"),
  terms: z.boolean().refine(val => val === true, "약관에 동의해주세요"),
});

type FormData = z.infer<typeof formSchema>;

export default function Step3({ onboardingData, onComplete }: Step3Props) {
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      email: "",
      password: "",
      company: "",
      team: "",
      product: "",
      terms: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: FormData) => {
      const response = await apiRequest('POST', '/api/register', {
        email: userData.email,
        password: userData.password,
        company: userData.company,
        team: userData.team,
        product: userData.product,
      });
      return response.json();
    },
    onSuccess: (user) => {
      // Create onboarding session
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

  const onSubmit = (data: FormData) => {
    registerMutation.mutate(data);
  };

  const handleGoToDashboard = () => {
    const userData = form.getValues();
    onComplete({
      email: userData.email,
      password: userData.password,
      company: userData.company,
      team: userData.team,
      product: userData.product,
    });
  };

  return (
    <section className="slide-up">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">회원가입</h1>
          <p className="text-lg text-muted-foreground">
            개인화된 분석 결과를 제공하기 위해 간단한 정보를 입력해주세요.
          </p>
        </div>

        <div className="bg-secondary rounded-2xl p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일 주소 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="example@company.com"
                          {...field}
                          className={form.formState.errors.email ? 'border-destructive' : ''}
                        />
                        {!form.formState.errors.email && field.value && (
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

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="password"
                          placeholder="영문 + 숫자 조합, 8자 이상"
                          {...field}
                          className={form.formState.errors.password ? 'border-destructive' : ''}
                        />
                        {!form.formState.errors.password && field.value && 
                         field.value.length >= 8 && 
                         /[A-Za-z]/.test(field.value) && 
                         /\d/.test(field.value) && (
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
                        <SelectTrigger className={form.formState.errors.team ? 'border-destructive' : ''}>
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

              {/* Terms */}
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm text-muted-foreground">
                        <span className="font-medium">서비스 이용약관</span> 및{" "}
                        <span className="font-medium">개인정보 처리방침</span>에 동의합니다. *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-4 text-lg font-semibold mt-8"
                disabled={registerMutation.isPending || !form.formState.isValid}
              >
                {registerMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    가입 중...
                  </>
                ) : (
                  <>
                    경쟁사 분석 시작하기
                    <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </Button>
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
              <DialogTitle className="text-2xl font-bold">가입 완료!</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                경쟁사 분석 대시보드로 이동합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="text-center">
              <Button onClick={handleGoToDashboard} className="px-6 py-3 font-semibold">
                대시보드 시작하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
