import { Page } from '@playwright/test';

export const mockApi = async (page: Page) => {
    // Mock Authentication Endpoints - Critical: These must be set up BEFORE page navigation
    // to prevent AuthContext from making real API calls that would clear the token

    // Login endpoint
    await page.route('**/api/auth/login', async (route) => {
        console.log('Mocking login request');
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                access_token: 'mock_token_12345',
                token_type: 'bearer',
                user: {
                    id: 'user_123',
                    email: 'test@example.com',
                    name: 'Test User'
                }
            })
        });
    });

    // Signup endpoint
    await page.route('**/api/auth/signup', async (route) => {
        console.log('Mocking signup request');
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                access_token: 'mock_token_12345',
                token_type: 'bearer',
                user: {
                    id: 'user_123',
                    email: 'test@example.com',
                    name: 'Test User'
                }
            })
        });
    });

    // Auth check endpoint - CRITICAL for preventing token cleanup
    await page.route('**/api/auth/me', async (route) => {
        console.log('Mocking auth/me request');
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'user_123',
                email: 'test@example.com',
                name: 'Test User'
            })
        });
    });

    // Mock Meetings List
    await page.route('**/meetings', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                json: [
                    {
                        id: 'm_123',
                        title: 'Client X Weekly Sync',
                        date: '2023-10-27T10:00:00Z',
                        summaries: [{ short_summary: 'Meeting 1 Summary', detailed_summary: 'Detailed summary here.' }],
                        action_items: [{ id: 'ai_1', text: 'Follow up on email', done: false }],
                    },
                ],
            });
        } else if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 201,
                json: { id: 'm_new', title: 'New Meeting' },
            });
        } else {
            await route.continue();
        }
    });

    // Mock Single Meeting
    await page.route('**/meetings/m_123', async (route) => {
        await route.fulfill({
            status: 200,
            json: {
                id: 'm_123',
                title: 'Client X Weekly Sync',
                summaries: [{ short_summary: 'Meeting 1 Summary', detailed_summary: 'Detailed summary here.' }],
                action_items: [{ id: 'ai_1', text: 'Follow up on email', done: false }],
            },
        });
    });

    // Mock Voice Profile
    await page.route('**/voice-profile**', async (route) => {
        const url = route.request().url();

        if (url.includes('/enroll')) {
            // POST to /voice-profile/enroll
            await route.fulfill({
                status: 200,
                json: { id: 'vp_123', name: 'Test User', enrolled: true }
            });
        } else if (route.request().method() === 'GET') {
            await route.fulfill({ status: 404 });
        } else if (route.request().method() === 'POST') {
            await route.fulfill({ status: 201, json: { id: 'vp_123', name: 'Test User' } });
        } else if (route.request().method() === 'DELETE') {
            await route.fulfill({ status: 204 });
        } else {
            await route.continue();
        }
    });

    // Mock QA/Suggest Answer
    await page.route('**/qa/meeting', async (route) => {
        await route.fulfill({
            status: 200,
            json: {
                answer: 'We are on track to complete the core QA automation framework in the next two sprints.',
                extra_points: ['Mention current coverage.', 'Highlight risk areas.'],
            },
        });
    });

    // Mock Documents Upload
    // Mock Documents Upload (Legacy)
    await page.route('**/documents/upload/document', async (route) => {
        await route.fulfill({
            status: 200,
            json: { id: 'doc_1', name: 'test-doc.txt', uploaded: true },
        });
    });

    // Mock Knowledge Vault Documents
    await page.route('**/documents', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                json: [
                    { id: 'doc_1', name: 'Project Specs.pdf', type: 'pdf', created_at: new Date().toISOString() },
                    { id: 'doc_2', name: 'Meeting Notes.docx', type: 'docx', created_at: new Date().toISOString() }
                ]
            });
        } else if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 200,
                json: { id: 'doc_new', name: 'Uploaded File.pdf', type: 'pdf', created_at: new Date().toISOString() }
            });
        } else {
            await route.continue();
        }
    });

    // Mock Document Delete
    await page.route('**/documents/*', async (route) => {
        if (route.request().method() === 'DELETE') {
            await route.fulfill({ status: 200, json: { success: true } });
        } else {
            await route.continue();
        }
    });
    // Mock Interview Prepare
    await page.route('**/mock/prepare', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                company_overview: "Test Company Overview",
                role_expectations: "Test Role Expectations",
                potential_questions: ["Question 1", "Question 2"]
            })
        });
    });

    // Mock Interview Question
    await page.route('**/mock/question', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: "success",
                question: "Tell me about yourself.",
                number: 1,
                type: "behavioral"
            })
        });
    });

    // Mock Interview Feedback
    await page.route('**/mock/feedback', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: "success",
                feedback: {
                    content: "Good structure.",
                    delivery: "Clear voice."
                },
                score: 8
            })
        });
    });

    // Mock Doc Analyzer Upload
    await page.route('**/doc-analyzer/upload', async (route) => {
        await route.fulfill({
            status: 200,
            json: {
                id: 'doc_123',
                name: 'Test Document.pdf',
                file_type: 'pdf',
                file_size_bytes: 1024,
                analysis_status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        });
    });

    // Mock Doc Analyzer List
    await page.route('**/doc-analyzer/documents', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                json: [
                    {
                        id: 'doc_123',
                        name: 'Test Document.pdf',
                        file_type: 'pdf',
                        analysis_status: 'completed',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        analysis: null
                    }
                ]
            });
        }
    });

    // Mock Doc Analyzer Detail
    await page.route('**/doc-analyzer/documents/doc_123', async (route) => {
        await route.fulfill({
            status: 200,
            json: {
                id: 'doc_123',
                name: 'Test Document.pdf',
                file_type: 'pdf',
                analysis_status: 'completed',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                analysis: {
                    id: 'analysis_123',
                    document_id: 'doc_123',
                    model_version: 'gpt-4',
                    structured_summary: JSON.stringify({ purpose: 'Test Purpose' }),
                    risk_assessment: JSON.stringify({ risks: [] }),
                    gaps_and_questions: JSON.stringify({ gaps: [] }),
                    qa_report: JSON.stringify({
                        feature_summary: 'QA Feature Summary',
                        recommended_test_types: ['Functional', 'Security'],
                        high_risk_scenarios: [],
                        test_ideas: [],
                        open_questions: []
                    }),
                    overall_risk_level: 'Low',
                    analysis_duration_seconds: 10,
                    created_at: new Date().toISOString()
                }
            }
        });
    });
};
