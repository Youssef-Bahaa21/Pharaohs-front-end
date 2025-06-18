import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, map, of } from 'rxjs';
import { Comment, Video } from '../../models/models';
import { PlayerService } from '../player/player.service';
import { AdminService } from '../admin/admin.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environments';

@Injectable({
    providedIn: 'root'
})
export class InteractionService {
    private http = inject(HttpClient);
    private playerService = inject(PlayerService);
    private adminService = inject(AdminService);
    private authService = inject(AuthService);

    // State
    private commentsSubject = new BehaviorSubject<Record<string, Comment[]>>({});
    private likesSubject = new BehaviorSubject<Record<string, { likeCount: number; likedByUser: boolean; loading: boolean }>>({});
    private newCommentsSubject = new BehaviorSubject<Record<string, string>>({});
    private isDeletingCommentSubject = new BehaviorSubject<Record<string, boolean>>({});
    private isDeletingPostSubject = new BehaviorSubject<Record<string, boolean>>({});

    // Public observables
    public comments$ = this.commentsSubject.asObservable();
    public likes$ = this.likesSubject.asObservable();
    public newComments$ = this.newCommentsSubject.asObservable();
    public isDeletingComment$ = this.isDeletingCommentSubject.asObservable();
    public isDeletingPost$ = this.isDeletingPostSubject.asObservable();

    constructor() { }

    // Initialize comments for all videos
    public initializeComments(videos: Video[]): void {
        const newComments = { ...this.newCommentsSubject.getValue() };

        videos.forEach(video => {
            if (!newComments[video.id]) {
                newComments[video.id] = '';
            }
        });

        this.newCommentsSubject.next(newComments);
    }

    // Load comments and likes for videos
    public loadCommentsAndLikes(videos: Video[]): void {
        if (videos.length === 0) return;

        const videoIds = videos.map(video => video.id);
        const likes = { ...this.likesSubject.getValue() };

        // Initialize likes state for all videos
        videoIds.forEach(videoId => {
            if (!likes[videoId]) {
                likes[videoId] = { likeCount: 0, likedByUser: false, loading: false };
            } else {
                likes[videoId].loading = false;
            }
        });

        this.likesSubject.next(likes);

        // Load likes from API if not admin
        if (this.authService.getCurrentUser()?.role !== 'admin') {
            this.playerService.getVideoLikes().subscribe({
                next: (apiLikes) => {
                    const updatedLikes = { ...this.likesSubject.getValue() };

                    apiLikes.forEach(like => {
                        const videoId = like.video_id.toString();
                        updatedLikes[videoId] = {
                            likeCount: like.likeCount || 0,
                            likedByUser: like.likedByUser === 1,
                            loading: false
                        };
                    });

                    // Set default values for videos without likes
                    videoIds.forEach(videoId => {
                        if (!apiLikes.some(like => like.video_id.toString() === videoId.toString())) {
                            updatedLikes[videoId] = {
                                likeCount: 0,
                                likedByUser: false,
                                loading: false
                            };
                        }
                    });

                    this.likesSubject.next(updatedLikes);
                }
            });
        }

        // Load comments for all videos
        const comments = { ...this.commentsSubject.getValue() };

        videos.forEach(video => {
            this.playerService.getComments(video.id).subscribe({
                next: (videoComments) => {
                    comments[video.id] = videoComments;
                    this.commentsSubject.next({ ...comments });
                }
            });
        });
    }

    // Toggle like status for a video
    public toggleLike(videoId: string): Observable<any> {
        const userRole = this.authService.getCurrentUser()?.role;

        if (userRole === 'admin') {
            return of({ success: false, message: 'Admin users cannot like posts' });
        }

        const likes = { ...this.likesSubject.getValue() };

        if (!likes[videoId]) {
            likes[videoId] = { likeCount: 0, likedByUser: false, loading: false };
        }

        if (likes[videoId].loading) {
            return of({ success: false, message: 'Like action already in progress' });
        }

        // Optimistically update UI
        const isLiked = likes[videoId].likedByUser;
        const newLikeCount = isLiked ? Math.max(0, likes[videoId].likeCount - 1) : likes[videoId].likeCount + 1;

        likes[videoId] = {
            likeCount: newLikeCount,
            likedByUser: !isLiked,
            loading: true
        };

        this.likesSubject.next(likes);

        // Make API call
        const action = isLiked ?
            this.playerService.unlikeVideo(videoId) :
            this.playerService.likeVideo(videoId);

        return action.pipe(
            map(response => {
                const updatedLikes = { ...this.likesSubject.getValue() };

                if (response.likeCount !== undefined) {
                    updatedLikes[videoId] = {
                        likeCount: response.likeCount,
                        likedByUser: !isLiked,
                        loading: false
                    };
                    this.likesSubject.next(updatedLikes);
                } else {
                    this.refreshLikes(videoId);
                }

                return { success: true, liked: !isLiked };
            })
        );
    }

