/**
 * Typed API client for the L3ARN backend.
 *
 * Provides type-safe wrappers around common API calls.
 * Designed to be used in both the web app and server-side contexts.
 */

import { v4 as uuidv4 } from 'uuid';

interface ApiClientConfig {
    baseUrl: string;
    getToken: () => Promise<string | null>;
}

export class L3arnApiClient {
    private baseUrl: string;
    private getToken: () => Promise<string | null>;

    constructor(config: ApiClientConfig) {
        this.baseUrl = config.baseUrl;
        this.getToken = config.getToken;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        headers: Record<string, string> = {},
    ): Promise<T> {
        const token = await this.getToken();
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Trace-Id': uuidv4(),
            ...headers,
        };

        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API ${method} ${path} failed (${response.status}): ${errorText}`);
        }

        return response.json() as Promise<T>;
    }

    // ── System ──────────────────────────────────────────────────

    async getHealth() {
        return this.request<{ status: string; service: string; version: string }>(
            'GET',
            '/health',
        );
    }

    async ping() {
        return this.request<{ message: string; version: string }>(
            'GET',
            '/api/v1/ping',
        );
    }

    // ── Auth & Profile ──────────────────────────────────────────

    async getMe() {
        return this.request<any>('GET', '/api/v1/me');
    }

    async getParentProfile() {
        return this.request<any>('GET', '/api/v1/parent/profile');
    }

    async saveParentProfile(data: any) {
        return this.request<any>('POST', '/api/v1/parent/profile', data);
    }

    // ── Students ────────────────────────────────────────────────

    async getStudents() {
        return this.request<any[]>('GET', '/api/v1/students');
    }

    async createStudent(data: any) {
        return this.request<any>('POST', '/api/v1/students', data);
    }

    async updateStudent(id: string, data: any) {
        return this.request<any>('PATCH', `/api/v1/students/${id}`, data);
    }

    async getLearningPrefs(studentId: string) {
        return this.request<any>('GET', `/api/v1/students/${studentId}/prefs/learning`);
    }

    async saveLearningPrefs(studentId: string, data: any) {
        return this.request<any>('POST', `/api/v1/students/${studentId}/prefs/learning`, data);
    }

    async getSchedulePrefs(studentId: string) {
        return this.request<any>('GET', `/api/v1/students/${studentId}/prefs/schedule`);
    }

    async saveSchedulePrefs(studentId: string, data: any) {
        return this.request<any>('POST', `/api/v1/students/${studentId}/prefs/schedule`, data);
    }

    // ── Companion ───────────────────────────────────────────────

    async getCompanionConfig(studentId: string) {
        return this.request<any>('GET', `/api/v1/companion/${studentId}/config`);
    }

    async saveCompanionConfig(studentId: string, data: any) {
        return this.request<any>('POST', `/api/v1/companion/${studentId}/config`, data);
    }

    // ── AI ──────────────────────────────────────────────────────

    async aiHelp(data: { field_type: string; user_text: string; constraints?: any }) {
        return this.request<any>('POST', '/api/v1/ai/help', data);
    }
}
