import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Board } from '../models/board.model';

@Injectable({ providedIn: 'root' })
export class BoardService {
  private apiUrl = `${environment.apiUrl}/boards`;

  constructor(private http: HttpClient) {}

  // Each method maps to a backend endpoint you built in Phase 2
  create(name: string, description?: string): Observable<Board> {
    return this.http.post<Board>(this.apiUrl, { name, description });
  }

  getAll(): Observable<Board[]> {
    return this.http.get<Board[]>(this.apiUrl);
  }

  getById(id: string): Observable<Board> {
    return this.http.get<Board>(`${this.apiUrl}/${id}`);
  }

  joinByInviteCode(inviteCode: string): Observable<Board> {
    return this.http.post<Board>(`${this.apiUrl}/join/${inviteCode}`, {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}