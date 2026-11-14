import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ArticleListConfig } from '../models/article-list-config.model';
import { Article } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  constructor(private readonly http: HttpClient) {}

  /** Lists articles for the global feed, a tag or an author, or the personal feed when the config type is feed. */
  query(config: ArticleListConfig): Observable<{ articles: Article[]; articlesCount: number }> {
    // Convert any filters over to Angular's URLSearchParams
    let params = new HttpParams();

    Object.keys(config.filters).forEach(key => {
      // @ts-ignore
      params = params.set(key, config.filters[key]);
    });

    return this.http.get<{ articles: Article[]; articlesCount: number }>(
      '/articles' + (config.type === 'feed' ? '/feed' : ''),
      { params },
    );
  }

  /** Loads one article by its slug. */
  get(slug: string): Observable<Article> {
    return this.http.get<{ article: Article }>(`/articles/${slug}`).pipe(map(data => data.article));
  }

  /** Deletes an article; only its author may call this. */
  delete(slug: string): Observable<void> {
    return this.http.delete<void>(`/articles/${slug}`);
  }

  /** Publishes a new article and returns it with its slug. */
  create(article: Partial<Article>): Observable<Article> {
    return this.http.post<{ article: Article }>('/articles', { article: article }).pipe(map(data => data.article));
  }

  /** Saves changes to an existing article; a changed title changes the slug. */
  update(article: Partial<Article>): Observable<Article> {
    return this.http
      .put<{ article: Article }>(`/articles/${article.slug}`, {
        article: article,
      })
      .pipe(map(data => data.article));
  }

  /** Adds the article to the current user's favourites. */
  favorite(slug: string): Observable<Article> {
    return this.http.post<{ article: Article }>(`/articles/${slug}/favorite`, {}).pipe(map(data => data.article));
  }

  /** Removes the article from the current user's favourites. */
  unfavorite(slug: string): Observable<void> {
    return this.http.delete<void>(`/articles/${slug}/favorite`);
  }
}
