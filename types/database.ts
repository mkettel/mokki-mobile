export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Feature identifiers for house customization
export type FeatureId =
  | "calendar"
  | "weather"
  | "broll"
  | "bulletin"
  | "expenses"
  | "members"
  | "account"
  | "chat";

// Feature configuration per house
export type FeatureConfig = {
  enabled: boolean;
  label: string;
};

// Background pattern options for house theming
export type BackgroundPattern =
  | "mountains"
  | "waves"
  | "palm"
  | "cityscape"
  | "minimal"
  | "none";

// Theme configuration per house
export type HouseTheme = {
  accentColor?: string; // Hex color for geometric background and accents
  backgroundColor?: string; // Optional background color override
  backgroundPattern?: BackgroundPattern; // Background pattern style
};

export type HouseSettings = {
  wifi_password?: string;
  address?: string;
  rules?: string[];
  local_tips?: string;
  emergency_contacts?: { name: string; phone: string }[];
  // Feature configuration - allows enabling/disabling features and custom labels
  features?: Partial<Record<FeatureId, Partial<FeatureConfig>>>;
  // Theme configuration - allows customizing colors and backgrounds
  theme?: HouseTheme;
  // Trip timer - countdown/day counter displayed on home screen
  tripTimer?: {
    enabled: boolean;
    startDate?: string; // ISO date YYYY-MM-DD
    endDate?: string; // ISO date YYYY-MM-DD (optional)
  };
  // Guest nightly rate - fee per guest per night (defaults to 50)
  guestNightlyRate?: number;
  // Guest fee recipient - user ID who receives guest fee payments (defaults to first admin)
  guestFeeRecipient?: string;
  // Bed sign-up feature - enables weekly bed/room sign-up for the house
  bedSignupEnabled?: boolean;
  // Auto-schedule bed sign-up windows (Mon/Tue random time for following weekend)
  autoScheduleWindows?: boolean;
};

export type MemberRole = "admin" | "member";
export type InviteStatus = "pending" | "accepted";
export type ExpenseCategory =
  | "groceries"
  | "utilities"
  | "supplies"
  | "other"
  | "guest_fees"
  | "rent"
  | "entertainment"
  | "transportation";
export type MessageType = "text" | "system";
export type RiderType = "skier" | "snowboarder" | "both";
export type BulletinCategory = "wifi" | "house_rules" | "emergency" | "local_tips";
export type BulletinStyle = "sticky" | "paper" | "sticker" | "keychain";
export type MediaType = "image" | "video";
export type RoomType = "bedroom" | "bunk_room";
export type BedType = "king" | "queen" | "full" | "twin";
export type SignupWindowStatus = "scheduled" | "open" | "closed";

