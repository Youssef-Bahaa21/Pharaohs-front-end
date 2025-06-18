import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PlayerProfile, Comment, Video } from '../../../core/models/models';
import { DateFormatUtil } from '../../../core/utils/date-format.util';
import { VideoPlayerComponent } from '../../components/video-player/video-player.component';

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFormatUtil, VideoPlayerComponent],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.css'
})
export class PlayerCardComponent {
  // Player and post data
  @Input() post!: Video;
  @Input() player?: PlayerProfile;
  @Input() userRole: string = '';
  @Input() currentUserId: string = '';
  @Input() currentUserProfileImage: string | null = null;

  // Comments and likes
  @Input() comments: Comment[] = [];
  @Input() likes: { likeCount: number; likedByUser: boolean; loading: boolean } = { likeCount: 0, likedByUser: false, loading: false };
  @Input() newComment: string = '';
  @Input() isDeletingComment: Record<string, boolean> = {};
  @Input() isDeletingPost: Record<string, boolean> = {};

  // Shortlist and invitation states
  @Input() shortlistedPlayers = new Set<number>();
  @Input() invitedPlayers = new Set<number>();
  @Input() addingToShortlist = new Set<number>();
  @Input() removingFromShortlist = new Set<number>();
  @Input() actionMessages: { [key: string]: { message: string, isError: boolean, timestamp: number } } = {};

  // Events
  @Output() goToProfile = new EventEmitter<number>();
  @Output() likeClicked = new EventEmitter<string>();
  @Output() commentSubmit = new EventEmitter<{ videoId: string, comment: string }>();
  @Output() commentDelete = new EventEmitter<{ videoId: string, commentId: number }>();
  @Output() openUpdate = new EventEmitter<Video>();
  @Output() deletePostEvent = new EventEmitter<string>();
  @Output() shortlistAdd = new EventEmitter<number>();
  @Output() shortlistRemove = new EventEmitter<number>();
  @Output() inviteToTryout = new EventEmitter<number>();
  @Output() mediaError = new EventEmitter<{ event: Event, url: string }>();
  @Output() commentProfileClick = new EventEmitter<Comment>();

  constructor(private sanitizer: DomSanitizer) { }

  // Utility methods
  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  isCurrentUserPost(playerId: string | number): boolean {
    // Return true if the user is the owner or an admin
    return playerId.toString() === this.currentUserId || this.userRole === 'admin';
  }

  isCurrentUserComment(comment: Comment): boolean {
    // Return true if the user is the comment owner or an admin
    return comment?.player_id?.toString() === this.currentUserId || this.userRole === 'admin';
  }

  getActionMessage(playerId: number | undefined): { message: string, isError: boolean, timestamp: number } | undefined {
    if (!playerId) return undefined;
    return this.actionMessages[playerId.toString()];
  }

  isShortlisted(playerId: string): boolean {
    return this.shortlistedPlayers.has(parseInt(playerId));
  }

  isAddingToShortlist(playerId: string): boolean {
    return this.addingToShortlist.has(parseInt(playerId));
  }

  isRemovingFromShortlist(playerId: string): boolean {
    return this.removingFromShortlist.has(parseInt(playerId));
  }

  // Action methods
  onGoToProfile(playerId: number | string): void {
    this.goToProfile.emit(typeof playerId === 'string' ? parseInt(playerId) : playerId);
  }

  onLikeClicked(videoId: string): void {
    this.likeClicked.emit(videoId);
  }

  onCommentSubmit(videoId: string): void {
    if (this.newComment && this.newComment.trim()) {
      this.commentSubmit.emit({ videoId, comment: this.newComment });
      this.newComment = '';
    }
  }

  onCommentDelete(videoId: string, commentId: number): void {
    this.commentDelete.emit({ videoId, commentId });
  }

  onOpenUpdate(post: Video): void {
    this.openUpdate.emit(post);
  }

  onDeletePost(postId: string): void {
    this.deletePostEvent.emit(postId);
  }

  onShortlistAdd(playerId: number): void {
    this.shortlistAdd.emit(playerId);
  }

  onShortlistRemove(playerId: number): void {
    this.shortlistRemove.emit(playerId);
  }

  onInviteToTryout(playerId: number): void {
    this.inviteToTryout.emit(playerId);
  }

  onMediaError(event: Event, url: string): void {
    this.mediaError.emit({ event, url });
  }

  onCommenterProfileClick(comment: Comment): void {
    this.commentProfileClick.emit(comment);
  }
}
