'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, ThumbsUp, Eye, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: string;
  title: string;
  content: string;
  authorEmail: string;
  tags: string;
  views: number;
  upvotes: number;
  isAnswered: boolean;
  isFeatured: boolean;
  createdAt: string;
  category: {
    name: string;
    color: string;
  };
  _count?: {
    answers: number;
  };
}

interface ForumQuestionsProps {
  categoryId?: string;
  limit?: number;
}

export function ForumQuestions({
  categoryId,
  limit = 10,
}: ForumQuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: limit.toString(),
          sort,
        });

        if (categoryId) {
          params.append('categoryId', categoryId);
        }

        const response = await fetch(
          `/api/forum/questions?${params.toString()}`
        );
        const data = await response.json();
        setQuestions(data.questions || []);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [categoryId, limit, sort]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/[0.02] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort controls */}
      <div className="flex items-center gap-3">
        <span className="text-[#7a7a7a] text-sm">Sort by:</span>
        {['recent', 'popular', 'unanswered'].map((option) => (
          <button
            key={option}
            onClick={() => setSort(option)}
            className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
              sort === option
                ? 'bg-[#c9a96e] text-[#050505]'
                : 'border border-white/[0.06] text-[#7a7a7a] hover:text-[#c9a96e]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((question) => (
          <Link
            key={question.id}
            href={`/forum/${question.id}`}
            className="group block bg-white/[0.02] border border-white/[0.06] hover:border-[#c9a96e]/30 rounded-lg p-4 transition-all duration-300"
          >
            <div className="flex gap-4">
              {/* Stats column */}
              <div className="flex flex-col items-center text-center py-1 gap-1 min-w-fit">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors ${
                    question.isAnswered
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-white/[0.05] text-[#9a9a9a]'
                  }`}
                >
                  {question._count?.answers || 0}
                </div>
                <span className="text-[10px] text-[#7a7a7a]">answers</span>
              </div>

              {/* Content column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  {question.isAnswered && (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  )}
                  <h3 className="text-[#f0eee9] font-medium group-hover:text-[#c9a96e] transition-colors line-clamp-2">
                    {question.title}
                  </h3>
                </div>

                <p className="text-[#9a9a9a] text-sm mb-3 line-clamp-1">
                  {question.content.substring(0, 100)}...
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-white/[0.03] border-white/[0.06]"
                  >
                    {question.category.name}
                  </Badge>

                  {question.tags
                    .split(',')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="bg-white/[0.02] border-white/[0.05] text-[#7a7a7a]"
                      >
                        {tag.trim()}
                      </Badge>
                    ))}

                  {question.tags.split(',').length > 2 && (
                    <span className="text-[#7a7a7a] text-xs">
                      +{question.tags.split(',').length - 2}
                    </span>
                  )}
                </div>
              </div>

              {/* Right stats */}
              <div className="flex flex-col gap-2 text-right text-xs text-[#7a7a7a]">
                <div className="flex items-center gap-1 justify-end">
                  <Eye className="w-3 h-3" />
                  <span>{question.views}</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{question.upvotes}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-[#7a7a7a] mx-auto mb-4 opacity-50" />
          <h3 className="text-[#f0eee9] font-serif text-lg mb-2">
            No questions yet
          </h3>
          <p className="text-[#7a7a7a]">
            Be the first to ask a question in this category
          </p>
        </div>
      )}
    </div>
  );
}
