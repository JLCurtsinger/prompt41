import { useState, useMemo, useRef, useEffect } from 'react';

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
  // Terminal 1: First sourcecode terminal (Zone 2) - Introductory, simple questions
  'terminal-zone2-main': [
    {
      id: 'js-variable',
      prompt: 'What is the value of x after this code runs?',
      code: 'let x = 5;\nx = x + 3;',
      options: ['5', '8', 'undefined'],
      correctIndex: 1, // 5 + 3 = 8
    },
    {
      id: 'js-string',
      prompt: 'What does this code output?',
      code: 'const name = "Zeeko";\nconsole.log(name.length);',
      options: ['4', '5', '6'],
      correctIndex: 1, // "Zeeko" has 5 characters
    },
    {
      id: 'js-if',
      prompt: 'What gets logged?',
      code: 'if (10 > 5) {\n  console.log("yes");\n} else {\n  console.log("no");\n}',
      options: ['yes', 'no', 'undefined'],
      correctIndex: 0,
    },
  ],
  // Terminal 2: Zone 3 terminal - Slightly more complex, introduces loops and arrays
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
      id: 'js-function',
      prompt: 'What does this function return?',
      code: 'function add(a, b) {\n  return a + b;\n}\nadd(3, 4);',
      options: ['3', '4', '7'],
      correctIndex: 2,
    },
  ],
  // Final Terminal: Most challenging questions
  'final_terminal': [
    {
      id: 'js-typeof',
      prompt: 'What does typeof null return in JavaScript?',
      code: 'console.log(typeof null);',
      options: ['null', 'object', 'undefined'],
      correctIndex: 1,
    },
    {
      id: 'js-scope',
      prompt: 'What gets logged?',
      code: 'let x = 1;\nif (true) {\n  let x = 2;\n}\nconsole.log(x);',
      options: ['1', '2', 'undefined'],
      correctIndex: 0,
    },
    {
      id: 'js-comparison',
      prompt: 'What is the result?',
      code: 'const a = "5";\nconst b = 5;\nconsole.log(a == b);',
      options: ['true', 'false', 'undefined'],
      correctIndex: 0,
    },
  ],
};

// Fallback questions (generic questions) if terminal not found
// These should be different from all terminal-specific questions
const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 'js-basic',
    prompt: 'What is the result of 2 * 3?',
    code: 'console.log(2 * 3);',
    options: ['5', '6', '9'],
    correctIndex: 1,
  },
  {
    id: 'js-concat',
    prompt: 'What does this code output?',
    code: 'const a = "Hello";\nconst b = "World";\nconsole.log(a + " " + b);',
    options: ['HelloWorld', 'Hello World', 'Hello + World'],
    correctIndex: 1,
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
  const hasCalledSuccessRef = useRef(false);

  // Reset success ref when question changes (terminalId changes)
  useEffect(() => {
    hasCalledSuccessRef.current = false;
  }, [question]);

  const handleAnswerClick = (index: number) => {
    // Guard: prevent multiple success calls
    if (hasCalledSuccessRef.current) {
      return;
    }
    
    setSelectedIndex(index);
    
    if (index === question.correctIndex) {
      hasCalledSuccessRef.current = true;
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

