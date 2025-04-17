import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../context/AuthContext";
import { getFullMediaUrl, getRandomQuestion, submitAnswer, getQuestionMedia } from "../api";


// This page is the game container. It displays 4 images or videos which the user may choose from. 
// Runner component is available on this page 

export function GameScreen() {
  const navigate = useNavigate()
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isAnswered, setIsAnswered] = useState(false)
  const [correctId, setCorrectId] = useState(null)
  const [question, setQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, signOut } = useAuth();
  const maxRounds = 5;
  const [questionCount, setQuestionCount] = useState(1);
  // console.log("Logged in as:", user?.username);

  useEffect(() => {
    const fetchQuestion = async () => {
      setIsLoading(true);
      const result = await getRandomQuestion();

      if (result!=="undefined" && !result.error){
        const media = await getQuestionMedia(result.question_id);
        
        // transform backend image paths to match my folder
        const images = result.answers.map((a, index) => {
          const isTextQuestion = !a.text.includes('.jpg') && !a.text.includes('.png');
          return {
            id: a.id,
            url: isTextQuestion ? null : getFullMediaUrl(media.media_urls[index]),
            text: isTextQuestion ? a.text : null,
            isDeepfake: a.correct,
          }
        });

        const correctIndex = Math.floor(Math.random() * images.length);
        images[correctIndex].isDeepfake = true; 
        setQuestion({
          question_id: result.question_id,
          question_text: result.question_text,
          images: images,
        });
      }
      setIsLoading(false);
    };
    fetchQuestion();
  }, [questionCount]);

  useEffect(() => {
    if (question) {
      const correct = question.images.find((img) => img.isDeepfake);
      if (correct) setCorrectId(correct.id);
     }
  }, [question]);

  {/* Function to handle user answer selection */}
  const handleAnswer = async (image) => {
    if (isAnswered) return;

    setSelected(image.id);
    setShowFeedback(true);

    let earned = 0;

    if (image.isDeepfake) {
      earned = 10;
      setScore((prev) => prev + earned);
    }

    setIsAnswered(true);

    // Submit to backend
    await submitAnswer({
      user_id: user?.user_id || -1,  //handle guest
      question_id: question.question_id,
      selected_id: image.id,
      correct_id: correctId,
      score_earned: earned,
    });
  };

  {/* Function to go to the next question */}
  const handleNext = () => {
    setSelected(null);
    setShowFeedback(false);
    setIsAnswered(false);
    setCorrectId(null);
    setIsLoading(true);

    setQuestionCount((prev) => {
      const newCount = prev + 1;
      if(newCount > maxRounds) {
        navigate("/fin", { state: { score } });
      }
      return newCount;
    });
  };
  
  if (isLoading || !question) { 
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-xl font-mono">Loading question...</p>
          <p className="text-slate-400 text-sm">Preparing your deepfake challenge</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-8 p-4"> {/* Page container */}
      {user?.username ? (
      <p className="text-sm text-slate-400 font-mono">
        Welcome, {user.username}!
      </p>
    ) : (
      <p className="text-sm text-yellow-400 font-mono">
        Playing as guest – your scores won't be saved.
      </p>
    )}

      <p className="text-sm text-slate-400 font-mono">
        Round {questionCount} / {maxRounds}
      </p>
    
      
      {/* Question text display */}
      <div className="text-center max-w-2xl">
        <p className="text-2xl font-mono mb-4">{question.question_text}</p>
      </div>

      {/* Answers grid - supports both images and text */}
      <div className="grid grid-cols-2 gap-4">
        {question.images.map((item) => {
          let borderColor = 'border-transparent'
      
          if (isAnswered) {
            if (item.id === correctId) {
              borderColor = 'border-green-500'
            } else if (item.id === selected) {
              borderColor = 'border-red-500'
            }
          }

          return (
            <button
              key={item.id}
              onClick={() => handleAnswer(item)}
              disabled={isAnswered}
              className={`border-4 rounded-lg overflow-hidden ${borderColor} hover:bg-slate-800 transition-colors`}
            >
              {item.url ? (
                // Image answer
                <img
                  src={item.url}
                  alt="choice"
                  className="w-40 h-40 object-cover"
                />
              ) : (
                // Text answer
                <div className="p-6 min-w-[300px]">
                  <p className="text-center break-words">
                    {item.text}
                  </p>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {showFeedback && (
        <div className="flex flex-col items-center">
          {selected === correctId ? (
            <p className="text-green-400 text-center font-mono">
              Correct! +10 points
            </p>
          ) : (
            <p className="text-red-400 text-center font-mono">
              Incorrect!
            </p>
          )}

          <button
            onClick={handleNext}
            className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 font-mono"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}
