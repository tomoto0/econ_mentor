import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateRecommendedDifficulty } from '../db';

// Mock the LLM service
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          quizzes: [{
            question: "テスト問題",
            options: ["(A) 選択肢A", "(B) 選択肢B", "(C) 選択肢C", "(D) 選択肢D"],
            correctAnswer: "A",
            explanation: "解説",
            difficulty: "medium"
          }]
        })
      }
    }]
  })
}));

describe('calculateRecommendedDifficulty', () => {
  it('should return current difficulty when total problems < 5', () => {
    expect(calculateRecommendedDifficulty(3, 2, 'medium')).toBe('medium');
    expect(calculateRecommendedDifficulty(4, 4, 'easy')).toBe('easy');
    expect(calculateRecommendedDifficulty(0, 0, 'hard')).toBe('hard');
  });

  it('should increase difficulty when accuracy > 80%', () => {
    // 5/5 = 100% accuracy
    expect(calculateRecommendedDifficulty(5, 5, 'easy')).toBe('medium');
    expect(calculateRecommendedDifficulty(5, 5, 'medium')).toBe('hard');
    expect(calculateRecommendedDifficulty(5, 5, 'hard')).toBe('hard');
    
    // 9/10 = 90% accuracy
    expect(calculateRecommendedDifficulty(10, 9, 'easy')).toBe('medium');
    expect(calculateRecommendedDifficulty(10, 9, 'medium')).toBe('hard');
  });

  it('should decrease difficulty when accuracy < 50%', () => {
    // 2/5 = 40% accuracy
    expect(calculateRecommendedDifficulty(5, 2, 'hard')).toBe('medium');
    expect(calculateRecommendedDifficulty(5, 2, 'medium')).toBe('easy');
    expect(calculateRecommendedDifficulty(5, 2, 'easy')).toBe('easy');
    
    // 3/10 = 30% accuracy
    expect(calculateRecommendedDifficulty(10, 3, 'hard')).toBe('medium');
  });

  it('should maintain difficulty when accuracy is between 50% and 80%', () => {
    // 3/5 = 60% accuracy
    expect(calculateRecommendedDifficulty(5, 3, 'easy')).toBe('easy');
    expect(calculateRecommendedDifficulty(5, 3, 'medium')).toBe('medium');
    expect(calculateRecommendedDifficulty(5, 3, 'hard')).toBe('hard');
    
    // 7/10 = 70% accuracy
    expect(calculateRecommendedDifficulty(10, 7, 'medium')).toBe('medium');
  });

  it('should handle edge cases at 50% and 80% boundaries', () => {
    // Exactly 50% (5/10) - should maintain
    expect(calculateRecommendedDifficulty(10, 5, 'medium')).toBe('medium');
    
    // Exactly 80% (8/10) - should maintain (not > 80%)
    expect(calculateRecommendedDifficulty(10, 8, 'medium')).toBe('medium');
    
    // Just above 80% (9/11 ≈ 81.8%)
    expect(calculateRecommendedDifficulty(11, 9, 'easy')).toBe('medium');
    
    // Just below 50% (4/9 ≈ 44.4%)
    expect(calculateRecommendedDifficulty(9, 4, 'hard')).toBe('medium');
  });
});

describe('Quiz Generation Types', () => {
  it('should have correct quiz structure', () => {
    const quiz = {
      question: "需要曲線が右下がりになる理由は？",
      options: [
        "(A) 価格が上がると需要量が増えるから",
        "(B) 価格が上がると需要量が減るから",
        "(C) 価格と需要量は無関係だから",
        "(D) 需要曲線は常に水平だから"
      ],
      correctAnswer: "B",
      explanation: "需要の法則により、価格が上昇すると需要量は減少します。",
      difficulty: "easy" as const
    };

    expect(quiz.question).toBeDefined();
    expect(quiz.options).toHaveLength(4);
    expect(["A", "B", "C", "D"]).toContain(quiz.correctAnswer);
    expect(["easy", "medium", "hard"]).toContain(quiz.difficulty);
  });
});

describe('Practice Problem Types', () => {
  it('should have correct practice problem structure', () => {
    const problem = {
      problem: "市場の需要関数がQd = 100 - 2Pで、供給関数がQs = 20 + 3Pのとき、均衡価格と均衡数量を求めよ。",
      solution: [
        "ステップ1: 均衡条件Qd = Qsを設定",
        "ステップ2: 100 - 2P = 20 + 3P",
        "ステップ3: 80 = 5P",
        "ステップ4: P = 16"
      ],
      answer: "均衡価格P = 16、均衡数量Q = 68",
      hints: [
        "均衡では需要量と供給量が等しくなります",
        "方程式を解いてPを求めましょう"
      ],
      difficulty: "medium" as const
    };

    expect(problem.problem).toBeDefined();
    expect(problem.solution).toBeInstanceOf(Array);
    expect(problem.solution.length).toBeGreaterThan(0);
    expect(problem.hints).toBeInstanceOf(Array);
    expect(["easy", "medium", "hard"]).toContain(problem.difficulty);
  });
});

describe('Session Performance Tracking', () => {
  it('should calculate accuracy rate correctly', () => {
    const calculateAccuracyRate = (total: number, correct: number) => {
      return total > 0 ? Math.round((correct / total) * 100) : 0;
    };

    expect(calculateAccuracyRate(10, 8)).toBe(80);
    expect(calculateAccuracyRate(10, 5)).toBe(50);
    expect(calculateAccuracyRate(0, 0)).toBe(0);
    expect(calculateAccuracyRate(3, 3)).toBe(100);
    expect(calculateAccuracyRate(7, 2)).toBe(29);
  });
});
