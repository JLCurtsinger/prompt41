import { useState, useMemo } from 'react';

interface CodeChallengeMiniGameProps {
  onSuccess: () => void;
  terminalId?: string | null; // Terminal ID to look up questions
}

interface Question {
  id: string;
  prompt: string;
  code: string;
  options: string[];
  correctIndex: number;
}

// Question bank keyed by terminal ID
const CODE_QUESTIONS_BY_TERMINAL: Record<string, Question[]> = {
  'terminal-zone3': [
    {
      id: 'js-loop',
      prompt: 'What gets logged to the console?',
      code: 'let sum = 0;\nfor (let i = 0; i < 3; i++) {\n  sum += i;\n}\nconsole.log(sum);',
      options: ['0', '3', '6'],
      correctIndex: 1, // 0 + 1 + 2 = 3
    },
    {
      id: 'js-array',
      prompt: 'What is the value of arr[1]?',
      code: 'const arr = [10, 20, 30];\narr.push(40);\nconsole.log(arr[1]);',
      options: ['10', '20', '40'],
      correctIndex: 1, // arr[1] is 20
    },
    {
      id: 'js-const',
      prompt: 'What keyword declares a constant in JavaScript?',
      code: 'const value = 42;',
      options: ['var', 'let', 'const'],
      correctIndex: 2,
    },
  ],
  'terminal-zone4': [
    {
      id: 'js-boolean',
      prompt: 'What is the boolean value for "not true" in JavaScript?',
      code: 'const result = !true;',
      options: ['true', 'false', 'undefined'],
      correctIndex: 1,
    },
    {
      id: 'js-map',
      prompt: 'Fill in the blank: const result = [1,2,3]._____()',
      code: 'const result = [1,2,3].map(x => x * 2);',
      options: ['filter', 'map', 'reduce'],
      correctIndex: 1,
    },
    {
      id: 'js-output',
      prompt: 'What is the output of 2 + 2 in JavaScript?',
      code: 'console.log(2 + 2);',
      options: ['2', '4', '22'],
      correctIndex: 1,
    },
  ],
  'final_terminal': [
    {
      id: 'js-typeof',
      prompt: 'What does typeof null return in JavaScript?',
      code: 'console.log(typeof null);',
      options: ['null', 'object', 'undefined'],
      correctIndex: 1,
    },
    {
      id: 'js-length',
      prompt: 'What is the length of this array?',
      code: 'const arr = [1, 2, 3];\nconsole.log(arr.length);',
      options: ['2', '3', '4'],
      correctIndex: 1,
    },
  ],
};

// Fallback questions (original questions) if terminal not found
const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 'js-loop',
    prompt: 'What gets logged to the console?',
    code: 'let sum = 0;\nfor (let i = 0; i < 3; i++) {\n  sum += i;\n}\nconsole.log(sum);',
    options: ['0', '3', '6'],
    correctIndex: 1, // 0 + 1 + 2 = 3
  },
  {
    id: 'js-array',
    prompt: 'What is the value of arr[1]?',
    code: 'const arr = [10, 20, 30];\narr.push(40);\nconsole.log(arr[1]);',
    options: ['10', '20', '40'],
    correctIndex: 1, // arr[1] is 20
  },
];

export function CodeChallengeMiniGame({ onSuccess, terminalId }: CodeChallengeMiniGameProps) {
  // Select a random question from the terminal's question bank, or fallback
  const question = useMemo(() => {
    const questions = terminalId && CODE_QUESTIONS_BY_TERMINAL[terminalId]
      ? CODE_QUESTIONS_BY_TERMINAL[terminalId]
      : FALLBACK_QUESTIONS;
    return questions[Math.floor(Math.random() * questions.length)];
  }, [terminalId]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showError, setShowError] = useState(false);

  const handleAnswerClick = (index: number) => {
    setSelectedIndex(index);
    
    if (index === question.correctIndex) {
      onSuccess();
    } else {
      // Show error and allow retry (don't call onFailure to avoid decrementing attempts)
      setShowError(true);
      // Clear error after 1.5 seconds and allow retry
      setTimeout(() => {
        setShowError(false);
        setSelectedIndex(null);
      }, 1500);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        width: '100%',
        maxWidth: '500px',
      }}
    >
      {/* Challenge label */}
      <div style={{ fontSize: '18px', color: '#00ff00', textTransform: 'uppercase' }}>
        // CODE ANALYSIS
      </div>

      {/* Prompt */}
      <div style={{ fontSize: '16px', color: '#00ff00', textAlign: 'center' }}>
        {question.prompt}
      </div>

      {/* Code block */}
      <div
        style={{
          width: '100%',
          backgroundColor: '#001100',
          border: '2px solid #00ff00',
          borderRadius: '4px',
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#00ff00',
          whiteSpace: 'pre',
          overflowX: 'auto',
        }}
      >
        {question.code}
      </div>

      {/* Answer options */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
        }}
      >
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = index === question.correctIndex;
          const isWrong = isSelected && !isCorrect;
          
          return (
            <button
              key={index}
              onClick={() => handleAnswerClick(index)}
              disabled={selectedIndex !== null && selectedIndex !== index}
              style={{
                padding: '12px 24px',
                backgroundColor: isWrong ? '#330000' : isSelected && isCorrect ? '#003300' : '#001100',
                color: isWrong ? '#ff4444' : '#00ff00',
                border: `2px solid ${isWrong ? '#ff4444' : '#00ff00'}`,
                fontFamily: 'monospace',
                fontSize: '16px',
                cursor: selectedIndex !== null && selectedIndex !== index ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: selectedIndex !== null && selectedIndex !== index ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (selectedIndex === null || selectedIndex === index) {
                  e.currentTarget.style.backgroundColor = '#003300';
                  e.currentTarget.style.boxShadow = '0 0 10px #00ff00';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedIndex === null || selectedIndex === index) {
                  e.currentTarget.style.backgroundColor = isWrong ? '#330000' : isSelected && isCorrect ? '#003300' : '#001100';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {showError && (
        <div style={{ fontSize: '14px', color: '#ff4444', textAlign: 'center' }}>
          INCORRECT // TRY AGAIN
        </div>
      )}
    </div>
  );
}