    // Refresh likes data for a specific video
    private refreshLikes(videoId: string): void {
        const userRole = this.authService.getCurrentUser()?.role;

        if (userRole === 'admin') {
            const likes = { ...this.likesSubject.getValue() };
            if (likes[videoId]) {
                likes[videoId].loading = false;
                this.likesSubject.next(likes);
            }
            return;
        }

        this.playerService.getVideoLikes().subscribe({
            next: (apiLikes) => {
                const likes = { ...this.likesSubject.getValue() };
                const videoLike = apiLikes.find(like => like.video_id === videoId);

                if (videoLike) {
                    likes[videoId] = {
                        likeCount: videoLike.likeCount || 0,
                        likedByUser: videoLike.likedByUser === 1,
                        loading: false
                    };
                } else {
                    likes[videoId] = {
                        likeCount: 0,
                        likedByUser: false,
                        loading: false
                    };
                }

                this.likesSubject.next(likes);
            }
        });
    }

    // Add comment to a video
    public addComment(videoId: string, comment: string): Observable<any> {
        const userRole = this.authService.getCurrentUser()?.role;

        if (userRole !== 'player') {
            return of({ success: false, message: 'Only players can post comments' });
        }

        if (!comment || !comment.trim()) {
            return of({ success: false, message: 'Comment cannot be empty' });
        }

        return this.playerService.addComment(videoId, comment.trim()).pipe(
            map(() => {
                // Update newComments state
                const newComments = { ...this.newCommentsSubject.getValue() };
                newComments[videoId] = '';
                this.newCommentsSubject.next(newComments);

                // Refresh comments for this video
                this.playerService.getComments(videoId).subscribe({
                    next: (comments) => {
                        const allComments = { ...this.commentsSubject.getValue() };
                        allComments[videoId] = comments;
                        this.commentsSubject.next(allComments);
                    }
                });

                return { success: true, message: 'Comment posted successfully' };
            })
        );
    }

    // Update comment field
    public updateCommentField(videoId: string, text: string): void {
        const newComments = { ...this.newCommentsSubject.getValue() };
        newComments[videoId] = text;
        this.newCommentsSubject.next(newComments);
    }

    // Delete comment
    public deleteComment(videoId: string, commentId: number): Observable<any> {
        const isDeletingComment = { ...this.isDeletingCommentSubject.getValue() };
        isDeletingComment[commentId] = true;
        this.isDeletingCommentSubject.next(isDeletingComment);

        const userRole = this.authService.getCurrentUser()?.role;
        const deleteMethod = userRole === 'admin' ?
            this.adminService.deleteComment(commentId) :
            this.playerService.deleteComment(commentId);

        return deleteMethod.pipe(
            map(() => {
                // Update comments and isDeletingComment state
                const allComments = { ...this.commentsSubject.getValue() };

                if (allComments[videoId]) {
                    allComments[videoId] = allComments[videoId].filter(c => c.id !== commentId);
                    this.commentsSubject.next(allComments);
                }

                isDeletingComment[commentId] = false;
                this.isDeletingCommentSubject.next(isDeletingComment);

                return { success: true, message: 'Comment deleted successfully' };
            })
        );
    }

    // Delete a post
    public deletePost(postId: string): Observable<any> {
        const isDeletingPost = { ...this.isDeletingPostSubject.getValue() };
        isDeletingPost[postId] = true;
        this.isDeletingPostSubject.next(isDeletingPost);

        const userRole = this.authService.getCurrentUser()?.role;
        const service = userRole === 'admin' ? this.adminService : this.playerService;

        return service.deleteVideo(postId).pipe(
            map(() => {
                isDeletingPost[postId] = false;
                this.isDeletingPostSubject.next(isDeletingPost);
                return { success: true, postId };
            })
        );
    }

    // Is current user the owner of a comment
    public isCurrentUserComment(comment: Comment): boolean {
        if (!comment) return false;

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) return false;

        const commentUserId = comment.player_id?.toString();
        const currentUserId = currentUser.id.toString();

        return commentUserId === currentUserId || currentUser.role === 'admin';
    }

    // Is current user the owner of a post
    public isCurrentUserPost(playerId: string | number): boolean {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) return false;

        return currentUser.id.toString() === playerId.toString() ||
            currentUser.role === 'admin';
    }
} 