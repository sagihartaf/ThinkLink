import { useState } from "react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/Untitled design 2.png";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "שיחות משמעותיות בקבוצות קטנות",
    text: "התחברו למפגשים אמיתיים עם אנשים שחולקים את תחומי העניין שלכם"
  },
  {
    title: "מפגשים אמיתיים סביב תחומי עניין",
    text: "בחרו נושאים שמעניינים אתכם והצטרפו לשיחות מרתקות"
  },
  {
    title: "מתחילים באפליקציה, נפגשים במציאות",
    text: "תכננו מפגשים פנים אל פנים והכירו אנשים חדשים"
  }
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide >= slides.length - 1) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f4f9ff]" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-6">
          <img src={logoPath} alt="ThinkLink" className="mx-auto h-14" />
          
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-[#1b1b1b]" data-testid="onboarding-title">
              {slides[currentSlide].title}
            </h1>
            <p className="text-lg text-[#9AA0A6]" data-testid="onboarding-text">
              {slides[currentSlide].text}
            </p>
          </div>
          
          <div className="flex justify-center space-x-reverse space-x-2 pt-4">
            {slides.map((_, index) => (
              <span
                key={index}
                className={`h-2 rounded-full ${
                  index === currentSlide 
                    ? "w-8 bg-[#8c52ff]" 
                    : "w-2 bg-gray-300"
                }`}
                data-testid={`slide-indicator-${index}`}
              />
            ))}
          </div>
        </div>
        
        <Button 
          onClick={handleNext}
          className="w-full py-4 bg-gradient-to-r from-[#8c52ff] to-[#5ce1e6] hover:opacity-90 font-semibold text-lg shadow-lg"
          data-testid="button-next"
        >
          {currentSlide >= slides.length - 1 ? "בואו נתחיל" : "המשך"}
        </Button>
      </div>
    </div>
  );
}
