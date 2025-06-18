// Authentication related interfaces
export interface AuthResponse {
    token: string;
    user: User;
}

// Invitation system interfaces
export interface Invitation {
    invitation_id: number;
    tryout_name: string;
    scout_name: string;
    scout_email: string;
    id: string;
    playerId: string;
    scoutId: string | null;
    scoutName?: string;
    scoutProfileImage?: string | null;
    message?: string;
    location: string;
    date: string;
    status: 'pending' | 'accepted' | 'declined';
    tryout_id?: number | string;
    tryoutId?: number | string;
    player_id?: number | string;
    player_name?: string;
    playerName?: string;
    created_at?: string;
    createdAt?: string;
    tryoutName?: string;
    scout_id?: number | string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

// Player statistics tracking
export interface PlayerStats {
    matches_played: number;
    goals: number;
    assists: number;
    yellow_cards: number;
    red_cards: number;
}

// Player profile information
export interface PlayerProfile {
    id: number;
    name: string;
    email: string;
    role: 'player';
    profileImage?: string | null;
    date_of_birth?: string;
    rating?: number;
    position?: string;
    user_id?: number;
    age?: number;
    club?: string;
    bio?: string;
    invitations?: Invitation[];
    videos?: Video[];
    createdAt?: string;
    stats?: PlayerStats;
    performanceStats?: PlayerStats;
    videoCount?: number;
    isShortlisted?: boolean;
    hasStats?: boolean;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
    date_of_birth?: string;
}

// Video comment system
export interface Comment {
    id: number;
    player_id: number;
    video_id: string;
    text: string;
    created_at: string;
    commenter_name?: string;
}

// Scout profile information
export interface ScoutProfile {
    id: number;
    name: string;
    email: string;
    role: 'scout';
    organization?: string;
    phone?: string;
    profileImage?: string | null;
    createdAt?: string;
    shortlists: PlayerProfile[];
    tryoutCount?: number;
    invitationCount?: number;
}

// Tryout event information
export interface Tryout {
    id: string;
    name: string;
    location: string;
    date: string;
    time: string;
    playersInvited: number[];
}

// User account information
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'player' | 'scout' | 'admin';
    status?: 'active' | 'inactive' | 'suspended';
    createdAt?: string;
    created_at?: string;
}

// Video and media content
export interface Video {
    id: string;
    url: string;
    type: 'video' | 'image';
    description?: string;
    playerId: string;
    createdAt: string;
    created_at?: string;
    player_name?: string;
    status?: 'pending' | 'approved' | 'rejected';
}

// Player search filter parameters
export interface SearchFilters {
    name?: string;
    position?: string;
    club?: string;
    minAge?: number;
    maxAge?: number;
    hasVideos?: boolean;
    minRating?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

// Paginated player search results
export interface SearchResponse {
    players: PlayerProfile[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

// Available filter option values
export interface FilterOptions {
    positions: string[];
    clubs: string[];
    ageRange: {
        minAge: number;
        maxAge: number;
    };
}

// Media content structure
export interface MediaItem {
    id: string;
    url: string;
    type: 'video' | 'image';
    description?: string;
    playerId: string;
    createdAt: string;
    player_name?: string;
}

// User dashboard data structure
export interface DashboardData {
    role: 'player' | 'scout' | 'admin';
    data: {
        name?: string;
        mediaCount?: number;
        pendingInvitations?: number;
        recentMedia?: MediaItem[];
        tryoutCount?: number;
        invitationCount?: number;
        recentTryouts?: { name: string; location: string; date: string }[];
        totalUsers?: number;
        userBreakdown?: { userCount: number; role: string }[];
        totalMedia?: number;
    };
}

// Notification data model
export interface Notification {
    id: number;
    message: string;
    is_read: boolean;
    created_at: string;
}

// API response format for notifications
export interface NotificationResponse {
    notifications: Notification[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    unreadCount: number;
}