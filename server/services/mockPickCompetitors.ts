// Mock competitor picker for users who skipped competitor input
export function mockPickCompetitors(productOrService: string): string[] {
  const lowerProduct = productOrService.toLowerCase();
  
  // Based on product/service keywords, suggest relevant competitors
  if (lowerProduct.includes("쇼핑") || lowerProduct.includes("이커머스") || lowerProduct.includes("스토어")) {
    return ["쿠팡", "네이버 쇼핑", "11번가"];
  }
  
  if (lowerProduct.includes("금융") || lowerProduct.includes("뱅크") || lowerProduct.includes("페이")) {
    return ["토스", "카카오뱅크", "네이버페이"];
  }
  
  if (lowerProduct.includes("배달") || lowerProduct.includes("음식") || lowerProduct.includes("푸드")) {
    return ["배달의민족", "쿠팡이츠", "요기요"];
  }
  
  if (lowerProduct.includes("숙박") || lowerProduct.includes("호텔") || lowerProduct.includes("여행")) {
    return ["야놀자", "여기어때", "호텔스닷컴"];
  }
  
  // Default competitors for general products/services
  return ["경쟁사A", "경쟁사B", "경쟁사C"];
}
