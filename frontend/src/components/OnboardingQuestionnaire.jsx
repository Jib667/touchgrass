import { useState, useEffect } from 'react';
import { auth, saveUserPreferences } from '../firebase';
import '../styles/OnboardingQuestionnaire.css';

const OnboardingQuestionnaire = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState({
    travelStyle: '',
    interests: '',
    pace: '',
    accommodation: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Render immediately without waiting for any network operations
  useEffect(() => {
    console.log("Onboarding questionnaire mounted");
  }, []);
  
  // Set a fallback timeout to complete onboarding even if saving fails
  const saveWithFallback = async (prefsToSave) => {
    let timeoutId;
    
    try {
      setSaving(true);
      setError('');
      
      const savePromise = saveUserPreferences(auth.currentUser.uid, prefsToSave);
      
      // Set a shorter timeout to complete anyway after 3 seconds
      const fallbackPromise = new Promise(resolve => {
        timeoutId = setTimeout(() => {
          console.log("Save timeout reached, completing onboarding anyway");
          resolve({ success: true, fallback: true });
        }, 3000); // Reduced from 5s to 3s
      });
      
      // Race between actual save and timeout
      const result = await Promise.race([savePromise, fallbackPromise]);
      
      if (result.fallback) {
        console.log("Using fallback completion");
        setError("We'll save your preferences in the background.");
      } else {
        // Clear timeout if regular save succeeded
        clearTimeout(timeoutId);
        console.log("Preferences saved successfully");
      }
      
      // Call the onComplete callback from parent component
      onComplete(prefsToSave);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Please try again later.');
      // Complete anyway
      onComplete(prefsToSave);
    } finally {
      clearTimeout(timeoutId);
      setSaving(false);
    }
  };

  // Questions and options for each step - standardized to 4 options each
  const steps = [
    {
      id: 'travelStyle',
      question: 'How do you like to explore new places?',
      options: [
        { value: 'planner', label: 'with a detailed plan' },
        { value: 'spontaneous', label: 'spontaneously' },
        { value: 'guided', label: 'through guided tours' },
        { value: 'local', label: 'living like a local' },
      ],
    },
    {
      id: 'interests',
      question: 'What interests you most when traveling?',
      options: [
        { value: 'culture', label: 'culture & history' },
        { value: 'nature', label: 'nature & outdoors' },
        { value: 'food', label: 'food & dining' },
        { value: 'adventure', label: 'adventure & activities' },
      ],
    },
    {
      id: 'pace',
      question: 'What\'s your ideal travel pace?',
      options: [
        { value: 'relaxed', label: 'relaxed & easy-going' },
        { value: 'balanced', label: 'balanced mix' },
        { value: 'busy', label: 'action-packed & busy' },
        { value: 'flexible', label: 'depends on the destination' },
      ],
    },
    {
      id: 'accommodation',
      question: 'Where do you prefer to stay?',
      options: [
        { value: 'luxury', label: 'luxury hotels' },
        { value: 'boutique', label: 'boutique/unique places' },
        { value: 'budget', label: 'budget-friendly options' },
        { value: 'local', label: 'local homestays/airbnb' },
      ],
    },
  ];

  const handleOptionSelect = async (option) => {
    // Update preferences with the selected option
    const updatedPreferences = {
      ...preferences,
      [steps[currentStep].id]: option.value,
    };
    
    setPreferences(updatedPreferences);

    // Move to next step or complete
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All questions answered, save preferences and complete onboarding
      await saveWithFallback(updatedPreferences);
    }
  };

  const handleSkip = () => {
    // If user skips, we'll move to the next question without setting a preference
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All questions have been shown, save preferences and complete onboarding
      saveWithFallback(preferences);
    }
  };

  const handleSkipAll = () => {
    // Skip all questions and complete onboarding
    saveWithFallback(preferences);
  };

  const currentQuestion = steps[currentStep];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <h2>Personalize your experience</h2>
          <p className="step-indicator">Question {currentStep + 1} of {steps.length}</p>
        </div>

        {error && (
          <div className="onboarding-error">
            {error}
          </div>
        )}

        {saving ? (
          <div className="onboarding-loading">
            <div className="onboarding-spinner"></div>
            <p>Saving your preferences</p>
          </div>
        ) : (
          <div className="onboarding-content">
            <h3>{currentQuestion.question}</h3>
            
            <div className="options-container">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className="option-button"
                  onClick={() => handleOptionSelect(option)}
                  disabled={saving}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="onboarding-footer">
          <button className="skip-button" onClick={handleSkip} disabled={saving}>
            Skip
          </button>
          <button className="skip-all-button" onClick={handleSkipAll} disabled={saving}>
            {saving ? 'Saving...' : 'Skip all'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingQuestionnaire; 