// Webcam configuration for resorts
export type WebcamConfig = {
  name: string;
  url: string;
  type: "image" | "embed";
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          rider_type: RiderType | null;
          tagline: string | null;
          venmo_handle: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          rider_type?: RiderType | null;
          tagline?: string | null;
          venmo_handle?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          rider_type?: RiderType | null;
          tagline?: string | null;
          venmo_handle?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      houses: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          settings: Json;
          resort_id: string | null;
          favorite_resort_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          settings?: Json;
          resort_id?: string | null;
          favorite_resort_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          address?: string | null;
          settings?: Json;
          resort_id?: string | null;
          favorite_resort_ids?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "houses_resort_id_fkey";
            columns: ["resort_id"];
            isOneToOne: false;
            referencedRelation: "resorts";
            referencedColumns: ["id"];
          }
        ];
      };
      resorts: {
        Row: {
          id: string;
          name: string;
          slug: string;
          latitude: number;
          longitude: number;
          elevation_base: number | null;
          elevation_summit: number | null;
          timezone: string;
          website_url: string | null;
          webcam_urls: WebcamConfig[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          latitude: number;
          longitude: number;
          elevation_base?: number | null;
          elevation_summit?: number | null;
          timezone?: string;
          website_url?: string | null;
          webcam_urls?: WebcamConfig[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          latitude?: number;
          longitude?: number;
          elevation_base?: number | null;
          elevation_summit?: number | null;
          timezone?: string;
          website_url?: string | null;
          webcam_urls?: WebcamConfig[];
          updated_at?: string;
        };
        Relationships: [];
      };
      house_members: {
        Row: {
          id: string;
          house_id: string;
          user_id: string | null;
          role: MemberRole;
          invite_status: InviteStatus;
          invited_email: string | null;
          invited_at: string;
          joined_at: string | null;
          is_archived: boolean;
        };
        Insert: {
          id?: string;
          house_id: string;
          user_id?: string | null;
          role?: MemberRole;
          invite_status?: InviteStatus;
          invited_email?: string | null;
          invited_at?: string;
          joined_at?: string | null;
          is_archived?: boolean;
        };
        Update: {
          role?: MemberRole;
          invite_status?: InviteStatus;
          user_id?: string | null;
          joined_at?: string | null;
          is_archived?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "house_members_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "house_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      stays: {
        Row: {
          id: string;
          house_id: string;
          user_id: string;
          check_in: string;
          check_out: string;
          notes: string | null;
          guest_count: number;
          linked_expense_id: string | null;
          bed_signup_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          user_id: string;
          check_in: string;
          check_out: string;
          notes?: string | null;
          guest_count?: number;
          linked_expense_id?: string | null;
          bed_signup_id?: string | null;
          created_at?: string;
        };
        Update: {
          check_in?: string;
          check_out?: string;
          notes?: string | null;
          guest_count?: number;
          linked_expense_id?: string | null;
          bed_signup_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stays_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stays_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stays_bed_signup_id_fkey";
            columns: ["bed_signup_id"];
            isOneToOne: false;
            referencedRelation: "bed_signups";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: {
          id: string;
          house_id: string;
          paid_by: string;
          created_by: string | null;
          title: string | null;
          amount: number;
          description: string;
          category: ExpenseCategory;
          date: string;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          paid_by: string;
          created_by: string;
          title?: string | null;
          amount: number;
          description: string;
          category?: ExpenseCategory;
          date: string;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          amount?: number;
          description?: string;
          category?: ExpenseCategory;
          date?: string;
          receipt_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          amount: number;
          settled: boolean;
          settled_at: string | null;
          settled_by: string | null;
        };
        Insert: {
          id?: string;
          expense_id: string;
          user_id: string;
          amount: number;
          settled?: boolean;
          settled_at?: string | null;
          settled_by?: string | null;
        };
        Update: {
          amount?: number;
          settled?: boolean;
          settled_at?: string | null;
          settled_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_splits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          house_id: string | null;
          conversation_id: string | null;
          user_id: string;
          content: string;
          type: MessageType;
          has_attachments: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id?: string | null;
          conversation_id?: string | null;
          user_id: string;
          content: string;
          type?: MessageType;
          has_attachments?: boolean;
          created_at?: string;
        };
        Update: {
          content?: string;
          has_attachments?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "messages_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          house_id: string;
          participant_1: string;
          participant_2: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          participant_1: string;
          participant_2: string;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          last_message_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_participant_1_fkey";
            columns: ["participant_1"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_participant_2_fkey";
            columns: ["participant_2"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          media_type: MediaType;
          storage_path: string;
          public_url: string;
          thumbnail_url: string | null;
          file_name: string;
          file_size: number;
          mime_type: string;
          width: number | null;
          height: number | null;
          duration: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          media_type: MediaType;
          storage_path: string;
          public_url: string;
          thumbnail_url?: string | null;
          file_name: string;
          file_size: number;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          created_at?: string;
        };
        Update: {
          thumbnail_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_read_receipts: {
        Row: {
          id: string;
          user_id: string;
          house_id: string | null;
          conversation_id: string | null;
          last_read_at: string;
          last_read_message_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          house_id?: string | null;
          conversation_id?: string | null;
          last_read_at?: string;
          last_read_message_id?: string | null;
        };
        Update: {
          last_read_at?: string;
          last_read_message_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_read_receipts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_read_receipts_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_read_receipts_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_read_receipts_last_read_message_id_fkey";
            columns: ["last_read_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          }
        ];
      };
      bulletin_items: {
        Row: {
          id: string;
          house_id: string;
          category: BulletinCategory | null;
          title: string;
          content: string;
          color: string;
          style: BulletinStyle;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          category?: BulletinCategory | null;
          title: string;
          content: string;
          color?: string;
          style?: BulletinStyle;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: BulletinCategory | null;
          title?: string;
          content?: string;
          color?: string;
          style?: BulletinStyle;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bulletin_items_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulletin_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      b_roll_media: {
        Row: {
          id: string;
          house_id: string;
          uploaded_by: string;
          media_type: MediaType;
          storage_path: string;
          public_url: string;
          thumbnail_url: string | null;
          caption: string | null;
          file_name: string;
          file_size: number;
          mime_type: string;
          width: number | null;
          height: number | null;
          duration: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          uploaded_by: string;
          media_type: MediaType;
          storage_path: string;
          public_url: string;
          thumbnail_url?: string | null;
          caption?: string | null;
          file_name: string;
          file_size: number;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          caption?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "b_roll_media_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "b_roll_media_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      house_notes: {
        Row: {
          id: string;
          house_id: string;
          content: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          content?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "house_notes_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: true;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "house_notes_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          id: string;
          house_id: string;
          created_by: string;
          name: string;
          description: string | null;
          event_date: string;
          event_time: string | null;
          end_date: string | null;
          end_time: string | null;
          links: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          created_by: string;
          name: string;
          description?: string | null;
          event_date: string;
          event_time?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          links?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          event_date?: string;
          event_time?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          links?: string[] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          device_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          device_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          token?: string;
          platform?: "ios" | "android" | "web";
          device_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rooms: {
        Row: {
          id: string;
          house_id: string;
          name: string;
          room_type: RoomType;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          name: string;
          room_type?: RoomType;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          room_type?: RoomType;
          display_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          }
        ];
      };
      beds: {
        Row: {
          id: string;
          room_id: string;
          house_id: string;
          name: string;
          bed_type: BedType;
          is_premium: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          house_id: string;
          name: string;
          bed_type?: BedType;
          is_premium?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          bed_type?: BedType;
          is_premium?: boolean;
          display_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "beds_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "beds_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          }
        ];
      };
      signup_windows: {
        Row: {
          id: string;
          house_id: string;
          target_weekend_start: string;
          target_weekend_end: string;
          opens_at: string;
          closed_at: string | null;
          status: SignupWindowStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          house_id: string;
          target_weekend_start: string;
          target_weekend_end: string;
          opens_at: string;
          closed_at?: string | null;
          status?: SignupWindowStatus;
          created_at?: string;
        };
        Update: {
          target_weekend_start?: string;
          target_weekend_end?: string;
          opens_at?: string;
          closed_at?: string | null;
          status?: SignupWindowStatus;
        };
        Relationships: [
          {
            foreignKeyName: "signup_windows_house_id_fkey";
            columns: ["house_id"];
            isOneToOne: false;
            referencedRelation: "houses";
            referencedColumns: ["id"];
          }
        ];
      };
      bed_signups: {
        Row: {
          id: string;
          signup_window_id: string;
          bed_id: string;
          user_id: string;
          stay_id: string | null;
          claimed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          signup_window_id: string;
          bed_id: string;
          user_id: string;
          stay_id?: string | null;
          claimed_at?: string;
          created_at?: string;
        };
        Update: {
          stay_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bed_signups_signup_window_id_fkey";
            columns: ["signup_window_id"];
            isOneToOne: false;
            referencedRelation: "signup_windows";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bed_signups_bed_id_fkey";
            columns: ["bed_id"];
            isOneToOne: false;
            referencedRelation: "beds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bed_signups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bed_signups_stay_id_fkey";
            columns: ["stay_id"];
            isOneToOne: false;
            referencedRelation: "stays";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      member_role: MemberRole;
      invite_status: InviteStatus;
      expense_category: ExpenseCategory;
      message_type: MessageType;
      rider_type: RiderType;
      bulletin_category: BulletinCategory;
      media_type: MediaType;
      room_type: RoomType;
      bed_type: BedType;
      signup_window_status: SignupWindowStatus;
    };
    CompositeTypes: {};
  };
}

// Helper types for easier usage
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type House = Database["public"]["Tables"]["houses"]["Row"];
export type HouseMember = Database["public"]["Tables"]["house_members"]["Row"];
export type Stay = Database["public"]["Tables"]["stays"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseSplit = Database["public"]["Tables"]["expense_splits"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];

// Joined types for common queries
export type HouseMemberWithProfile = HouseMember & {
  profiles: Profile;
};

export type StayWithProfile = Stay & {
  profiles: Profile;
};

export type ExpenseWithPaidBy = Expense & {
  profiles: Profile;
};

export type MessageWithProfile = Message & {
  profiles: Profile;
};

// Stay with guest fees and expense info
export type StayWithGuestFees = Stay & {
  profiles: Profile;
  expenses: (Expense & {
    expense_splits: ExpenseSplit[];
  }) | null;
};

// User guest fee summary for account page
export type UserGuestFeeSummary = {
  totalStays: number;
  totalGuests: number;
  totalAmount: number;
  settledAmount: number;
  unsettledAmount: number;
};

// Bulletin board types
export type BulletinItem = Database["public"]["Tables"]["bulletin_items"]["Row"];

export type BulletinItemWithProfile = BulletinItem & {
  profiles: Profile;
};

// House note types (shared fridge note)
export type HouseNote = Database["public"]["Tables"]["house_notes"]["Row"];

export type HouseNoteWithEditor = HouseNote & {
  profiles: Profile | null;
};

// B-Roll media types
export type BRollMedia = Database["public"]["Tables"]["b_roll_media"]["Row"];

export type BRollMediaWithProfile = BRollMedia & {
  profiles: Profile;
};

export type BRollMediaGroupedByDay = {
  date: string;
  displayDate: string;
  items: BRollMediaWithProfile[];
};

// Resort types
export type Resort = Database["public"]["Tables"]["resorts"]["Row"];

export type HouseWithResort = House & {
  resorts: Resort | null;
};

// Open-Meteo API response types
export type OpenMeteoCurrentWeather = {
  temperature: number;
  apparent_temperature: number;
  precipitation: number;
  snowfall: number;
  wind_speed: number;
  wind_direction: number;
  wind_gusts: number;
  weather_code: number;
  cloud_cover: number;
  is_day: boolean;
  snow_depth: number;
  freezing_level: number;
  uv_index: number;
};

export type OpenMeteoHourlyForecast = {
  time: string[];
  temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  snowfall: number[];
  weather_code: number[];
};

export type OpenMeteoDailyForecast = {
  time: string[];
  temperature_max: number[];
  temperature_min: number[];
  precipitation_sum: number[];
  snowfall_sum: number[];
  precipitation_probability_max: number[];
  weather_code: number[];
  sunshine_duration: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
};

export type OpenMeteoWeatherData = {
  current: OpenMeteoCurrentWeather;
  hourly: OpenMeteoHourlyForecast;
  daily: OpenMeteoDailyForecast;
};

// Combined weather report for UI
export type WeatherReport = {
  resort: Resort;
  weather: OpenMeteoWeatherData;
  fetchedAt: string;
};

// Expense system types
export type ExpenseWithDetails = Expense & {
  paid_by_profile: Profile;
  created_by_profile: Profile | null;
  expense_splits: (ExpenseSplit & {
    profiles: Profile;
  })[];
};

export type UserBalance = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  venmoHandle: string | null;
  owes: number;
  owed: number;
  netBalance: number;
};

export type ExpenseSummary = {
  totalYouOwe: number;
  totalYouAreOwed: number;
  netBalance: number;
};

export type ExpenseBalanceData = {
  balances: UserBalance[];
  summary: ExpenseSummary;
};

export type BalanceBreakdownItem = {
  expenseId: string;
  splitId: string;
  title: string;
  description: string | null;
  category: ExpenseCategory;
  date: string;
  splitAmount: number;
  totalExpenseAmount: number;
  paidByName: string;
  paidById: string;
  receiptUrl: string | null;
  settled: boolean;
  settledAt: string | null;
  settledByName: string | null;
};

export type BalanceBreakdown = {
  otherUser: {
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
    venmoHandle: string | null;
  };
  theyOweYou: BalanceBreakdownItem[];
  youOweThem: BalanceBreakdownItem[];
  totalTheyOwe: number;
  totalYouOwe: number;
  netBalance: number;
};

// Event types
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventParticipant = Database["public"]["Tables"]["event_participants"]["Row"];

// Push notification types
export type PushToken = Database["public"]["Tables"]["push_tokens"]["Row"];

export type EventWithCreator = Event & {
  profiles: Profile;
};

export type EventWithParticipants = Event & {
  profiles: Profile;
  event_participants: (EventParticipant & {
    profiles: Profile;
  })[];
};

// ============================================
// Chat Types
// ============================================

// Media type for chat attachments
export type ChatMediaType = "image" | "video";

// Conversation for direct messages
export type Conversation = {
  id: string;
  house_id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
};

// Conversation with participant profiles
export type ConversationWithProfiles = Conversation & {
  participant_1_profile: Profile;
  participant_2_profile: Profile;
};

// Conversation with latest message preview (for list display)
export type ConversationWithLatest = ConversationWithProfiles & {
  latest_message?: {
    content: string;
    created_at: string;
    user_id: string;
  };
  unread_count: number;
};

// Message attachment
export type MessageAttachment = {
  id: string;
  message_id: string;
  media_type: ChatMediaType;
  storage_path: string;
  public_url: string;
  thumbnail_url: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration: number | null; // seconds, for videos
  created_at: string;
};

// Extended message type with optional conversation_id and attachments flag
export type ChatMessage = {
  id: string;
  house_id: string | null; // null for DMs
  conversation_id: string | null; // null for house chat
  user_id: string;
  content: string;
  type: MessageType;
  has_attachments: boolean;
  created_at: string;
};

// Chat message with profile
export type ChatMessageWithProfile = ChatMessage & {
  profiles: Profile;
};

// Chat message with profile and attachments
export type ChatMessageWithAttachments = ChatMessageWithProfile & {
  message_attachments: MessageAttachment[];
};

// Read receipt for tracking unread messages
export type ChatReadReceipt = {
  id: string;
  user_id: string;
  house_id: string | null; // for house chat
  conversation_id: string | null; // for DMs
  last_read_at: string;
  last_read_message_id: string | null;
};

// Unread counts summary
export type ChatUnreadCounts = {
  house_chat: number;
  direct_messages: Record<string, number>; // conversation_id -> count
  total: number;
};

// ============================================
// Bed Sign-Up Types
// ============================================

// Base types from database
export type Room = Database["public"]["Tables"]["rooms"]["Row"];
export type Bed = Database["public"]["Tables"]["beds"]["Row"];
export type SignupWindow = Database["public"]["Tables"]["signup_windows"]["Row"];
export type BedSignup = Database["public"]["Tables"]["bed_signups"]["Row"];

// Room with its beds
export type RoomWithBeds = Room & {
  beds: Bed[];
};

// Bed with room info
export type BedWithRoom = Bed & {
  rooms: Room;
};

// Signup window with house info
export type SignupWindowWithHouse = SignupWindow & {
  houses: House;
};

// Bed signup with profile (who claimed)
export type BedSignupWithProfile = BedSignup & {
  profiles: Profile;
};

// Bed signup with all related info
export type BedSignupWithDetails = BedSignup & {
  profiles: Profile;
  beds: Bed & {
    rooms: Room;
  };
};

// Bed with current signup status (for display)
export type BedWithSignupStatus = Bed & {
  rooms: Room;
  bed_signups?: (BedSignup & {
    profiles: Profile;
  })[];
};

// Full room configuration for admin view
export type RoomConfiguration = Room & {
  beds: Bed[];
};

// Signup window with all bed claims for display
export type SignupWindowWithClaims = SignupWindow & {
  bed_signups: (BedSignup & {
    profiles: Profile;
    beds: Bed & {
      rooms: Room;
    };
  })[];
};

// Bed signup history entry for admin log
export type BedSignupHistoryEntry = {
  signupWindow: SignupWindow;
  claims: (BedSignup & {
    profiles: Profile;
    beds: Bed & {
      rooms: Room;
    };
  })[];
};
