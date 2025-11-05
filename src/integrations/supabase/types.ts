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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          admin_level: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          is_approved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_level?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_level?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_material_publishers: {
        Row: {
          course_material_publisher_desc: string | null
          course_material_publisher_id: number
          course_material_publisher_name: string
        }
        Insert: {
          course_material_publisher_desc?: string | null
          course_material_publisher_id?: number
          course_material_publisher_name: string
        }
        Update: {
          course_material_publisher_desc?: string | null
          course_material_publisher_id?: number
          course_material_publisher_name?: string
        }
        Relationships: []
      }
      course_material_structure_only: {
        Row: {
          course_material_structure_only_id: number
          course_structure: Json[]
          raw_course_material_id: number
        }
        Insert: {
          course_material_structure_only_id?: number
          course_structure?: Json[]
          raw_course_material_id: number
        }
        Update: {
          course_material_structure_only_id?: number
          course_structure?: Json[]
          raw_course_material_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_material_structure_only_raw_course_material_id_fkey"
            columns: ["raw_course_material_id"]
            isOneToOne: true
            referencedRelation: "raw_course_materials"
            referencedColumns: ["raw_course_material_id"]
          },
        ]
      }
      course_materials: {
        Row: {
          course_material_desc: string
          course_material_id: number
          course_material_text_raw: Json | null
          course_structure: Json[] | null
          created_at: string
          generation_status_type_id: number | null
          raw_course_material_id: number
          updated_at: string | null
        }
        Insert: {
          course_material_desc: string
          course_material_id?: number
          course_material_text_raw?: Json | null
          course_structure?: Json[] | null
          created_at?: string
          generation_status_type_id?: number | null
          raw_course_material_id: number
          updated_at?: string | null
        }
        Update: {
          course_material_desc?: string
          course_material_id?: number
          course_material_text_raw?: Json | null
          course_structure?: Json[] | null
          created_at?: string
          generation_status_type_id?: number | null
          raw_course_material_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_generation_status_type_id_fkey"
            columns: ["generation_status_type_id"]
            isOneToOne: false
            referencedRelation: "generation_status_types"
            referencedColumns: ["generation_status_type_id"]
          },
          {
            foreignKeyName: "course_materials_raw_course_material_id_fkey"
            columns: ["raw_course_material_id"]
            isOneToOne: false
            referencedRelation: "raw_course_materials"
            referencedColumns: ["raw_course_material_id"]
          },
        ]
      }
      course_section: {
        Row: {
          course_material_id: number | null
          course_section_id: number
          section_common_content: string | null
          section_desc: string | null
          section_name: string
          section_objectives: string
          section_pages: number[] | null
          section_weeks: Json | null
        }
        Insert: {
          course_material_id?: number | null
          course_section_id?: never
          section_common_content?: string | null
          section_desc?: string | null
          section_name: string
          section_objectives: string
          section_pages?: number[] | null
          section_weeks?: Json | null
        }
        Update: {
          course_material_id?: number | null
          course_section_id?: never
          section_common_content?: string | null
          section_desc?: string | null
          section_name?: string
          section_objectives?: string
          section_pages?: number[] | null
          section_weeks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "course_section_course_material_id_fkey"
            columns: ["course_material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["course_material_id"]
          },
        ]
      }
      course_semesters: {
        Row: {
          course_semester_desc: string | null
          course_semester_id: number
          course_semester_name: string
        }
        Insert: {
          course_semester_desc?: string | null
          course_semester_id?: number
          course_semester_name: string
        }
        Update: {
          course_semester_desc?: string | null
          course_semester_id?: number
          course_semester_name?: string
        }
        Relationships: []
      }
      course_types: {
        Row: {
          course_type_desc: string | null
          course_type_id: number
          course_type_name: string
        }
        Insert: {
          course_type_desc?: string | null
          course_type_id?: number
          course_type_name: string
        }
        Update: {
          course_type_desc?: string | null
          course_type_id?: number
          course_type_name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          course_desc: string | null
          course_grade: string
          course_id: number
          course_material_publisher_id: number | null
          course_name: string
          course_semester_id: number
          course_type_id: number
        }
        Insert: {
          course_desc?: string | null
          course_grade: string
          course_id?: number
          course_material_publisher_id?: number | null
          course_name: string
          course_semester_id: number
          course_type_id: number
        }
        Update: {
          course_desc?: string | null
          course_grade?: string
          course_id?: number
          course_material_publisher_id?: number | null
          course_name?: string
          course_semester_id?: number
          course_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_course_material_publisher_id_fkey"
            columns: ["course_material_publisher_id"]
            isOneToOne: false
            referencedRelation: "course_material_publishers"
            referencedColumns: ["course_material_publisher_id"]
          },
          {
            foreignKeyName: "courses_course_semester_id_fkey"
            columns: ["course_semester_id"]
            isOneToOne: false
            referencedRelation: "course_semesters"
            referencedColumns: ["course_semester_id"]
          },
          {
            foreignKeyName: "courses_course_type_id_fkey"
            columns: ["course_type_id"]
            isOneToOne: false
            referencedRelation: "course_types"
            referencedColumns: ["course_type_id"]
          },
        ]
      }
      cowork_types: {
        Row: {
          cowork_type_desc: string
          cowork_type_id: number
          cowork_type_name: string
        }
        Insert: {
          cowork_type_desc: string
          cowork_type_id?: number
          cowork_type_name: string
        }
        Update: {
          cowork_type_desc?: string
          cowork_type_id?: number
          cowork_type_name?: string
        }
        Relationships: []
      }
      difficulties: {
        Row: {
          difficulty_desc: string | null
          difficulty_id: number
          difficulty_name: string
        }
        Insert: {
          difficulty_desc?: string | null
          difficulty_id?: number
          difficulty_name: string
        }
        Update: {
          difficulty_desc?: string | null
          difficulty_id?: number
          difficulty_name?: string
        }
        Relationships: []
      }
      format_selection_attrs: {
        Row: {
          class_mate_info: Json | null
          course_material_id: number | null
          course_material_scope: Json | null
          course_type_id: number
          created_at: string | null
          difficulty_id: number | null
          expected_duration_min: number | null
          format_selection_additional_message: string
          format_selection_attrs_id: number
          user_id: string
        }
        Insert: {
          class_mate_info?: Json | null
          course_material_id?: number | null
          course_material_scope?: Json | null
          course_type_id: number
          created_at?: string | null
          difficulty_id?: number | null
          expected_duration_min?: number | null
          format_selection_additional_message: string
          format_selection_attrs_id?: number
          user_id: string
        }
        Update: {
          class_mate_info?: Json | null
          course_material_id?: number | null
          course_material_scope?: Json | null
          course_type_id?: number
          created_at?: string | null
          difficulty_id?: number | null
          expected_duration_min?: number | null
          format_selection_additional_message?: string
          format_selection_attrs_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_format_selection_attrs_course_type"
            columns: ["course_type_id"]
            isOneToOne: false
            referencedRelation: "course_types"
            referencedColumns: ["course_type_id"]
          },
          {
            foreignKeyName: "fk_format_selection_attrs_difficulty"
            columns: ["difficulty_id"]
            isOneToOne: false
            referencedRelation: "difficulties"
            referencedColumns: ["difficulty_id"]
          },
          {
            foreignKeyName: "format_selection_attrs_course_material_id_fkey"
            columns: ["course_material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["course_material_id"]
          },
        ]
      }
      format_selection_attrs_cowork_type_map: {
        Row: {
          cowork_type_id: number
          format_selection_attrs_id: number
        }
        Insert: {
          cowork_type_id: number
          format_selection_attrs_id: number
        }
        Update: {
          cowork_type_id?: number
          format_selection_attrs_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "format_selection_attrs_cowork_type_map_attrs_id_fkey"
            columns: ["format_selection_attrs_id"]
            isOneToOne: false
            referencedRelation: "format_selection_attrs"
            referencedColumns: ["format_selection_attrs_id"]
          },
          {
            foreignKeyName: "format_selection_attrs_cowork_type_map_cowork_type_id_fkey"
            columns: ["cowork_type_id"]
            isOneToOne: false
            referencedRelation: "cowork_types"
            referencedColumns: ["cowork_type_id"]
          },
        ]
      }
      format_selection_attrs_teaching_style_map: {
        Row: {
          format_selection_attrs_id: number
          teaching_style_id: number
        }
        Insert: {
          format_selection_attrs_id: number
          teaching_style_id: number
        }
        Update: {
          format_selection_attrs_id?: number
          teaching_style_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fsatsm_attrs_fkey"
            columns: ["format_selection_attrs_id"]
            isOneToOne: false
            referencedRelation: "format_selection_attrs"
            referencedColumns: ["format_selection_attrs_id"]
          },
          {
            foreignKeyName: "fsatsm_style_fkey"
            columns: ["teaching_style_id"]
            isOneToOne: false
            referencedRelation: "teaching_styles"
            referencedColumns: ["teaching_style_id"]
          },
        ]
      }
      format_selection_request_messages: {
        Row: {
          created_at: string | null
          format_selection_attrs_id: number | null
          format_selection_request_message_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          format_selection_attrs_id?: number | null
          format_selection_request_message_id?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          format_selection_attrs_id?: number | null
          format_selection_request_message_id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "format_selection_request_messages_attrs_id_fkey"
            columns: ["format_selection_attrs_id"]
            isOneToOne: false
            referencedRelation: "format_selection_attrs"
            referencedColumns: ["format_selection_attrs_id"]
          },
        ]
      }
      format_selection_responses: {
        Row: {
          created_at: string
          format_selection_attrs_id: number | null
          format_selection_response_id: number
          recommended_formats: number[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format_selection_attrs_id?: number | null
          format_selection_response_id?: number
          recommended_formats?: number[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format_selection_attrs_id?: number | null
          format_selection_response_id?: number
          recommended_formats?: number[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "format_selection_responses_attrs_id_fkey"
            columns: ["format_selection_attrs_id"]
            isOneToOne: true
            referencedRelation: "format_selection_attrs"
            referencedColumns: ["format_selection_attrs_id"]
          },
        ]
      }
      formatting_info: {
        Row: {
          alignment: string | null
          background_color: string | null
          bold: boolean | null
          font_color: string | null
          font_name: string | null
          font_size: number | null
          italic: boolean | null
          line_spacing: number | null
          paragraph_spacing: number | null
          style_name: string | null
          underline: boolean | null
        }
        Insert: {
          alignment?: string | null
          background_color?: string | null
          bold?: boolean | null
          font_color?: string | null
          font_name?: string | null
          font_size?: number | null
          italic?: boolean | null
          line_spacing?: number | null
          paragraph_spacing?: number | null
          style_name?: string | null
          underline?: boolean | null
        }
        Update: {
          alignment?: string | null
          background_color?: string | null
          bold?: boolean | null
          font_color?: string | null
          font_name?: string | null
          font_size?: number | null
          italic?: boolean | null
          line_spacing?: number | null
          paragraph_spacing?: number | null
          style_name?: string | null
          underline?: boolean | null
        }
        Relationships: []
      }
      generation_attrs: {
        Row: {
          class_mate_info: Json | null
          course_material_id: number | null
          course_material_scope: Json | null
          course_type_id: number
          created_at: string
          difficulty_id: number | null
          expected_duration_min: number | null
          generation_additional_message: string | null
          generation_attrs_id: number
          output_path: string | null
          raw_generation_format_id: number | null
          user_id: string
        }
        Insert: {
          class_mate_info?: Json | null
          course_material_id?: number | null
          course_material_scope?: Json | null
          course_type_id: number
          created_at?: string
          difficulty_id?: number | null
          expected_duration_min?: number | null
          generation_additional_message?: string | null
          generation_attrs_id?: number
          output_path?: string | null
          raw_generation_format_id?: number | null
          user_id: string
        }
        Update: {
          class_mate_info?: Json | null
          course_material_id?: number | null
          course_material_scope?: Json | null
          course_type_id?: number
          created_at?: string
          difficulty_id?: number | null
          expected_duration_min?: number | null
          generation_additional_message?: string | null
          generation_attrs_id?: number
          output_path?: string | null
          raw_generation_format_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_generation_attrs_course_type"
            columns: ["course_type_id"]
            isOneToOne: false
            referencedRelation: "course_types"
            referencedColumns: ["course_type_id"]
          },
          {
            foreignKeyName: "fk_generation_attrs_difficulty"
            columns: ["difficulty_id"]
            isOneToOne: false
            referencedRelation: "difficulties"
            referencedColumns: ["difficulty_id"]
          },
          {
            foreignKeyName: "generation_attrs_course_material_id_fkey"
            columns: ["course_material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["course_material_id"]
          },
          {
            foreignKeyName: "generation_attrs_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
      generation_attrs_cowork_type_map: {
        Row: {
          cowork_type_id: number
          generation_attrs_id: number
        }
        Insert: {
          cowork_type_id: number
          generation_attrs_id: number
        }
        Update: {
          cowork_type_id?: number
          generation_attrs_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "generation_attrs_cowork_type_map_cowork_type_id_fkey"
            columns: ["cowork_type_id"]
            isOneToOne: false
            referencedRelation: "cowork_types"
            referencedColumns: ["cowork_type_id"]
          },
          {
            foreignKeyName: "generation_attrs_cowork_type_map_generation_attrs_id_fkey"
            columns: ["generation_attrs_id"]
            isOneToOne: false
            referencedRelation: "generation_attrs"
            referencedColumns: ["generation_attrs_id"]
          },
        ]
      }
      generation_attrs_teaching_style_map: {
        Row: {
          generation_attrs_id: number
          teaching_style_id: number
        }
        Insert: {
          generation_attrs_id: number
          teaching_style_id: number
        }
        Update: {
          generation_attrs_id?: number
          teaching_style_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "gatsm_genattrs_fkey"
            columns: ["generation_attrs_id"]
            isOneToOne: false
            referencedRelation: "generation_attrs"
            referencedColumns: ["generation_attrs_id"]
          },
          {
            foreignKeyName: "gatsm_style_fkey"
            columns: ["teaching_style_id"]
            isOneToOne: false
            referencedRelation: "teaching_styles"
            referencedColumns: ["teaching_style_id"]
          },
        ]
      }
      generation_format_type: {
        Row: {
          generation_format_type_desc: string
          generation_format_type_id: number
          generation_format_type_name: string
          generation_format_type_path: string
        }
        Insert: {
          generation_format_type_desc: string
          generation_format_type_id?: never
          generation_format_type_name: string
          generation_format_type_path: string
        }
        Update: {
          generation_format_type_desc?: string
          generation_format_type_id?: never
          generation_format_type_name?: string
          generation_format_type_path?: string
        }
        Relationships: []
      }
      generation_formats: {
        Row: {
          created_at: string
          generation_format_desc: string | null
          generation_format_id: number
          generation_format_sections: Json[] | null
          generation_format_text_raw: Json | null
          generation_status_type_id: number | null
          raw_generation_format_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          generation_format_desc?: string | null
          generation_format_id?: number
          generation_format_sections?: Json[] | null
          generation_format_text_raw?: Json | null
          generation_status_type_id?: number | null
          raw_generation_format_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          generation_format_desc?: string | null
          generation_format_id?: number
          generation_format_sections?: Json[] | null
          generation_format_text_raw?: Json | null
          generation_status_type_id?: number | null
          raw_generation_format_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_formats_generation_status_type_id_fkey"
            columns: ["generation_status_type_id"]
            isOneToOne: false
            referencedRelation: "generation_status_types"
            referencedColumns: ["generation_status_type_id"]
          },
          {
            foreignKeyName: "generation_formats_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
      generation_requests: {
        Row: {
          generation_attrs_id: number
          generation_request_id: number
          request_time: string
          user_id: string | null
        }
        Insert: {
          generation_attrs_id: number
          generation_request_id?: number
          request_time?: string
          user_id?: string | null
        }
        Update: {
          generation_attrs_id?: number
          generation_request_id?: number
          request_time?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_requests_generation_attrs_id_fkey"
            columns: ["generation_attrs_id"]
            isOneToOne: false
            referencedRelation: "generation_attrs"
            referencedColumns: ["generation_attrs_id"]
          },
        ]
      }
      generation_response_comments: {
        Row: {
          comment_id: number
          content: string
          created_at: string | null
          generation_response_id: number
          is_deleted: boolean
          parent_comment_id: number | null
          teacher_info_id: number
          updated_at: string | null
        }
        Insert: {
          comment_id?: number
          content: string
          created_at?: string | null
          generation_response_id: number
          is_deleted?: boolean
          parent_comment_id?: number | null
          teacher_info_id: number
          updated_at?: string | null
        }
        Update: {
          comment_id?: number
          content?: string
          created_at?: string | null
          generation_response_id?: number
          is_deleted?: boolean
          parent_comment_id?: number | null
          teacher_info_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_response_comments_generation_response_id_fkey"
            columns: ["generation_response_id"]
            isOneToOne: false
            referencedRelation: "generation_responses"
            referencedColumns: ["generation_response_id"]
          },
          {
            foreignKeyName: "generation_response_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "generation_response_comments"
            referencedColumns: ["comment_id"]
          },
          {
            foreignKeyName: "generation_response_comments_teacher_info_id_fkey"
            columns: ["teacher_info_id"]
            isOneToOne: false
            referencedRelation: "teacher_info"
            referencedColumns: ["teacher_info_id"]
          },
        ]
      }
      generation_response_download_events: {
        Row: {
          actor_ip: unknown | null
          actor_user_id: string | null
          created_at: string | null
          generation_response_id: number
          id: number
        }
        Insert: {
          actor_ip?: unknown | null
          actor_user_id?: string | null
          created_at?: string | null
          generation_response_id: number
          id?: number
        }
        Update: {
          actor_ip?: unknown | null
          actor_user_id?: string | null
          created_at?: string | null
          generation_response_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "generation_response_download_events_generation_response_id_fkey"
            columns: ["generation_response_id"]
            isOneToOne: false
            referencedRelation: "generation_responses"
            referencedColumns: ["generation_response_id"]
          },
        ]
      }
      generation_response_likes: {
        Row: {
          created_at: string | null
          generation_response_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          generation_response_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          generation_response_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_response_likes_generation_response_id_fkey"
            columns: ["generation_response_id"]
            isOneToOne: false
            referencedRelation: "generation_responses"
            referencedColumns: ["generation_response_id"]
          },
        ]
      }
      generation_responses: {
        Row: {
          can_share: boolean
          created_at: string
          generation_attrs_id: number | null
          generation_name: string | null
          generation_request_id: number | null
          generation_response_id: number
          generation_result_messages: string | null
          generation_status_type_id: number | null
          is_final: boolean
          likes_count: number
          output_path: string | null
          params_snapshot: Json
          root_response_id: number | null
          updated_at: string | null
          user_id: string | null
          version_no: number
        }
        Insert: {
          can_share?: boolean
          created_at?: string
          generation_attrs_id?: number | null
          generation_name?: string | null
          generation_request_id?: number | null
          generation_response_id?: number
          generation_result_messages?: string | null
          generation_status_type_id?: number | null
          is_final?: boolean
          likes_count?: number
          output_path?: string | null
          params_snapshot?: Json
          root_response_id?: number | null
          updated_at?: string | null
          user_id?: string | null
          version_no?: number
        }
        Update: {
          can_share?: boolean
          created_at?: string
          generation_attrs_id?: number | null
          generation_name?: string | null
          generation_request_id?: number | null
          generation_response_id?: number
          generation_result_messages?: string | null
          generation_status_type_id?: number | null
          is_final?: boolean
          likes_count?: number
          output_path?: string | null
          params_snapshot?: Json
          root_response_id?: number | null
          updated_at?: string | null
          user_id?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "generation_responses_generation_attrs_id_fkey"
            columns: ["generation_attrs_id"]
            isOneToOne: false
            referencedRelation: "generation_attrs"
            referencedColumns: ["generation_attrs_id"]
          },
          {
            foreignKeyName: "generation_responses_generation_request_id_fkey"
            columns: ["generation_request_id"]
            isOneToOne: false
            referencedRelation: "generation_requests"
            referencedColumns: ["generation_request_id"]
          },
          {
            foreignKeyName: "generation_responses_generation_status_type_id_fkey"
            columns: ["generation_status_type_id"]
            isOneToOne: false
            referencedRelation: "generation_status_types"
            referencedColumns: ["generation_status_type_id"]
          },
        ]
      }
      generation_section: {
        Row: {
          generation_section_content: string
          generation_section_desc: string
          generation_section_id: number | null
          style_info: Json | null
        }
        Insert: {
          generation_section_content: string
          generation_section_desc: string
          generation_section_id?: number | null
          style_info?: Json | null
        }
        Update: {
          generation_section_content?: string
          generation_section_desc?: string
          generation_section_id?: number | null
          style_info?: Json | null
        }
        Relationships: []
      }
      generation_status_types: {
        Row: {
          generation_status_type_desc: string | null
          generation_status_type_id: number
          generation_status_type_name: string | null
        }
        Insert: {
          generation_status_type_desc?: string | null
          generation_status_type_id?: number
          generation_status_type_name?: string | null
        }
        Update: {
          generation_status_type_desc?: string | null
          generation_status_type_id?: number
          generation_status_type_name?: string | null
        }
        Relationships: []
      }
      help_request_types: {
        Row: {
          help_request_type_desc: string
          help_request_type_id: number
          help_request_type_name: string
        }
        Insert: {
          help_request_type_desc?: string
          help_request_type_id?: number
          help_request_type_name?: string
        }
        Update: {
          help_request_type_desc?: string
          help_request_type_id?: number
          help_request_type_name?: string
        }
        Relationships: []
      }
      help_requests: {
        Row: {
          created_at: string
          help_request_content: string | null
          help_request_email: string | null
          help_request_file_path: string | null
          help_request_id: number
          help_request_name: string | null
          help_request_type_id: number
          is_checked: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          help_request_content?: string | null
          help_request_email?: string | null
          help_request_file_path?: string | null
          help_request_id?: number
          help_request_name?: string | null
          help_request_type_id?: number
          is_checked?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          help_request_content?: string | null
          help_request_email?: string | null
          help_request_file_path?: string | null
          help_request_id?: number
          help_request_name?: string | null
          help_request_type_id?: number
          is_checked?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_help_request_type_id_fkey"
            columns: ["help_request_type_id"]
            isOneToOne: false
            referencedRelation: "help_request_types"
            referencedColumns: ["help_request_type_id"]
          },
        ]
      }
      image_content_didactic_intents: {
        Row: {
          didactic_intent_id: number
          image_content_id: number
        }
        Insert: {
          didactic_intent_id: number
          image_content_id: number
        }
        Update: {
          didactic_intent_id?: number
          image_content_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "image_content_didactic_intents_didactic_intent_id_fkey"
            columns: ["didactic_intent_id"]
            isOneToOne: false
            referencedRelation: "image_didactic_intents"
            referencedColumns: ["didactic_intent_id"]
          },
          {
            foreignKeyName: "image_content_didactic_intents_image_content_id_fkey"
            columns: ["image_content_id"]
            isOneToOne: false
            referencedRelation: "image_contents"
            referencedColumns: ["image_content_id"]
          },
        ]
      }
      image_contents: {
        Row: {
          confidence: number | null
          content_semantics: string[] | null
          created_at: string
          evidence: string | null
          forbidden_elements: string[] | null
          image_content_id: number
          image_contents_category_id: number | null
          image_contents_role_id: number | null
          image_desc: string | null
          image_name: string
          image_path: string
          replacement_constraints: Json | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          content_semantics?: string[] | null
          created_at?: string
          evidence?: string | null
          forbidden_elements?: string[] | null
          image_content_id?: number
          image_contents_category_id?: number | null
          image_contents_role_id?: number | null
          image_desc?: string | null
          image_name: string
          image_path: string
          replacement_constraints?: Json | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          content_semantics?: string[] | null
          created_at?: string
          evidence?: string | null
          forbidden_elements?: string[] | null
          image_content_id?: number
          image_contents_category_id?: number | null
          image_contents_role_id?: number | null
          image_desc?: string | null
          image_name?: string
          image_path?: string
          replacement_constraints?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_contents_image_contents_category_id_fkey"
            columns: ["image_contents_category_id"]
            isOneToOne: false
            referencedRelation: "image_contents_categories"
            referencedColumns: ["image_contents_category_id"]
          },
          {
            foreignKeyName: "image_contents_image_contents_role_id_fkey"
            columns: ["image_contents_role_id"]
            isOneToOne: false
            referencedRelation: "image_contents_roles"
            referencedColumns: ["image_contents_role_id"]
          },
        ]
      }
      image_contents_categories: {
        Row: {
          category_desc: string | null
          category_name: string
          image_contents_category_id: number
        }
        Insert: {
          category_desc?: string | null
          category_name: string
          image_contents_category_id?: number
        }
        Update: {
          category_desc?: string | null
          category_name?: string
          image_contents_category_id?: number
        }
        Relationships: []
      }
      image_contents_roles: {
        Row: {
          image_contents_role_id: number
          role_desc: string | null
          role_key: string
          role_name: string
        }
        Insert: {
          image_contents_role_id?: number
          role_desc?: string | null
          role_key: string
          role_name: string
        }
        Update: {
          image_contents_role_id?: number
          role_desc?: string | null
          role_key?: string
          role_name?: string
        }
        Relationships: []
      }
      image_didactic_intents: {
        Row: {
          didactic_intent_id: number
          intent_desc: string | null
          intent_key: string
          intent_name: string
        }
        Insert: {
          didactic_intent_id?: number
          intent_desc?: string | null
          intent_key: string
          intent_name: string
        }
        Update: {
          didactic_intent_id?: number
          intent_desc?: string | null
          intent_key?: string
          intent_name?: string
        }
        Relationships: []
      }
      interaction_types: {
        Row: {
          interaction_type_desc: string | null
          interaction_type_id: number
          interaction_type_name: string
        }
        Insert: {
          interaction_type_desc?: string | null
          interaction_type_id?: number
          interaction_type_name: string
        }
        Update: {
          interaction_type_desc?: string | null
          interaction_type_id?: number
          interaction_type_name?: string
        }
        Relationships: []
      }
      payment_histories: {
        Row: {
          created_at: string | null
          etc: string | null
          payment_id: number
          payment_status_id: number | null
          plan_id: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          etc?: string | null
          payment_id?: number
          payment_status_id?: number | null
          plan_id?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          etc?: string | null
          payment_id?: number
          payment_status_id?: number | null
          plan_id?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_histories_payment_status_id_fkey"
            columns: ["payment_status_id"]
            isOneToOne: false
            referencedRelation: "payment_status"
            referencedColumns: ["payment_status_id"]
          },
          {
            foreignKeyName: "payment_histories_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      payment_status: {
        Row: {
          payment_status_desc: string | null
          payment_status_id: number
          payment_status_name: string | null
        }
        Insert: {
          payment_status_desc?: string | null
          payment_status_id?: never
          payment_status_name?: string | null
        }
        Update: {
          payment_status_desc?: string | null
          payment_status_id?: never
          payment_status_name?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          plan_desc: string
          plan_id: number
          plan_name: string
          weekly_credit: number
        }
        Insert: {
          plan_desc: string
          plan_id?: number
          plan_name: string
          weekly_credit: number
        }
        Update: {
          plan_desc?: string
          plan_id?: number
          plan_name?: string
          weekly_credit?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          grade: string | null
          id: string
          school: string | null
          subject: string | null
          updated_at: string
          user_id: string
          verification_document_url: string | null
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          grade?: string | null
          id?: string
          school?: string | null
          subject?: string | null
          updated_at?: string
          user_id: string
          verification_document_url?: string | null
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          grade?: string | null
          id?: string
          school?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string
          verification_document_url?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      raw_course_materials: {
        Row: {
          course_id: number
          course_material_desc: string
          course_material_name: string
          course_material_path: string
          created_at: string
          raw_course_material_id: number
          registered_course_structure: Json[] | null
        }
        Insert: {
          course_id: number
          course_material_desc: string
          course_material_name: string
          course_material_path: string
          created_at?: string
          raw_course_material_id?: number
          registered_course_structure?: Json[] | null
        }
        Update: {
          course_id?: number
          course_material_desc?: string
          course_material_name?: string
          course_material_path?: string
          created_at?: string
          raw_course_material_id?: number
          registered_course_structure?: Json[] | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      raw_generation_format_comments: {
        Row: {
          comment_id: number
          content: string
          created_at: string | null
          is_deleted: boolean
          parent_comment_id: number | null
          raw_generation_format_id: number
          teacher_info_id: number
          updated_at: string | null
        }
        Insert: {
          comment_id?: number
          content: string
          created_at?: string | null
          is_deleted?: boolean
          parent_comment_id?: number | null
          raw_generation_format_id: number
          teacher_info_id: number
          updated_at?: string | null
        }
        Update: {
          comment_id?: number
          content?: string
          created_at?: string | null
          is_deleted?: boolean
          parent_comment_id?: number | null
          raw_generation_format_id?: number
          teacher_info_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_generation_format_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_format_comments"
            referencedColumns: ["comment_id"]
          },
          {
            foreignKeyName: "raw_generation_format_comments_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
          {
            foreignKeyName: "raw_generation_format_comments_teacher_info_id_fkey"
            columns: ["teacher_info_id"]
            isOneToOne: false
            referencedRelation: "teacher_info"
            referencedColumns: ["teacher_info_id"]
          },
        ]
      }
      raw_generation_format_course_type_map: {
        Row: {
          course_type_id: number
          raw_generation_format_id: number
        }
        Insert: {
          course_type_id: number
          raw_generation_format_id: number
        }
        Update: {
          course_type_id?: number
          raw_generation_format_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_rgfctm_ct"
            columns: ["course_type_id"]
            isOneToOne: false
            referencedRelation: "course_types"
            referencedColumns: ["course_type_id"]
          },
          {
            foreignKeyName: "fk_rgfctm_rgf"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
      raw_generation_format_cowork_type_map: {
        Row: {
          cowork_type_id: number
          raw_generation_format_id: number
        }
        Insert: {
          cowork_type_id: number
          raw_generation_format_id: number
        }
        Update: {
          cowork_type_id?: number
          raw_generation_format_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "raw_generation_format_cowork_type_map_cowork_type_id_fkey"
            columns: ["cowork_type_id"]
            isOneToOne: false
            referencedRelation: "cowork_types"
            referencedColumns: ["cowork_type_id"]
          },
          {
            foreignKeyName: "raw_generation_format_cowork_type_map_raw_generation_format_id_"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
      raw_generation_format_download_events: {
        Row: {
          actor_ip: unknown | null
          actor_user_id: string | null
          created_at: string | null
          id: number
          raw_generation_format_id: number
        }
        Insert: {
          actor_ip?: unknown | null
          actor_user_id?: string | null
          created_at?: string | null
          id?: number
          raw_generation_format_id: number
        }
        Update: {
          actor_ip?: unknown | null
          actor_user_id?: string | null
          created_at?: string | null
          id?: number
          raw_generation_format_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "raw_generation_format_download_ev_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
      raw_generation_format_likes: {
        Row: {
          created_at: string | null
          raw_generation_format_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          raw_generation_format_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          raw_generation_format_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_generation_format_likes_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
      raw_generation_format_stats: {
        Row: {
          format_selection_count: number | null
          raw_generation_format_id: number | null
          raw_generation_format_stat_id: number
          updated_at: string
        }
        Insert: {
          format_selection_count?: number | null
          raw_generation_format_id?: number | null
          raw_generation_format_stat_id?: number
          updated_at?: string
        }
        Update: {
          format_selection_count?: number | null
          raw_generation_format_id?: number | null
          raw_generation_format_stat_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_generation_format_stats_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
      raw_generation_format_tag_map: {
        Row: {
          raw_generation_format_id: number
          tag_id: number
        }
        Insert: {
          raw_generation_format_id: number
          tag_id: number
        }
        Update: {
          raw_generation_format_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "raw_generation_format_tag_map_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
          {
            foreignKeyName: "raw_generation_format_tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["tag_id"]
          },
        ]
      }
      raw_generation_format_teaching_style_map: {
        Row: {
          raw_generation_format_id: number
          teaching_style_id: number
        }
        Insert: {
          raw_generation_format_id: number
          teaching_style_id: number
        }
        Update: {
          raw_generation_format_id?: number
          teaching_style_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "raw_generation_format_teaching_st_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
          {
            foreignKeyName: "rgfts_style_fkey"
            columns: ["teaching_style_id"]
            isOneToOne: false
            referencedRelation: "teaching_styles"
            referencedColumns: ["teaching_style_id"]
          },
        ]
      }
      raw_generation_formats: {
        Row: {
          can_share: boolean
          created_at: string
          file_path: string | null
          gallery_desc: string | null
          generation_format_desc: string | null
          generation_format_name: string
          generation_format_path: string
          likes_count: number
          raw_generation_format_id: number
          uploaded_user_id: string | null
        }
        Insert: {
          can_share?: boolean
          created_at?: string
          file_path?: string | null
          gallery_desc?: string | null
          generation_format_desc?: string | null
          generation_format_name: string
          generation_format_path: string
          likes_count?: number
          raw_generation_format_id?: number
          uploaded_user_id?: string | null
        }
        Update: {
          can_share?: boolean
          created_at?: string
          file_path?: string | null
          gallery_desc?: string | null
          generation_format_desc?: string | null
          generation_format_name?: string
          generation_format_path?: string
          likes_count?: number
          raw_generation_format_id?: number
          uploaded_user_id?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          school_address: string
          school_id: number
          school_name: string
          school_number: string | null
        }
        Insert: {
          school_address: string
          school_id?: number
          school_name: string
          school_number?: string | null
        }
        Update: {
          school_address?: string
          school_id?: number
          school_name?: string
          school_number?: string | null
        }
        Relationships: []
      }
      style_info: {
        Row: {
          bold: boolean | null
          font_name: string | null
          font_size: number | null
          formatting_info: Json | null
          italic: boolean | null
          paragraph_index: number | null
          underline: boolean | null
        }
        Insert: {
          bold?: boolean | null
          font_name?: string | null
          font_size?: number | null
          formatting_info?: Json | null
          italic?: boolean | null
          paragraph_index?: number | null
          underline?: boolean | null
        }
        Update: {
          bold?: boolean | null
          font_name?: string | null
          font_size?: number | null
          formatting_info?: Json | null
          italic?: boolean | null
          paragraph_index?: number | null
          underline?: boolean | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          tag_id: number
          tag_name: string
        }
        Insert: {
          created_at?: string | null
          tag_id?: number
          tag_name: string
        }
        Update: {
          created_at?: string | null
          tag_id?: number
          tag_name?: string
        }
        Relationships: []
      }
      teacher_course_type_course_material_publisher_map: {
        Row: {
          course_material_publisher_id: number
          course_type_id: number
          teacher_info_id: number
        }
        Insert: {
          course_material_publisher_id: number
          course_type_id: number
          teacher_info_id: number
        }
        Update: {
          course_material_publisher_id?: number
          course_type_id?: number
          teacher_info_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_course_type_course_material_publisher_map_course_type_i"
            columns: ["course_type_id"]
            isOneToOne: false
            referencedRelation: "course_types"
            referencedColumns: ["course_type_id"]
          },
          {
            foreignKeyName: "teacher_course_type_course_material_publisher_map_publisher_id_"
            columns: ["course_material_publisher_id"]
            isOneToOne: false
            referencedRelation: "course_material_publishers"
            referencedColumns: ["course_material_publisher_id"]
          },
          {
            foreignKeyName: "teacher_course_type_course_material_publisher_map_teacher_info_"
            columns: ["teacher_info_id"]
            isOneToOne: false
            referencedRelation: "teacher_info"
            referencedColumns: ["teacher_info_id"]
          },
        ]
      }
      teacher_info: {
        Row: {
          class_info: Json | null
          homepage_url: string | null
          nickname: string | null
          personal_photo_path: string | null
          school_id: number
          self_introduction: string | null
          teacher_info_id: number
          teacher_verification_file_path: string | null
          teacher_verified: boolean
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          class_info?: Json | null
          homepage_url?: string | null
          nickname?: string | null
          personal_photo_path?: string | null
          school_id: number
          self_introduction?: string | null
          teacher_info_id?: number
          teacher_verification_file_path?: string | null
          teacher_verified?: boolean
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          class_info?: Json | null
          homepage_url?: string | null
          nickname?: string | null
          personal_photo_path?: string | null
          school_id?: number
          self_introduction?: string | null
          teacher_info_id?: number
          teacher_verification_file_path?: string | null
          teacher_verified?: boolean
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_info_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["school_id"]
          },
        ]
      }
      teacher_teaching_style_map: {
        Row: {
          teacher_info_id: number
          teaching_style_id: number
        }
        Insert: {
          teacher_info_id: number
          teaching_style_id: number
        }
        Update: {
          teacher_info_id?: number
          teaching_style_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ttsm_style_fkey"
            columns: ["teaching_style_id"]
            isOneToOne: false
            referencedRelation: "teaching_styles"
            referencedColumns: ["teaching_style_id"]
          },
          {
            foreignKeyName: "ttsm_teacher_fkey"
            columns: ["teacher_info_id"]
            isOneToOne: false
            referencedRelation: "teacher_info"
            referencedColumns: ["teacher_info_id"]
          },
        ]
      }
      teaching_styles: {
        Row: {
          open_status: boolean | null
          teaching_style_desc: string
          teaching_style_id: number
          teaching_style_name: string
        }
        Insert: {
          open_status?: boolean | null
          teaching_style_desc: string
          teaching_style_id?: number
          teaching_style_name: string
        }
        Update: {
          open_status?: boolean | null
          teaching_style_desc?: string
          teaching_style_id?: number
          teaching_style_name?: string
        }
        Relationships: []
      }
      user_access_logs: {
        Row: {
          access_reason: string | null
          access_timestamp: string | null
          accessed_user_id: number | null
          accessor_user_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          access_reason?: string | null
          access_timestamp?: string | null
          accessed_user_id?: number | null
          accessor_user_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          access_reason?: string | null
          access_timestamp?: string | null
          accessed_user_id?: number | null
          accessor_user_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      user_material_interactions: {
        Row: {
          created_at: string | null
          interaction_id: number
          interaction_type_id: number
          raw_generation_format_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          interaction_id?: number
          interaction_type_id: number
          raw_generation_format_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          interaction_id?: number
          interaction_type_id?: number
          raw_generation_format_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_umi_interaction_type"
            columns: ["interaction_type_id"]
            isOneToOne: false
            referencedRelation: "interaction_types"
            referencedColumns: ["interaction_type_id"]
          },
          {
            foreignKeyName: "fk_umi_raw_format"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
      user_plan_status: {
        Row: {
          credit_left: number | null
          plan_id: number
          user_id: string | null
          user_plan_status_id: number
        }
        Insert: {
          credit_left?: number | null
          plan_id: number
          user_id?: string | null
          user_plan_status_id?: number
        }
        Update: {
          credit_left?: number | null
          plan_id?: number
          user_id?: string | null
          user_plan_status_id?: number
        }
        Relationships: []
      }
      video_recommendations: {
        Row: {
          created_at: string
          generation_response_id: number
          video_desc: string | null
          video_name: string
          video_recommendation_id: number
          video_url: string
        }
        Insert: {
          created_at?: string
          generation_response_id: number
          video_desc?: string | null
          video_name: string
          video_recommendation_id?: number
          video_url: string
        }
        Update: {
          created_at?: string
          generation_response_id?: number
          video_desc?: string | null
          video_name?: string
          video_recommendation_id?: number
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vr_generation_response"
            columns: ["generation_response_id"]
            isOneToOne: false
            referencedRelation: "generation_responses"
            referencedColumns: ["generation_response_id"]
          },
        ]
      }
    }
    Views: {
      v_generation_response_downloads: {
        Row: {
          downloads_count: number | null
          generation_response_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_response_download_events_generation_response_id_fkey"
            columns: ["generation_response_id"]
            isOneToOne: false
            referencedRelation: "generation_responses"
            referencedColumns: ["generation_response_id"]
          },
        ]
      }
      v_raw_generation_format_downloads: {
        Row: {
          downloads_count: number | null
          raw_generation_format_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_generation_format_download_ev_raw_generation_format_id_fkey"
            columns: ["raw_generation_format_id"]
            isOneToOne: false
            referencedRelation: "raw_generation_formats"
            referencedColumns: ["raw_generation_format_id"]
          },
        ]
      }
    }
    Functions: {
      check_help_request_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_help_request_types: {
        Args: Record<PropertyKey, never>
        Returns: {
          help_request_type_id: number
          help_request_type_name: string
        }[]
      }
      insert_help_request: {
        Args: {
          p_help_request_content: string
          p_help_request_email: string
          p_help_request_file_path?: string
          p_help_request_name: string
          p_help_request_type_id: number
        }
        Returns: number
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_approved_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_auth_users: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      sync_association_table: {
        Args: {
          p_child_column: string
          p_child_ids: number[]
          p_parent_column: string
          p_parent_id: number
          p_table_name: string
        }
        Returns: undefined
      }
      sync_teacher_teaching_styles: {
        Args: { p_teacher_info_id: number; p_teaching_style_ids: number[] }
        Returns: undefined
      }
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
