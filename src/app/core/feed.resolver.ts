import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PlayerProfile } from './models/models';
import { PlayerService } from './services/player/player.service';

export interface FeedData {
    players: PlayerProfile[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

@Injectable({ providedIn: 'root' })
export class FeedResolver implements Resolve<FeedData> {
    constructor(private playerService: PlayerService) { }

    resolve(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<FeedData> {
        return this.playerService.getAllPlayers().pipe(
            catchError(() => of({
                players: [],
                pagination: {
                    total: 0,
                    page: 1,
                    limit: 20,
                    totalPages: 0
                }
            }))
        );
    }
}