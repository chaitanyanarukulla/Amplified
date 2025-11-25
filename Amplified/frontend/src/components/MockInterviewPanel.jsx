import React, { useState, useEffect } from 'react';
import CoachingWidget from './CoachingWidget';

const MockInterviewPanel = ({
    isActive,
    currentQuestion,
    questionNumber,
    totalQuestions = 7,
    feedback,
    isListening,
    onNext,
    onEnd,
    coachingMetrics
}) => {
    if (!isActive) return null;

    return (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-center justify-center p-8">
            <div className="max-w-3xl w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-8 shadow-2xl relative">
                {/* Live Coaching Widget (Absolute positioned within panel or fixed) */}
                {isListening && coachingMetrics && (
                    <div className="absolute -right-56 top-0">
                        <CoachingWidget wpm={coachingMetrics.wpm} fillerCount={coachingMetrics.fillerCount} />
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🎭</span>
                        <h2 className="text-2xl font-bold text-slate-100">Mock Interview</h2>
                    </div>
                    <button
                        onClick={onEnd}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                        <span>Question {questionNumber} of {totalQuestions}</span>
                        <span>{Math.round((questionNumber / totalQuestions) * 100)}% Complete</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Current Question */}
                {currentQuestion && (
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 mb-6">
                        <p className="text-sm text-slate-400 mb-2">Interviewer asks:</p>
                        <p className="text-lg text-slate-100 leading-relaxed">{currentQuestion}</p>
                    </div>
                )}

                {/* Listening Indicator */}
                {isListening && (
                    <div className="flex items-center justify-center gap-3 py-6 mb-6">
                        <div className="flex gap-1">
                            <div className="w-2 h-8 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-8 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-8 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-slate-300">Listening to your answer...</span>
                    </div>
                )}

                {/* Feedback */}
                {feedback && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-6">
                        <p className="text-sm text-green-400 mb-2 font-semibold">💡 Feedback:</p>
                        {typeof feedback === 'string' ? (
                            <p className="text-slate-200 leading-relaxed">{feedback}</p>
                        ) : (
                            <div className="space-y-4">
                                {/* Handle nested feedback structure from backend */}
                                {feedback.feedback ? (
                                    <>
                                        <div>
                                            <h4 className="text-white font-medium mb-1">Content</h4>
                                            <p className="text-slate-300 text-sm">{feedback.feedback.content}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium mb-1">Delivery</h4>
                                            <p className="text-slate-300 text-sm">{feedback.feedback.delivery}</p>
                                        </div>
                                        {feedback.score !== undefined && (
                                            <div>
                                                <h4 className="text-white font-medium mb-1">Score</h4>
                                                <p className="text-slate-300 text-sm">{feedback.score}/10</p>
                                            </div>
                                        )}
                                        {feedback.feedback.suggested_answer && (
                                            <div className="pt-4 border-t border-slate-700">
                                                <h4 className="text-blue-400 font-medium mb-2">💡 Suggested Answer</h4>
                                                <p className="text-slate-300 text-sm italic bg-slate-800/50 p-3 rounded">
                                                    {feedback.feedback.suggested_answer}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <h4 className="text-white font-medium mb-1">Content</h4>
                                            <p className="text-slate-300 text-sm">{feedback.content}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium mb-1">Delivery</h4>
                                            <p className="text-slate-300 text-sm">{feedback.delivery}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 justify-end">
                    {feedback && questionNumber < totalQuestions && (
                        <button
                            onClick={onNext}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Next Question →
                        </button>
                    )}
                    {feedback && questionNumber >= totalQuestions && (
                        <button
                            onClick={onEnd}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            ✓ Complete Interview
                        </button>
                    )}
                </div>

                {/* Instructions */}
                {!isListening && !feedback && (
                    <div className="text-center text-slate-400 text-sm">
                        <p>🎤 Listen to the question, then speak your answer</p>
                        <p className="mt-1">The AI will provide feedback when you finish</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MockInterviewPanel;
