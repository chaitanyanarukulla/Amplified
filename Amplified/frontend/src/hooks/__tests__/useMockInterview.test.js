import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMockInterview } from '../useMockInterview';

describe('useMockInterview', () => {
    it('should initialize with default state', () => {
        const sendMessage = vi.fn();
        const setIsListening = vi.fn();
        const setCurrentView = vi.fn();
        const transcript = [];

        const { result } = renderHook(() => useMockInterview({
            sendMessage,
            isListening: false,
            setIsListening,
            transcript,
            setCurrentView
        }));

        expect(result.current.isMockMode).toBe(false);
        expect(result.current.mockStage).toBe('setup');
    });

    it('should handle prepare mock interview', async () => {
        const sendMessage = vi.fn();
        const setIsListening = vi.fn();
        const setCurrentView = vi.fn();
        const transcript = [];

        // Mock fetch
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                company_overview: 'Test Company',
                role_expectations: 'Test Role',
                potential_questions: ['Q1', 'Q2']
            })
        }));

        const { result } = renderHook(() => useMockInterview({
            sendMessage,
            isListening: false,
            setIsListening,
            transcript,
            setCurrentView
        }));

        const setupData = {
            role: 'Engineer',
            resume: new File(['content'], 'resume.txt', { type: 'text/plain' }),
            jdUrl: 'http://example.com',
            voiceId: 'voice-1'
        };

        await act(async () => {
            await result.current.handlePrepareMockInterview(setupData);
        });

        await waitFor(() => {
            expect(result.current.mockBriefing).toBeTruthy();
        });

        expect(result.current.mockBriefing.company_overview).toBe('Test Company');
    });
});
