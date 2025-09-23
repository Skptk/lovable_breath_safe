import { Database } from '@/types/supabase';

type Schema = Database['public'];
type Tables = Schema['Tables'];

// Extended table definitions for custom tables
export interface ExtendedTables {
  profiles: {
    Row: { id: string; created_at?: string; [key: string]: any };
    Insert: { id: string; created_at?: string; [key: string]: any };
    Update: { id?: string; created_at?: string; [key: string]: any };
  };
  user_achievements: {
    Row: { id: string; user_id: string; created_at?: string; [key: string]: any };
    Insert: { id?: string; user_id: string; created_at?: string; [key: string]: any };
    Update: { id?: string; user_id?: string; created_at?: string; [key: string]: any };
  };
  user_streaks: {
    Row: { id: string; user_id: string; created_at?: string; [key: string]: any };
    Insert: { id?: string; user_id: string; created_at?: string; [key: string]: any };
    Update: { id?: string; user_id?: string; created_at?: string; [key: string]: any };
  };
  withdrawal_requests: {
    Row: { id: string; user_id: string; created_at?: string; [key: string]: any };
    Insert: { id?: string; user_id: string; created_at?: string; [key: string]: any };
    Update: { id?: string; user_id?: string; created_at?: string; [key: string]: any };
  };
}

export type TableName = keyof Tables;
export type ExtendedTableName = TableName | keyof Omit<ExtendedTables, keyof Tables>;

export type TableRow<T extends ExtendedTableName> = T extends keyof Tables 
  ? Tables[T]['Row'] 
  : T extends keyof ExtendedTables 
    ? ExtendedTables[T]['Row'] 
    : never;

export type TableInsert<T extends ExtendedTableName> = T extends keyof Tables 
  ? Tables[T]['Insert'] 
  : T extends keyof ExtendedTables 
    ? ExtendedTables[T]['Insert'] 
    : never;

export type TableUpdate<T extends ExtendedTableName> = T extends keyof Tables 
  ? Tables[T]['Update'] 
  : T extends keyof ExtendedTables 
    ? ExtendedTables[T]['Update'] 
    : never;
