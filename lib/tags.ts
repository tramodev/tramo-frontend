// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { authenticatedFetch } from './api';
import { API_BASE_URL } from './config';
import { parseResponse } from './http';

export interface TagSuggestion {
  name: string;
  official: boolean;
  usageCount: number;
}

export async function autocompleteTags(query: string, limit = 8): Promise<TagSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/tags/autocomplete?${params}`);
  return parseResponse<TagSuggestion[]>(response);
}
