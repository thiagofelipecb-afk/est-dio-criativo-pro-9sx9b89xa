// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      analysis_reports: {
        Row: {
          analysis_json: Json
          created_at: string
          generation_id: string | null
          id: string
          target_id: string
          target_type: string
          workspace_id: string
        }
        Insert: {
          analysis_json?: Json
          created_at?: string
          generation_id?: string | null
          id?: string
          target_id: string
          target_type: string
          workspace_id: string
        }
        Update: {
          analysis_json?: Json
          created_at?: string
          generation_id?: string | null
          id?: string
          target_id?: string
          target_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_requirements: {
        Row: {
          asset_type: string
          created_at: string
          funnel_plan_id: string
          id: string
          rationale: string | null
          status: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          funnel_plan_id: string
          id?: string
          rationale?: string | null
          status?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          funnel_plan_id?: string
          id?: string
          rationale?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_requirements_funnel_plan_id_fkey"
            columns: ["funnel_plan_id"]
            isOneToOne: false
            referencedRelation: "funnel_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata_json: Json
          target: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata_json?: Json
          target: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata_json?: Json
          target?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_profile_versions: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          snapshot_json: Json
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          snapshot_json?: Json
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          snapshot_json?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "brand_profile_versions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_profiles: {
        Row: {
          active_version_id: string | null
          created_at: string
          id: string
          workspace_id: string
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          id?: string
          workspace_id: string
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      capcut_tracks: {
        Row: {
          artist: string
          audio_url: string
          bpm: number | null
          cover_url: string | null
          created_at: string
          duration_seconds: number | null
          genre: string | null
          has_auto_ducking: boolean | null
          id: string
          title: string
        }
        Insert: {
          artist?: string
          audio_url: string
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          has_auto_ducking?: boolean | null
          id: string
          title: string
        }
        Update: {
          artist?: string
          audio_url?: string
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          has_auto_ducking?: boolean | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      capture_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      captured_creatives: {
        Row: {
          author: string | null
          caption: string | null
          created_at: string
          hash: string | null
          id: string
          media_type: string
          source: string
          source_url: string | null
          transcript: string | null
          workspace_id: string
        }
        Insert: {
          author?: string | null
          caption?: string | null
          created_at?: string
          hash?: string | null
          id?: string
          media_type?: string
          source: string
          source_url?: string | null
          transcript?: string | null
          workspace_id: string
        }
        Update: {
          author?: string | null
          caption?: string | null
          created_at?: string
          hash?: string | null
          id?: string
          media_type?: string
          source?: string
          source_url?: string | null
          transcript?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captured_creatives_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          created_at: string
          done_at: string | null
          funnel_plan_id: string
          id: string
          priority: string
          title: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          funnel_plan_id: string
          id?: string
          priority?: string
          title: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          funnel_plan_id?: string
          id?: string
          priority?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_funnel_plan_id_fkey"
            columns: ["funnel_plan_id"]
            isOneToOne: false
            referencedRelation: "funnel_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clipper_clips: {
        Row: {
          applied_music: string | null
          applied_overlay: string | null
          applied_sfx: string | null
          created_at: string
          description: string
          duration_seconds: number
          end_time: number
          hashtags: string[] | null
          hook_summary: string | null
          id: string
          is_exported: boolean | null
          preview_url: string | null
          project_id: string
          start_time: number
          thumbnail_url: string | null
          title: string
          viral_score: number
          word_timestamps: Json | null
        }
        Insert: {
          applied_music?: string | null
          applied_overlay?: string | null
          applied_sfx?: string | null
          created_at?: string
          description?: string
          duration_seconds: number
          end_time: number
          hashtags?: string[] | null
          hook_summary?: string | null
          id?: string
          is_exported?: boolean | null
          preview_url?: string | null
          project_id: string
          start_time: number
          thumbnail_url?: string | null
          title: string
          viral_score?: number
          word_timestamps?: Json | null
        }
        Update: {
          applied_music?: string | null
          applied_overlay?: string | null
          applied_sfx?: string | null
          created_at?: string
          description?: string
          duration_seconds?: number
          end_time?: number
          hashtags?: string[] | null
          hook_summary?: string | null
          id?: string
          is_exported?: boolean | null
          preview_url?: string | null
          project_id?: string
          start_time?: number
          thumbnail_url?: string | null
          title?: string
          viral_score?: number
          word_timestamps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clipper_clips_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "clipper_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clipper_projects: {
        Row: {
          created_at: string
          duration_target: string
          id: string
          source_type: string
          source_url: string | null
          status: string
          title: string
          transcription: string | null
          updated_at: string
          user_id: string | null
          video_metadata: Json | null
        }
        Insert: {
          created_at?: string
          duration_target: string
          id?: string
          source_type: string
          source_url?: string | null
          status?: string
          title: string
          transcription?: string | null
          updated_at?: string
          user_id?: string | null
          video_metadata?: Json | null
        }
        Update: {
          created_at?: string
          duration_target?: string
          id?: string
          source_type?: string
          source_url?: string | null
          status?: string
          title?: string
          transcription?: string | null
          updated_at?: string
          user_id?: string | null
          video_metadata?: Json | null
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          block_type: string
          content_id: string
          created_at: string
          id: string
          position: number
          text: string
          updated_at: string
          version: number
        }
        Insert: {
          block_type: string
          content_id: string
          created_at?: string
          id?: string
          position?: number
          text?: string
          updated_at?: string
          version?: number
        }
        Update: {
          block_type?: string
          content_id?: string
          created_at?: string
          id?: string
          position?: number
          text?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          awareness: number | null
          brand_profile_version_id: string | null
          created_at: string
          cta: string | null
          funnel_stage: string | null
          id: string
          objective: string | null
          source_creative_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          awareness?: number | null
          brand_profile_version_id?: string | null
          created_at?: string
          cta?: string | null
          funnel_stage?: string | null
          id?: string
          objective?: string | null
          source_creative_id?: string | null
          status?: string
          title?: string
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          awareness?: number | null
          brand_profile_version_id?: string | null
          created_at?: string
          cta?: string | null
          funnel_stage?: string | null
          id?: string
          objective?: string | null
          source_creative_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_schedules: {
        Row: {
          channel: string
          content_id: string
          created_at: string
          id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          content_id: string
          created_at?: string
          id?: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          content_id?: string
          created_at?: string
          id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_schedules_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_catalog_items: {
        Row: {
          assets_json: Json
          created_at: string
          difficulty: string
          estimated_time: string
          id: string
          name: string
          requirements_json: Json
          stage_tags: string[]
          status: string
          ticket_tags: string[]
        }
        Insert: {
          assets_json?: Json
          created_at?: string
          difficulty?: string
          estimated_time?: string
          id?: string
          name: string
          requirements_json?: Json
          stage_tags?: string[]
          status?: string
          ticket_tags?: string[]
        }
        Update: {
          assets_json?: Json
          created_at?: string
          difficulty?: string
          estimated_time?: string
          id?: string
          name?: string
          requirements_json?: Json
          stage_tags?: string[]
          status?: string
          ticket_tags?: string[]
        }
        Relationships: []
      }
      funnel_diagnoses: {
        Row: {
          audience: string | null
          created_at: string
          id: string
          objective: string | null
          offer_id: string | null
          resources_json: Json
          updated_at: string
          validation: string | null
          workspace_id: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          id?: string
          objective?: string | null
          offer_id?: string | null
          resources_json?: Json
          updated_at?: string
          validation?: string | null
          workspace_id: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          id?: string
          objective?: string | null
          offer_id?: string | null
          resources_json?: Json
          updated_at?: string
          validation?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_diagnoses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_ecosystems: {
        Row: {
          created_at: string
          diagnosis_id: string
          id: string
          rationale: string | null
          status: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          diagnosis_id: string
          id?: string
          rationale?: string | null
          status?: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          diagnosis_id?: string
          id?: string
          rationale?: string | null
          status?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_ecosystems_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "funnel_diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_ecosystems_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_plans: {
        Row: {
          catalog_item_id: string
          created_at: string
          ecosystem_id: string
          id: string
          order: number
          plan_json: Json
          updated_at: string
        }
        Insert: {
          catalog_item_id: string
          created_at?: string
          ecosystem_id: string
          id?: string
          order?: number
          plan_json?: Json
          updated_at?: string
        }
        Update: {
          catalog_item_id?: string
          created_at?: string
          ecosystem_id?: string
          id?: string
          order?: number
          plan_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_plans_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "funnel_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_plans_ecosystem_id_fkey"
            columns: ["ecosystem_id"]
            isOneToOne: false
            referencedRelation: "funnel_ecosystems"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          client_request_id: string | null
          context_version: number | null
          created_at: string
          error: string | null
          id: string
          kind: string
          model: string
          prompt_version: string
          result_json: Json | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_request_id?: string | null
          context_version?: number | null
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          model?: string
          prompt_version?: string
          result_json?: Json | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_request_id?: string | null
          context_version?: number | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          model?: string
          prompt_version?: string
          result_json?: Json | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_answers: {
        Row: {
          guide_code: string
          id: string
          profile_id: string
          transcript: string
          updated_at: string
          word_count: number
        }
        Insert: {
          guide_code: string
          id?: string
          profile_id: string
          transcript?: string
          updated_at?: string
          word_count?: number
        }
        Update: {
          guide_code?: string
          id?: string
          profile_id?: string
          transcript?: string
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string
          id: string
          metadata_json: Json
          storage_path: string | null
          type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata_json?: Json
          storage_path?: string | null
          type: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata_json?: Json
          storage_path?: string | null
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_readings: {
        Row: {
          content_id: string
          created_at: string
          id: string
          measured_at: string
          metrics_json: Json
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          measured_at?: string
          metrics_json?: Json
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          measured_at?: string
          metrics_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "metric_readings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          guarantee: string | null
          id: string
          name: string
          price: number | null
          status: string
          term: string | null
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          guarantee?: string | null
          id?: string
          name: string
          price?: number | null
          status?: string
          term?: string | null
          type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          guarantee?: string | null
          id?: string
          name?: string
          price?: number | null
          status?: string
          term?: string | null
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      overlay_assets: {
        Row: {
          blend_mode: string
          category: string
          created_at: string
          id: string
          name: string
          preview_color: string | null
          thumbnail_url: string | null
          video_url: string
        }
        Insert: {
          blend_mode?: string
          category: string
          created_at?: string
          id: string
          name: string
          preview_color?: string | null
          thumbnail_url?: string | null
          video_url: string
        }
        Update: {
          blend_mode?: string
          category?: string
          created_at?: string
          id?: string
          name?: string
          preview_color?: string | null
          thumbnail_url?: string | null
          video_url?: string
        }
        Relationships: []
      }
      page_projects: {
        Row: {
          accent: string | null
          created_at: string
          id: string
          objective: string | null
          stage: string
          status: string
          type: string
          updated_at: string
          voice: string | null
          workspace_id: string
        }
        Insert: {
          accent?: string | null
          created_at?: string
          id?: string
          objective?: string | null
          stage?: string
          status?: string
          type: string
          updated_at?: string
          voice?: string | null
          workspace_id: string
        }
        Update: {
          accent?: string | null
          created_at?: string
          id?: string
          objective?: string | null
          stage?: string
          status?: string
          type?: string
          updated_at?: string
          voice?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      page_sections: {
        Row: {
          content_json: Json
          created_at: string
          id: string
          page_id: string
          position: number
          section_type: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          id?: string
          page_id: string
          position?: number
          section_type: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          id?: string
          page_id?: string
          position?: number
          section_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "page_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_captures: {
        Row: {
          captured_at: string
          handle: string
          id: string
          snapshot_json: Json
          workspace_id: string
        }
        Insert: {
          captured_at?: string
          handle: string
          id?: string
          snapshot_json?: Json
          workspace_id: string
        }
        Update: {
          captured_at?: string
          handle?: string
          id?: string
          snapshot_json?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_captures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          snapshot: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      research_answers: {
        Row: {
          field_key: string
          group_key: string
          id: string
          profile_id: string
          updated_at: string
          value: string
        }
        Insert: {
          field_key: string
          group_key: string
          id?: string
          profile_id: string
          updated_at?: string
          value?: string
        }
        Update: {
          field_key?: string
          group_key?: string
          id?: string
          profile_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_assist_requests: {
        Row: {
          context_json: Json
          created_at: string
          id: string
          input_mode: string
          result_json: Json | null
          situation: string
          stage: string
          workspace_id: string
        }
        Insert: {
          context_json?: Json
          created_at?: string
          id?: string
          input_mode?: string
          result_json?: Json | null
          situation?: string
          stage: string
          workspace_id: string
        }
        Update: {
          context_json?: Json
          created_at?: string
          id?: string
          input_mode?: string
          result_json?: Json | null
          situation?: string
          stage?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_assist_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sfx_assets: {
        Row: {
          audio_url: string
          category: string
          created_at: string
          duration_seconds: number | null
          icon_name: string | null
          id: string
          name: string
        }
        Insert: {
          audio_url: string
          category: string
          created_at?: string
          duration_seconds?: number | null
          icon_name?: string | null
          id: string
          name: string
        }
        Update: {
          audio_url?: string
          category?: string
          created_at?: string
          duration_seconds?: number | null
          icon_name?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          created_at: string
          id: string
          messages_json: Json
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages_json?: Json
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages_json?: Json
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_scripts: {
        Row: {
          created_at: string
          duration: string | null
          id: string
          inputs_json: Json
          method: string
          script_json: Json
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          duration?: string | null
          id?: string
          inputs_json?: Json
          method: string
          script_json?: Json
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          duration?: string | null
          id?: string
          inputs_json?: Json
          method?: string
          script_json?: Json
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_scripts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          locale: string
          name: string
          owner_id: string
          plan: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string
          name?: string
          owner_id: string
          plan?: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          name?: string
          owner_id?: string
          plan?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

